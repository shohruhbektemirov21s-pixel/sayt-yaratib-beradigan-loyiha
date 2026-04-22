from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
import uuid

class ProjectStatus(models.TextChoices):
    IDLE = 'IDLE', _('Idle')
    GENERATING = 'GENERATING', _('Generating')
    COMPLETED = 'COMPLETED', _('Completed')
    FAILED = 'FAILED', _('Failed')

class WebsiteProject(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='projects'
    )
    title = models.CharField(max_length=255)
    prompt = models.TextField()
    language = models.CharField(max_length=10, default='en') # en, ru, uz
    
    status = models.CharField(
        max_length=20, 
        choices=ProjectStatus.choices, 
        default=ProjectStatus.IDLE
    )
    
    # The generated content
    blueprint = models.JSONField(null=True, blank=True)
    schema_data = models.JSONField(null=True, blank=True)
    # Claude-generated code files: {"index.html": "...", "css/styles.css": "...", ...}
    generated_files = models.JSONField(null=True, blank=True)
    
    # Metadata
    business_type = models.CharField(max_length=100, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    generation_started_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.title} ({self.user.email})"

    class Meta:
        ordering = ['-created_at']

class ProjectVersion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(WebsiteProject, on_delete=models.CASCADE, related_name='versions')
    prompt = models.TextField()
    schema_data = models.JSONField()
    intent = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    version_number = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ['-created_at']
        unique_together = ('project', 'version_number')


# ─────────────────────────────────────────────────────────────
# Chat tarixi: Conversation (suhbat) + ChatMessage (yozishma)
# Har bir foydalanuvchining AI bilan bo'lgan barcha yozishmalarini
# saqlaydi. Suhbat yangilanganda, unga bog'liq loyiha paydo bo'lsa
# `project` bog'lanadi.
# ─────────────────────────────────────────────────────────────

class Conversation(models.Model):
    """AI bilan bir sessiya suhbati. Loyiha yaratilsa unga bog'lanadi."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='conversations',
    )
    project = models.ForeignKey(
        WebsiteProject,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='conversations',
    )
    title = models.CharField(max_length=255, blank=True)
    language = models.CharField(max_length=10, default='uz')
    # Agregat metrikalar — admin panel uchun qulay
    total_messages = models.PositiveIntegerField(default=0)
    total_tokens_input = models.PositiveIntegerField(default=0)
    total_tokens_output = models.PositiveIntegerField(default=0)
    # Har bir yangi chat ochilganda 500 nano bonus beriladi.
    # Bu AI kod yozishda birinchi navbatda ishlatiladi; tugagach user
    # obuna tokenlaridan yechiladi.
    chat_budget_nano = models.PositiveIntegerField(
        default=500,
        help_text="Chat uchun bonus nano koin (har yangi chatda 500 beriladi)",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['-updated_at']),
            models.Index(fields=['user', '-updated_at']),
        ]

    def __str__(self):
        title = self.title or '(sarlavhasiz)'
        return f"{title} — {self.user.email}"


class ChatRole(models.TextChoices):
    USER = 'user', _('User')
    ASSISTANT = 'assistant', _('AI')
    SYSTEM = 'system', _('System')


class ChatMessage(models.Model):
    """Bitta xabar — user yoki AI tomonidan yuborilgan."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='messages',
    )
    role = models.CharField(max_length=20, choices=ChatRole.choices)
    content = models.TextField()
    # Intent: CHAT / ARCHITECT / REVISE / GENERATE / DESIGN_VARIANTS
    intent = models.CharField(max_length=30, blank=True)
    # Qo'shimcha ma'lumot: design_variants, stats, balance, schema snapshot
    metadata = models.JSONField(null=True, blank=True)
    # Agar bu xabar natijasida loyiha yaratilgan/yangilangan bo'lsa
    project_version = models.ForeignKey(
        ProjectVersion,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='messages',
    )
    # Tokenlar (AI xabarlari uchun)
    tokens_input = models.PositiveIntegerField(default=0)
    tokens_output = models.PositiveIntegerField(default=0)
    # Generatsiya vaqti (ms) — AI xabarlari uchun
    duration_ms = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['conversation', 'created_at']),
        ]

    def __str__(self):
        preview = self.content[:60].replace('\n', ' ')
        return f"[{self.role}] {preview}"
