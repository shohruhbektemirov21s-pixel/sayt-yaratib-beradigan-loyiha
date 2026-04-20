import logging
from datetime import timedelta

from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.ai_generation.services import GeminiService
from apps.subscriptions.services import SubscriptionService

from .models import ProjectStatus, WebsiteProject
from .serializers import CreateProjectSerializer, WebsiteProjectSerializer

logger = logging.getLogger(__name__)


def _build_preview_schema(prompt: str, blueprint: dict) -> dict:
    """
    Frontend `SiteRenderer` uchun minimal render qilinadigan sxema.
    Gemini blueprintidagi section stringlarini UI section obyektlariga aylantiradi.
    """
    site_name = blueprint.get("siteName") or "AI Website"
    pages = blueprint.get("pages") or []
    first_page = pages[0] if pages else {"name": "Home", "slug": "home", "sections": ["hero", "features"]}
    raw_sections = first_page.get("sections") or ["hero", "features"]

    section_objects = []
    for section in raw_sections:
        section_type = str(section).strip().lower()
        if section_type == "hero":
            section_objects.append(
                {
                    "id": "hero-1",
                    "type": "hero",
                    "variant": "default",
                    "content": {
                        "title": site_name,
                        "description": prompt[:180] if prompt else "Your AI generated website is ready.",
                        "ctaText": "Get Started",
                    },
                    "settings": {},
                }
            )
        elif section_type in {"features", "services", "products"}:
            section_objects.append(
                {
                    "id": "features-1",
                    "type": "features",
                    "variant": "cards",
                    "content": {
                        "title": "What we offer",
                        "items": [
                            {"title": "Fast setup", "desc": "Launch quickly with AI-generated structure."},
                            {"title": "Modern design", "desc": "Clean layout tailored for your business."},
                            {"title": "Easy edits", "desc": "Adjust text and sections in seconds."},
                        ],
                    },
                    "settings": {},
                }
            )

    if not section_objects:
        section_objects = [
            {
                "id": "hero-1",
                "type": "hero",
                "variant": "default",
                "content": {
                    "title": site_name,
                    "description": prompt[:180] if prompt else "Your AI generated website is ready.",
                    "ctaText": "Get Started",
                },
                "settings": {},
            }
        ]

    return {
        "siteName": site_name,
        "brandColors": {
            "primary": "#111827",
            "secondary": "#4f46e5",
            "accent": "#14b8a6",
        },
        "pages": [
            {
                "title": first_page.get("name") or "Home",
                "slug": first_page.get("slug") or "home",
                "seo": {
                    "title": site_name,
                    "description": prompt[:160] if prompt else f"{site_name} website",
                },
                "sections": section_objects,
            }
        ],
    }

class WebsiteProjectViewSet(viewsets.ModelViewSet):
    serializer_class = WebsiteProjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return WebsiteProject.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['post'])
    def generate(self, request):
        serializer = CreateProjectSerializer(data=request.data)
        if serializer.is_valid():
            user = request.user
            # Check limits
            can_create, msg = SubscriptionService.check_user_limits(user, 'projects')
            if not can_create:
                return Response({"detail": msg}, status=status.HTTP_403_FORBIDDEN)
            
            # GUARD: Prevent duplicate generating processes for same user
            # Find any active generation that is NOT older than 10 minutes (safety timeout)
            stuck_threshold = timezone.now() - timedelta(minutes=10)
            active_gen = WebsiteProject.objects.filter(
                user=user, 
                status=ProjectStatus.GENERATING,
                generation_started_at__gt=stuck_threshold
            ).exists()
            
            if active_gen:
                return Response(
                    {"detail": "You already have a site being generated. Please wait or try again in 10 minutes."}, 
                    status=status.HTTP_409_CONFLICT
                )

            # Create project record
            project = WebsiteProject.objects.create(
                user=user,
                title=serializer.validated_data['title'],
                prompt=serializer.validated_data['prompt'],
                language=serializer.validated_data['language'],
                status=ProjectStatus.GENERATING,
                generation_started_at=timezone.now()
            )

            
            # Perform AI generation synchronously (for demo)
            gemini = GeminiService()
            try:
                blueprint = gemini.generate_blueprint(project.prompt, language=project.language)
                project.blueprint = blueprint
                project.schema_data = _build_preview_schema(project.prompt, blueprint)
                project.status = ProjectStatus.COMPLETED
                project.save()
            except Exception as e:
                logger.error(f"Gemini generation failed: {e}")
                project.status = ProjectStatus.FAILED
                project.save()
                return Response({"detail": "AI generation failed."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            # Return the completed project with blueprint
            return Response(WebsiteProjectSerializer(project).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
