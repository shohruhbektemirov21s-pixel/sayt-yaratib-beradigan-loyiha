import html
import re

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import User


def _sanitize_text(value: str) -> str:
    """XSS: HTML escape + bo'sh joylarni trim."""
    return html.escape(value.strip())


class UserSerializer(serializers.ModelSerializer):
    nano_coins = serializers.IntegerField(read_only=True)

    class Meta:
        model = User
        fields = (
            'id', 'email', 'full_name', 'role', 'is_staff', 'date_joined',
            'tokens_balance', 'nano_coins',
        )
        read_only_fields = (
            'id', 'is_staff', 'date_joined', 'tokens_balance', 'nano_coins',
        )


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=4, max_length=128)
    full_name = serializers.CharField(required=False, allow_blank=True, max_length=255)

    class Meta:
        model = User
        fields = ('email', 'password', 'full_name')

    def validate_email(self, value: str) -> str:
        email = value.strip().lower()
        # Noto'g'ri belgilarni tekshirish
        if not re.match(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$", email):
            raise serializers.ValidationError("Email formati noto'g'ri.")
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError("Bu email allaqachon ro'yxatdan o'tgan.")
        return email

    def validate_password(self, value: str) -> str:
        try:
            validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages)) from exc
        return value

    def validate_full_name(self, value: str) -> str:
        return _sanitize_text(value)[:255]

    def create(self, validated_data):
        return User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            full_name=validated_data.get('full_name', ''),
        )
