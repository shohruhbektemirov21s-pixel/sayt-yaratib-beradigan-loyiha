from django.contrib import admin
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from unfold.admin import ModelAdmin, TabularInline

from .models import ChatMessage, Conversation, ProjectVersion, WebsiteProject


@admin.register(WebsiteProject)
class WebsiteProjectAdmin(ModelAdmin):
    list_display = ("title", "user", "status", "language", "created_at")
    list_filter = ("status", "language", "created_at")
    search_fields = ("title", "user__email", "prompt")
    readonly_fields = ("id", "created_at", "updated_at")
    ordering = ("-created_at",)


@admin.register(ProjectVersion)
class ProjectVersionAdmin(ModelAdmin):
    list_display = ("project", "version_number", "intent", "created_at")
    list_filter = ("intent", "created_at")
    readonly_fields = ("id", "created_at")
    ordering = ("-created_at",)


# ── Chat tarixi ─────────────────────────────────────────────

class ChatMessageInline(TabularInline):
    model = ChatMessage
    extra = 0
    fields = ("role_badge", "short_content", "intent", "tokens_input", "tokens_output", "duration_ms", "created_at")
    readonly_fields = ("role_badge", "short_content", "intent", "tokens_input", "tokens_output", "duration_ms", "created_at")
    can_delete = False
    show_change_link = True
    ordering = ("created_at",)

    def role_badge(self, obj):
        colors = {"user": "#8b5cf6", "assistant": "#10b981", "system": "#6b7280"}
        return format_html(
            '<span style="background:{};color:#fff;padding:2px 8px;border-radius:6px;'
            'font-size:10px;font-weight:600;text-transform:uppercase">{}</span>',
            colors.get(obj.role, "#6b7280"), obj.role,
        )
    role_badge.short_description = "Rol"

    def short_content(self, obj):
        text = obj.content[:180].replace("\n", " ")
        if len(obj.content) > 180:
            text += "…"
        return text
    short_content.short_description = "Xabar"

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Conversation)
class ConversationAdmin(ModelAdmin):
    list_display = (
        "short_title", "user", "project_link", "total_messages",
        "tokens_badge", "updated_at",
    )
    list_filter = ("language", "created_at", "updated_at")
    search_fields = ("title", "user__email", "messages__content")
    readonly_fields = (
        "id", "user", "project", "total_messages",
        "total_tokens_input", "total_tokens_output",
        "created_at", "updated_at",
    )
    ordering = ("-updated_at",)
    inlines = [ChatMessageInline]
    list_per_page = 30

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("user", "project")

    def short_title(self, obj):
        return (obj.title or "(sarlavhasiz)")[:50]
    short_title.short_description = "Sarlavha"

    def project_link(self, obj):
        if not obj.project:
            return mark_safe('<span style="color:#6b7280">—</span>')
        return format_html(
            '<a href="/17210707admin/website_projects/websiteproject/{}/change/" '
            'style="color:#8b5cf6;font-weight:600">🌐 {}</a>',
            obj.project.id, obj.project.title[:30],
        )
    project_link.short_description = "Loyiha"

    def tokens_badge(self, obj):
        total = obj.total_tokens_input + obj.total_tokens_output
        if total == 0:
            return mark_safe('<span style="color:#6b7280">—</span>')
        return format_html(
            '<span style="color:#f59e0b;font-weight:700;font-size:11px">💎 {}</span>',
            f"{total:,}",
        )
    tokens_badge.short_description = "Tokenlar"


@admin.register(ChatMessage)
class ChatMessageAdmin(ModelAdmin):
    list_display = ("role", "short_content", "intent", "conversation_link", "tokens_input", "tokens_output", "created_at")
    list_filter = ("role", "intent", "created_at")
    search_fields = ("content", "conversation__user__email")
    readonly_fields = ("id", "conversation", "role", "content", "intent", "metadata",
                       "project_version", "tokens_input", "tokens_output",
                       "duration_ms", "created_at")
    ordering = ("-created_at",)
    list_per_page = 50

    def short_content(self, obj):
        return (obj.content[:100] + "…") if len(obj.content) > 100 else obj.content
    short_content.short_description = "Mazmun"

    def conversation_link(self, obj):
        return format_html(
            '<a href="/17210707admin/website_projects/conversation/{}/change/" '
            'style="color:#8b5cf6">💬 {}</a>',
            obj.conversation.id, (obj.conversation.title or "suhbat")[:25],
        )
    conversation_link.short_description = "Suhbat"

    def has_add_permission(self, request):
        return False
