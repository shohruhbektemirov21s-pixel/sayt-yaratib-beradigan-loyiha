import logging
import time
from collections import deque
from threading import Lock
from typing import Dict, Optional

from django.http import HttpResponse
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.models import SITE_CREATION_COST, tokens_to_nano_coins
from apps.ai_generation.services import AIRouterService, ArchitectService, ClaudeService
from apps.exports.services import ExportService

# ── TEST REJIMI ───────────────────────────────────────────────
# True bo'lsa — token balans tekshirilmaydi (cheklovsiz test).
# Production uchun False qiling.
TOKEN_LIMITS_DISABLED = True


def _estimate_complexity(schema: Dict) -> Dict:
    """Sayt murakkabligini hisoblaydi."""
    pages = schema.get("pages", [])
    section_count = sum(len(p.get("sections", [])) for p in pages)
    page_count = len(pages)

    if section_count <= 3 and page_count <= 1:
        level = "oddiy"
        label_uz = "Oddiy"
        color = "green"
    elif section_count <= 6 and page_count <= 2:
        level = "o'rta"
        label_uz = "O'rta"
        color = "yellow"
    else:
        level = "murakkab"
        label_uz = "Murakkab"
        color = "red"

    return {
        "level": level,
        "label": label_uz,
        "color": color,
        "sections": section_count,
        "pages": page_count,
    }

from django.db.models import F

from .models import ChatMessage, ChatRole, Conversation, ProjectStatus, ProjectVersion, WebsiteProject
from .serializers import WebsiteProjectSerializer

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────
# Chat tarixi helperlari
# ─────────────────────────────────────────────────────────────

def _get_or_create_conversation(
    user,
    conversation_id: Optional[str],
    language: str,
    first_prompt: str,
) -> Optional[Conversation]:
    """Mavjud suhbatni topadi yoki yangisini yaratadi. Anonymous user uchun None qaytaradi."""
    if not user or not user.is_authenticated:
        return None
    if conversation_id:
        try:
            return Conversation.objects.get(id=conversation_id, user=user)
        except Conversation.DoesNotExist:
            pass
    # Yangi suhbat — sarlavha birinchi promptdan kesilgan qismi
    title = first_prompt.strip().replace("\n", " ")[:80] or "Yangi suhbat"
    return Conversation.objects.create(user=user, language=language, title=title)


def _save_message(
    conversation: Optional[Conversation],
    role: str,
    content: str,
    intent: str = "",
    metadata: Optional[dict] = None,
    tokens_input: int = 0,
    tokens_output: int = 0,
    duration_ms: int = 0,
    project_version: Optional[ProjectVersion] = None,
) -> Optional[ChatMessage]:
    """Bitta xabarni DB'ga yozadi va suhbatning agregat hisoblarini yangilaydi."""
    if conversation is None or not content:
        return None
    msg = ChatMessage.objects.create(
        conversation=conversation,
        role=role,
        content=content[:10000],  # juda uzun xabarlarni cheklaymiz
        intent=intent,
        metadata=metadata,
        tokens_input=tokens_input,
        tokens_output=tokens_output,
        duration_ms=duration_ms,
        project_version=project_version,
    )
    # Agregatlarni atomik yangilaymiz
    Conversation.objects.filter(id=conversation.id).update(
        total_messages=F("total_messages") + 1,
        total_tokens_input=F("total_tokens_input") + tokens_input,
        total_tokens_output=F("total_tokens_output") + tokens_output,
    )
    return msg


class _IpRateLimiter:
    def __init__(self, max_requests: int, window_seconds: int) -> None:
        self.max_requests = max_requests
        self.window = window_seconds
        self._hits: dict[str, deque] = {}
        self._lock = Lock()

    def allow(self, key: str) -> bool:
        now = time.monotonic()
        with self._lock:
            hits = self._hits.setdefault(key, deque())
            while hits and now - hits[0] > self.window:
                hits.popleft()
            if len(hits) >= self.max_requests:
                return False
            hits.append(now)
            return True


_ai_rate_limiter = _IpRateLimiter(max_requests=30, window_seconds=60)


def _get_client_ip(request) -> str:
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "unknown")


class WebsiteProjectViewSet(viewsets.ModelViewSet):
    serializer_class = WebsiteProjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return WebsiteProject.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["post"], permission_classes=[permissions.AllowAny])
    def process_prompt(self, request):
        """
        Arxitektor oqimi:
          1. Foydalanuvchi bilan muloqot (ArchitectService)
          2. FINAL_SITE_SPEC tayyor bo'lganda ClaudeService sayt generatsiya qiladi
          3. Mavjud loyiha bo'lsa — revise rejimi
        """
        prompt = (request.data.get("prompt") or "").strip()
        project_id = request.data.get("project_id")
        conversation_id = request.data.get("conversation_id")
        language = request.data.get("language", "uz")
        # Frontend arxitektor suhbat tarixini yuboradi
        history: list = request.data.get("history", [])

        if not prompt:
            return Response(
                {"success": False, "error": "Prompt kutilmoqda."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Rate limit
        is_auth = request.user.is_authenticated
        rl_key = str(request.user.id) if is_auth else f"ip:{_get_client_ip(request)}"
        if not _ai_rate_limiter.allow(rl_key):
            return Response(
                {"success": False, "error": "Juda ko'p so'rov. Bir daqiqadan keyin urinib ko'ring."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        # Prompt xavfsizligi: hajmini cheklash
        if len(prompt) > 8000:
            return Response(
                {"success": False, "error": "Prompt juda uzun (max 8000 belgi)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # History hajmini cheklash (injection oldini olish)
        if len(history) > 40:
            history = history[-40:]
        # History strukturasini tekshirish
        safe_history = []
        for item in history:
            if isinstance(item, dict) and item.get("role") in ("user", "assistant"):
                content = str(item.get("content", ""))[:4000]
                safe_history.append({"role": item["role"], "content": content})
        history = safe_history

        intent = AIRouterService.detect_intent(prompt, has_project=bool(project_id))
        logger.info("AI request user=%s intent=%s project=%s",
                    getattr(request.user, "id", "guest"), intent, project_id)

        # ── Suhbatni topamiz yoki yaratamiz, user xabarini saqlaymiz ──
        conversation = _get_or_create_conversation(
            request.user, conversation_id, language, prompt,
        )
        _save_message(conversation, ChatRole.USER, prompt, intent=intent)

        # Agar intent generatsiya bo'lsa (yangi sayt yoki REVISE) — balansni tekshiramiz.
        # CHAT va ARCHITECT muloqot bosqichi bepul bo'ladi (faqat gaplashish).
        # ARCHITECT keyinchalik FINAL_SITE_SPEC yig'ib Claude generatsiyaga o'tganda
        # ichkarida yana tekshiriladi (quyidagi blokda).
        if is_auth and intent == "REVISE" and not TOKEN_LIMITS_DISABLED:
            if not request.user.can_afford(SITE_CREATION_COST):
                return Response({
                    "success": False,
                    "error": f"Token yetarli emas. Sayt tahrirlash uchun {SITE_CREATION_COST} token kerak, sizda {request.user.tokens_balance} ta bor.",
                    "insufficient_tokens": True,
                    "required_tokens": SITE_CREATION_COST,
                    "current_tokens": request.user.tokens_balance,
                }, status=status.HTTP_402_PAYMENT_REQUIRED)

        try:
            # ── 1. MAVJUD LOYIHANI TAHRIRLASH ───────────────────────────
            if project_id and is_auth and intent == "REVISE":
                try:
                    project = WebsiteProject.objects.get(id=project_id, user=request.user)
                except WebsiteProject.DoesNotExist:
                    return Response(
                        {"success": False, "error": "Loyiha topilmadi."},
                        status=status.HTTP_404_NOT_FOUND,
                    )
                gen_start = time.monotonic()
                claude = ClaudeService()
                new_schema = claude.revise_site(prompt, project.schema_data or {}, language)
                gen_ms = int((time.monotonic() - gen_start) * 1000)
                project.schema_data = new_schema
                project.status = ProjectStatus.COMPLETED
                project.save(update_fields=["schema_data", "status", "updated_at"])
                version = ProjectVersion.objects.create(
                    project=project, prompt=prompt, schema_data=new_schema,
                    intent="revise", version_number=project.versions.count() + 1,
                )
                # Suhbatni loyihaga bog'laymiz va AI xabarini saqlaymiz
                if conversation and not conversation.project_id:
                    Conversation.objects.filter(id=conversation.id).update(project=project)
                _save_message(
                    conversation, ChatRole.ASSISTANT,
                    f"✅ Sayt yangilandi: «{project.title}»",
                    intent="REVISE",
                    duration_ms=gen_ms,
                    project_version=version,
                    metadata={"project_id": str(project.id), "title": project.title},
                )
                # Token yechamiz — atomik (test rejimida o'tkazib yuboriladi)
                if not TOKEN_LIMITS_DISABLED:
                    try:
                        request.user.deduct_tokens(SITE_CREATION_COST)
                    except ValueError:
                        return Response({
                            "success": False,
                            "error": "Token balans yetarli emas.",
                            "insufficient_tokens": True,
                        }, status=status.HTTP_402_PAYMENT_REQUIRED)

                return Response({
                    "success": True,
                    "phase": "DONE",
                    "is_chat": False,
                    "project": WebsiteProjectSerializer(project).data,
                    "message": f"✅ Sayt yangilandi: «{project.title}»",
                    "conversation_id": str(conversation.id) if conversation else None,
                    "balance": {
                        "tokens": request.user.tokens_balance,
                        "nano_coins": request.user.nano_coins,
                        "cost": SITE_CREATION_COST,
                    },
                })

            # ── 2. GEMINI ARXITEKTOR SUHBAT ──────────────────────────────
            if intent in ("ARCHITECT", "CHAT"):
                architect = ArchitectService()
                # Gemini: (ai_text, spec_or_None, design_variants_or_None)
                ai_text, spec, design_variants = architect.chat(prompt, history)

                if spec:
                    # FINAL_SITE_SPEC topildi → Claude sayt generatsiya qiladi
                    # Generatsiyadan oldin balansni tekshiramiz (auth user uchun)
                    if is_auth and not TOKEN_LIMITS_DISABLED and not request.user.can_afford(SITE_CREATION_COST):
                        return Response({
                            "success": False,
                            "error": f"Token yetarli emas. Sayt yaratish uchun {SITE_CREATION_COST} token ({tokens_to_nano_coins(SITE_CREATION_COST)} nano koin) kerak. Sizda {request.user.tokens_balance} token ({request.user.nano_coins} nano koin) bor.",
                            "insufficient_tokens": True,
                            "required_tokens": SITE_CREATION_COST,
                            "current_tokens": request.user.tokens_balance,
                        }, status=status.HTTP_402_PAYMENT_REQUIRED)

                    logger.info("FINAL_SITE_SPEC aniqlandi, Claude generatsiya boshlandi")
                    gen_start = time.monotonic()
                    claude = ClaudeService()
                    new_schema, usage = claude.generate_from_spec(spec)
                    gen_ms = int((time.monotonic() - gen_start) * 1000)
                    complexity = _estimate_complexity(new_schema)

                    balance_data: Optional[dict] = None
                    if is_auth:
                        project = WebsiteProject.objects.create(
                            user=request.user,
                            title=new_schema.get("siteName", "AI Site"),
                            prompt=prompt,
                            language=language,
                            schema_data=new_schema,
                            status=ProjectStatus.COMPLETED,
                        )
                        version = ProjectVersion.objects.create(
                            project=project, prompt=spec, schema_data=new_schema,
                            intent="generate", version_number=1,
                        )
                        # Suhbatni bu loyihaga bog'laymiz + AI javobini saqlaymiz
                        if conversation:
                            Conversation.objects.filter(id=conversation.id).update(project=project)
                            _save_message(
                                conversation, ChatRole.ASSISTANT,
                                f"✅ Sayt tayyor: «{project.title}»",
                                intent="GENERATE",
                                tokens_input=usage.get("input_tokens", 0),
                                tokens_output=usage.get("output_tokens", 0),
                                duration_ms=gen_ms,
                                project_version=version,
                                metadata={
                                    "project_id": str(project.id),
                                    "title": project.title,
                                    "complexity": complexity,
                                    "architect_message": ai_text,
                                },
                            )
                        # Token yechamiz (test rejimida o'tkazib yuboriladi)
                        if not TOKEN_LIMITS_DISABLED:
                            try:
                                request.user.deduct_tokens(SITE_CREATION_COST)
                                balance_data = {
                                    "tokens": request.user.tokens_balance,
                                    "nano_coins": request.user.nano_coins,
                                    "cost": SITE_CREATION_COST,
                                }
                            except ValueError:
                                logger.warning("Token yechishda muammo user=%s", request.user.id)
                        project_data = WebsiteProjectSerializer(project).data
                    else:
                        project_data = {
                            "id": None,
                            "title": new_schema.get("siteName", "AI Site"),
                            "status": "COMPLETED",
                            "schema_data": new_schema,
                        }

                    resp = {
                        "success": True,
                        "phase": "DONE",
                        "is_chat": False,
                        "project": project_data,
                        "architect_message": ai_text,
                        "message": f"✅ Sayt tayyor: «{project_data['title']}»",
                        "stats": {
                            "generation_time_ms": gen_ms,
                            "input_tokens": usage.get("input_tokens", 0),
                            "output_tokens": usage.get("output_tokens", 0),
                            "complexity": complexity,
                        },
                    }
                    if balance_data:
                        resp["balance"] = balance_data
                    if conversation:
                        resp["conversation_id"] = str(conversation.id)
                    return Response(resp)

                # Spec hali yo'q — davom etayotgan suhbat (Gemini)
                # AI javobini va (bo'lsa) variantlarni tarixga yozamiz
                _save_message(
                    conversation, ChatRole.ASSISTANT, ai_text,
                    intent="ARCHITECT" if design_variants else intent,
                    metadata={"design_variants": design_variants} if design_variants else None,
                )
                resp_data: dict = {
                    "success": True,
                    "phase": "ARCHITECT",
                    "is_chat": True,
                    "message": ai_text,
                }
                if design_variants:
                    resp_data["design_variants"] = design_variants
                if conversation:
                    resp_data["conversation_id"] = str(conversation.id)
                return Response(resp_data)

            # ── 3. TO'G'RIDAN-TO'G'RI GENERATSIYA (qisqa yo'l) ───────────
            # Balans tekshirish (auth user uchun)
            if is_auth and not TOKEN_LIMITS_DISABLED and not request.user.can_afford(SITE_CREATION_COST):
                return Response({
                    "success": False,
                    "error": f"Token yetarli emas. Sayt yaratish uchun {SITE_CREATION_COST} token ({tokens_to_nano_coins(SITE_CREATION_COST)} nano koin) kerak. Sizda {request.user.tokens_balance} token ({request.user.nano_coins} nano koin) bor.",
                    "insufficient_tokens": True,
                    "required_tokens": SITE_CREATION_COST,
                    "current_tokens": request.user.tokens_balance,
                }, status=status.HTTP_402_PAYMENT_REQUIRED)

            gen_start = time.monotonic()
            claude = ClaudeService()
            new_schema, usage = claude.generate_full_site(prompt, language)
            gen_ms = int((time.monotonic() - gen_start) * 1000)
            complexity = _estimate_complexity(new_schema)

            balance_data2: Optional[dict] = None
            if is_auth:
                project = WebsiteProject.objects.create(
                    user=request.user,
                    title=new_schema.get("siteName", "AI Site"),
                    prompt=prompt,
                    language=language,
                    schema_data=new_schema,
                    status=ProjectStatus.COMPLETED,
                )
                version = ProjectVersion.objects.create(
                    project=project, prompt=prompt, schema_data=new_schema,
                    intent="generate", version_number=1,
                )
                if conversation:
                    Conversation.objects.filter(id=conversation.id).update(project=project)
                    _save_message(
                        conversation, ChatRole.ASSISTANT,
                        f"✅ Sayt tayyor: «{project.title}»",
                        intent="GENERATE",
                        tokens_input=usage.get("input_tokens", 0),
                        tokens_output=usage.get("output_tokens", 0),
                        duration_ms=gen_ms,
                        project_version=version,
                        metadata={
                            "project_id": str(project.id),
                            "title": project.title,
                            "complexity": complexity,
                        },
                    )
                if not TOKEN_LIMITS_DISABLED:
                    try:
                        request.user.deduct_tokens(SITE_CREATION_COST)
                        balance_data2 = {
                            "tokens": request.user.tokens_balance,
                            "nano_coins": request.user.nano_coins,
                            "cost": SITE_CREATION_COST,
                        }
                    except ValueError:
                        logger.warning("Token yechishda muammo user=%s", request.user.id)
                project_data = WebsiteProjectSerializer(project).data
            else:
                project_data = {
                    "id": None,
                    "title": new_schema.get("siteName", "AI Site"),
                    "status": "COMPLETED",
                    "schema_data": new_schema,
                }

            resp2 = {
                "success": True,
                "phase": "DONE",
                "is_chat": False,
                "project": project_data,
                "message": f"✅ Sayt tayyor: «{project_data['title']}»",
                "stats": {
                    "generation_time_ms": gen_ms,
                    "input_tokens": usage.get("input_tokens", 0),
                    "output_tokens": usage.get("output_tokens", 0),
                    "complexity": complexity,
                },
            }
            if balance_data2:
                resp2["balance"] = balance_data2
            if conversation:
                resp2["conversation_id"] = str(conversation.id)
            return Response(resp2)

        except ValueError as exc:
            logger.warning("AI JSON xatosi: %s", exc)
            return Response(
                {"success": False, "error": str(exc)},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except RuntimeError as exc:
            logger.error("AI runtime xatosi: %s", exc)
            return Response(
                {"success": False, "error": str(exc)},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except Exception as exc:
            logger.exception("AI router xatosi")
            return Response(
                {"success": False, "error": f"AI xizmatida xatolik: {exc}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=["get"])
    def download_zip(self, request, pk=None):
        """
        ZIP yuklab olish.
        Birinchi marta: Claude frontend (HTML/CSS/JS) + backend (Node.js) kodni generatsiya
        qiladi va keshda saqlaydi. Keyingi marta keshdan yuklaydi.
        """
        project = self.get_object()
        try:
            # Kesh: generated_files allaqachon saqlangan bo'lsa ishlatamiz
            if project.generated_files and isinstance(project.generated_files, dict):
                zip_buffer = ExportService.generate_zip_from_files(
                    project, project.generated_files
                )
                logger.info("ZIP keshdan yuklandi project=%s", project.id)
            else:
                # Claude orqali to'liq kod generatsiyasi
                logger.info("Claude kod generatsiyasi boshlandi project=%s", project.id)
                claude = ClaudeService()
                generated_files = claude.generate_site_files(
                    project.schema_data or {}, project.language or "uz"
                )
                # Keshga saqlaymiz
                project.generated_files = generated_files
                project.save(update_fields=["generated_files"])
                zip_buffer = ExportService.generate_zip_from_files(project, generated_files)
                logger.info(
                    "ZIP yaratildi project=%s fayllar=%s",
                    project.id, list(generated_files.keys()),
                )
        except RuntimeError as exc:
            logger.error("Claude kod generatsiyasi xatosi project=%s: %s", project.id, exc)
            # Fallback: oddiy HTML ZIP
            try:
                zip_buffer = ExportService.generate_static_zip(project)
            except Exception:
                logger.exception("Fallback ZIP ham xato project=%s", project.id)
                return Response(
                    {"error": "ZIP eksport xatosi"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
        except Exception:
            logger.exception("ZIP export xatosi project=%s", project.id)
            return Response(
                {"error": "Eksport xatosi"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        safe_title = "".join(c for c in project.title if c.isalnum() or c in " -_").strip()
        resp = HttpResponse(zip_buffer.getvalue(), content_type="application/zip")
        resp["Content-Disposition"] = f'attachment; filename="{safe_title}.zip"'
        return resp

    @action(detail=True, methods=["post"])
    def generate_files(self, request, pk=None):
        """
        Loyihaning barcha kod fayllarini (HTML/CSS/JS/Node.js) JSON ko'rinishida
        qaytaradi. Frontend IDE ko'rinishida ko'rsatish va alohida yuklab olish uchun.
        Kesh bor bo'lsa — undan olinadi.
        """
        project = self.get_object()
        try:
            if project.generated_files and isinstance(project.generated_files, dict):
                return Response({
                    "success": True,
                    "files": project.generated_files,
                    "cached": True,
                })
            claude = ClaudeService()
            files = claude.generate_site_files(
                project.schema_data or {}, project.language or "uz"
            )
            project.generated_files = files
            project.save(update_fields=["generated_files"])
            return Response({
                "success": True,
                "files": files,
                "cached": False,
            })
        except RuntimeError as exc:
            logger.error("generate_files xatosi project=%s: %s", project.id, exc)
            return Response(
                {"success": False, "error": str(exc)},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except Exception:
            logger.exception("generate_files kutilmagan xato")
            return Response(
                {"success": False, "error": "Fayllar generatsiyasida xatolik"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=["post"], permission_classes=[permissions.AllowAny])
    def generate_files_inline(self, request):
        """
        Login talab qilmasdan schema_data dan kod fayllarini generatsiya qiladi.
        Frontend IDE ko'rinishi uchun.
        """
        schema_data = request.data.get("schema_data")
        language = str(request.data.get("language", "uz"))

        if not schema_data or not isinstance(schema_data, dict):
            return Response(
                {"success": False, "error": "schema_data talab qilinadi."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Rate limit
        rl_key = f"ip:{_get_client_ip(request)}"
        if not _ai_rate_limiter.allow(rl_key):
            return Response(
                {"success": False, "error": "Juda ko'p so'rov. Bir daqiqadan keyin urinib ko'ring."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        try:
            claude = ClaudeService()
            files = claude.generate_site_files(schema_data, language)
            return Response({"success": True, "files": files})
        except RuntimeError as exc:
            logger.error("generate_files_inline xatosi: %s", exc)
            return Response(
                {"success": False, "error": str(exc)},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except Exception:
            logger.exception("generate_files_inline kutilmagan xato")
            return Response(
                {"success": False, "error": "Fayllar generatsiyasida xatolik"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=["post"])
    def regenerate_code(self, request, pk=None):
        """Mavjud loyiha uchun kodni qaytadan generatsiya qiladi (keshni tozalaydi)."""
        project = self.get_object()
        project.generated_files = None
        project.save(update_fields=["generated_files"])
        return Response({"success": True, "message": "Kod keshi tozalandi. ZIP yuklaganda qayta generatsiya bo'ladi."})

    @action(detail=False, methods=["post"], permission_classes=[permissions.AllowAny])
    def export_zip(self, request):
        """
        Login talab qilmasdan schema_data dan ZIP yaratadi.
        Frontend sxemani yuboradi, biz HTML ZIP qaytaramiz.
        """
        schema_data = request.data.get("schema_data")
        title = str(request.data.get("title", "my-site"))[:100]
        language = str(request.data.get("language", "uz"))

        if not schema_data or not isinstance(schema_data, dict):
            return Response({"error": "schema_data talab qilinadi."}, status=status.HTTP_400_BAD_REQUEST)

        # Vaqtincha loyiha ob'ekti yaratamiz (DB ga saqlamasdan)
        class TempProject:
            schema_data = None
            generated_files = None
            language = "uz"
            created_at = None

            def __init__(self, sd, lang, t):
                import datetime
                self.schema_data = sd
                self.language = lang
                self.title = t
                self.created_at = datetime.datetime.now()

        temp = TempProject(schema_data, language, title)

        try:
            zip_buffer = ExportService.generate_static_zip(temp)
        except Exception:
            logger.exception("export_zip xatosi")
            return Response({"error": "ZIP yaratishda xatolik"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        safe_title = "".join(c for c in title if c.isalnum() or c in " -_").strip() or "site"
        resp = HttpResponse(zip_buffer.getvalue(), content_type="application/zip")
        resp["Content-Disposition"] = f'attachment; filename="{safe_title}.zip"'
        return resp

    @action(detail=False, methods=["post"], permission_classes=[permissions.AllowAny])
    def revise_inline(self, request):
        """
        Login talab qilmasdan mavjud schema ni tahrirlaydi.
        schema_data + prompt yuboriladi, yangi schema qaytariladi.
        """
        prompt = (request.data.get("prompt") or "").strip()
        schema_data = request.data.get("schema_data")
        language = str(request.data.get("language", "uz"))

        if not prompt:
            return Response({"error": "Prompt talab qilinadi."}, status=status.HTTP_400_BAD_REQUEST)
        if not schema_data or not isinstance(schema_data, dict):
            return Response({"error": "schema_data talab qilinadi."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            gen_start = time.monotonic()
            claude = ClaudeService()
            new_schema = claude.revise_site(prompt, schema_data, language)
            gen_ms = int((time.monotonic() - gen_start) * 1000)
            complexity = _estimate_complexity(new_schema)

            # revise_site usage ma'lumot qaytarmaydi — oddiy dict
            return Response({
                "success": True,
                "phase": "DONE",
                "project": {
                    "id": None,
                    "title": new_schema.get("siteName", schema_data.get("siteName", "AI Site")),
                    "status": "COMPLETED",
                    "schema_data": new_schema,
                },
                "stats": {
                    "generation_time_ms": gen_ms,
                    "input_tokens": 0,
                    "output_tokens": 0,
                    "complexity": complexity,
                },
                "message": "✅ Sayt yangilandi.",
            })
        except RuntimeError as exc:
            logger.error("revise_inline xatosi: %s", exc)
            return Response({"success": False, "error": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
        except Exception:
            logger.exception("revise_inline kutilmagan xato")
            return Response({"success": False, "error": "AI xizmatida xatolik"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─────────────────────────────────────────────────────────────
# Suhbat tarixi API
# ─────────────────────────────────────────────────────────────

from .serializers import ConversationDetailSerializer, ConversationListSerializer


class ConversationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Foydalanuvchi suhbatlari tarixi.
      GET /api/conversations/         → barcha suhbatlar ro'yxati
      GET /api/conversations/<id>/    → bitta suhbat + barcha xabarlar
      DELETE /api/conversations/<id>/ → suhbatni o'chirish
    """
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "delete", "head", "options"]

    def get_queryset(self):
        qs = Conversation.objects.filter(user=self.request.user).select_related("project")
        if self.action == "retrieve":
            qs = qs.prefetch_related("messages")
        return qs

    def get_serializer_class(self):
        if self.action == "retrieve":
            return ConversationDetailSerializer
        return ConversationListSerializer

    def destroy(self, request, *args, **kwargs):
        """Suhbatni o'chirish — tegishli xabarlar CASCADE orqali o'chadi."""
        instance = self.get_object()
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
