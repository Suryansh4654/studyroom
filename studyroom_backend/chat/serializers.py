from rest_framework import serializers
from .models import ChatMessage
from accounts.serializers import UserSerializer

class ChatMessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)

    class Meta:
        model = ChatMessage
        fields = ('id', 'room', 'sender', 'message', 'sent_at')
        read_only_fields = ('id', 'sent_at', 'sender')
