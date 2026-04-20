import logging
from django.http import HttpResponse
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.ai_generation.services import ClaudeService, AIRouterService
from apps.accounts.models import User
from apps.exports.services import ExportService
from .models import ProjectStatus, WebsiteProject, ProjectVersion
from .serializers import WebsiteProjectSerializer

logger = logging.getLogger(__name__)

class WebsiteProjectViewSet(viewsets.ModelViewSet):
    serializer_class = WebsiteProjectSerializer
    
    def get_permissions(self):
        if self.action in ['process_prompt', 'download_zip']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        return WebsiteProject.objects.filter(user=self.request.user)

    @action(detail=False, methods=['post'])
    def process_prompt(self, request):
        prompt = request.data.get('prompt')
        project_id = request.data.get('project_id')
        language = request.data.get('language', 'uz')

        if not prompt:
            return Response({"success": False, "error": "Prompt kutilmoqda."}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user if request.user.is_authenticated else User.objects.filter(is_staff=True).first()
        if not user:
             user, _ = User.objects.get_or_create(email="tester@example.com", defaults={"full_name": "Tester"})

        intent = AIRouterService.detect_intent(prompt)
        
        try:
            if intent == "CHAT":
                # CHAT MODE
                chat_api = ClaudeService()
                chat_res = chat_api.chat(prompt)
                return Response({
                    "success": True, "ai_type": "CLAUDE", "message": chat_res, "is_chat": True
                })

            else:
                # GENERATION MODE (CLAUDE)
                gemini = ClaudeService()
                if project_id:
                    project = WebsiteProject.objects.get(id=project_id)
                    new_schema = gemini.revise_site(prompt, project.schema_data, language)
                    project.schema_data = new_schema
                    project.save()
                    ProjectVersion.objects.create(
                        project=project, prompt=prompt, schema_data=new_schema, 
                        intent="revise", version_number=project.versions.count() + 1
                    )
                else:
                    new_schema = gemini.generate_full_site(prompt, language)
                    project = WebsiteProject.objects.create(
                        user=user, title=new_schema.get('siteName', 'AI Site'),
                        prompt=prompt, language=language, schema_data=new_schema,
                        status=ProjectStatus.COMPLETED
                    )
                    ProjectVersion.objects.create(
                        project=project, prompt=prompt, schema_data=new_schema, 
                        intent="generate", version_number=1
                    )

                return Response({
                    "success": True, "ai_type": "CLAUDE", "project": WebsiteProjectSerializer(project).data, "is_chat": False
                })

        except Exception as e:
            logger.exception(f"AI Router Error: {e}")
            return Response({
                "success": False, "error": "AI vaqtincha ishlamayapti", "details": str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def download_zip(self, request, pk=None):
        try:
            project = self.get_object()
            zip_buffer = ExportService.generate_static_zip(project)
            response = HttpResponse(zip_buffer.getvalue(), content_type='application/zip')
            response['Content-Disposition'] = f'attachment; filename="{project.title}.zip"'
            return response
        except Exception as e:
            return Response({"error": "Eksport xatosi"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
