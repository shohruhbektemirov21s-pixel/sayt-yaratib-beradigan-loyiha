from rest_framework import serializers

from .models import ChatMessage, Conversation, WebsiteProject


class WebsiteProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = WebsiteProject
        fields = '__all__'
        read_only_fields = ('id', 'user', 'status', 'blueprint', 'schema_data', 'created_at', 'updated_at')


class CreateProjectSerializer(serializers.Serializer):
    prompt = serializers.CharField(required=True)
    title = serializers.CharField(required=True)
    language = serializers.ChoiceField(choices=['en', 'ru', 'uz'], default='en')


class ChatMessageSerializer(serializers.ModelSerializer):
    """Bitta yozishma — tarix sahifasida ko'rsatiladi."""
    class Meta:
        model = ChatMessage
        fields = (
            'id', 'role', 'content', 'intent', 'metadata',
            'tokens_input', 'tokens_output', 'duration_ms', 'created_at',
        )
        read_only_fields = fields


class ConversationListSerializer(serializers.ModelSerializer):
    """Tarix ro'yxati uchun qisqa ma'lumot."""
    project_title = serializers.CharField(source='project.title', read_only=True, default=None)

    class Meta:
        model = Conversation
        fields = (
            'id', 'title', 'language', 'project', 'project_title',
            'total_messages', 'total_tokens_input', 'total_tokens_output',
            'created_at', 'updated_at',
        )


class ConversationDetailSerializer(serializers.ModelSerializer):
    """Suhbat tafsiloti + barcha xabarlar."""
    messages = ChatMessageSerializer(many=True, read_only=True)
    project_title = serializers.CharField(source='project.title', read_only=True, default=None)

    class Meta:
        model = Conversation
        fields = (
            'id', 'title', 'language', 'project', 'project_title',
            'total_messages', 'total_tokens_input', 'total_tokens_output',
            'created_at', 'updated_at', 'messages',
        )
