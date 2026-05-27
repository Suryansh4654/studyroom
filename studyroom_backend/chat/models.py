import uuid
from django.db import models
from django.conf import settings
from rooms.models import StudyRoom

class ChatMessage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room = models.ForeignKey(StudyRoom, on_delete=models.CASCADE, related_name='chat_messages')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sent_messages')
    message = models.TextField()
    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'chat_chatmessage'
        ordering = ('sent_at',)

    def __str__(self):
        return f'{self.sender.username}: {self.message[:20]} in {self.room.name}'
