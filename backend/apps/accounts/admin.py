from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from unfold.admin import ModelAdmin
from .models import User

@admin.register(User)
class UserAdmin(BaseUserAdmin, ModelAdmin):
    list_display = ["email", "full_name", "is_staff", "is_active"]
    search_fields = ["email", "full_name"]
    ordering = ["email"]
    
    # Unfold requires specific fieldsets matching auth.User
    # Custom fieldsets for the custom User model (no username field)
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal info", {"fields": ("full_name", "role")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Important dates", {"fields": ("last_login", "date_joined")}),
    )
