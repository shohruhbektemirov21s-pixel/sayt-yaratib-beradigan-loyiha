import environ
from django.contrib import admin
from django.contrib.auth.decorators import login_required
from django.http import HttpResponseForbidden
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

env = environ.Env()

ADMIN_URL = env("ADMIN_URL", default="17210707admin")


def _staff_required(view):
    """Login qilingan user is_staff=True bo'lmasa — 403."""
    def wrapper(request, *args, **kwargs):
        # Anonim foydalanuvchiga Django admin login sahifasini ko'rsatamiz
        # (admin'ning o'z login view'i autentifikatsiyani boshqaradi).
        if not request.user.is_authenticated:
            return view(request, *args, **kwargs)
        if not request.user.is_staff:
            return HttpResponseForbidden(
                b"<h1>403 Forbidden</h1><p>Ruxsat yo'q.</p>"
            )
        return view(request, *args, **kwargs)
    return wrapper


# Admin panelni faqat staff uchun — qo'shimcha muhofaza
admin.site.login = _staff_required(admin.site.login)  # noqa: disable hint

urlpatterns = [
    path(f"{ADMIN_URL}/", admin.site.urls),

    # API endpoints
    path("api/accounts/", include("apps.accounts.urls")),
    path("api/subscriptions/", include("apps.subscriptions.urls")),
    path("api/projects/", include("apps.website_projects.urls")),
    path("api/conversations/", include(("apps.website_projects.conversation_urls", "conversations"), namespace="conversations")),
    path("api/ai/", include("apps.ai_generation.urls")),
    path("api/payments/", include("apps.payments.urls")),

    # API hujjatlari — FAQAT DEBUG da ko'rinadigan (production da o'chadi)
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
