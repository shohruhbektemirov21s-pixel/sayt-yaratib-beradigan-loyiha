from rest_framework import serializers
from .models import Tariff, Subscription

class TariffSerializer(serializers.ModelSerializer):
    features = serializers.SerializerMethodField()
    weekly_allowance = serializers.IntegerField(read_only=True)

    class Meta:
        model = Tariff
        fields = [
            "id", "name", "description", "price", "duration_days",
            "projects_limit", "pages_per_project_limit", "ai_generations_limit",
            "nano_coins_included", "weekly_allowance",
            "is_active", "features",
        ]

    def get_features(self, obj):
        features = []
        if obj.nano_coins_included > 0:
            features.append(f"💎 {obj.nano_coins_included:,} nano koin (haftada {obj.weekly_allowance:,})")
        if obj.projects_limit == 0:
            features.append("Cheksiz loyihalar")
        else:
            features.append(f"{obj.projects_limit} ta loyiha")
        if obj.ai_generations_limit == 0:
            features.append("Cheksiz AI generatsiya")
        else:
            features.append(f"{obj.ai_generations_limit} ta AI generatsiya")
        features.append(f"{obj.duration_days} kunlik obuna")
        features.append("1 chat = 500 nano koin (AI kod)")
        return features

class SubscriptionSerializer(serializers.ModelSerializer):
    tariff_name = serializers.ReadOnlyField(source='tariff.name')
    
    class Meta:
        model = Subscription
        fields = '__all__'
