import uuid
import secrets
import string
from django.db import models
from django.conf import settings

def generate_invite_code():
    alphabet = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(8))

class StudyRoom(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_rooms')
    invite_code = models.CharField(max_length=8, unique=True, default=generate_invite_code)
    is_active = models.BooleanField(default=True)
    daily_target_hours = models.IntegerField(default=2) # New customizable daily target hours
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'rooms_studyroom'

    def __str__(self):
        return self.name

class RoomMember(models.Model):
    ROLE_CHOICES = (
        ('owner', 'Owner'),
        ('member', 'Member'),
    )
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room = models.ForeignKey(StudyRoom, on_delete=models.CASCADE, related_name='members')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='room_memberships')
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='member')
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'rooms_roommember'
        unique_together = ('room', 'user')

    def __str__(self):
        return f'{self.user.username} in {self.room.name} ({self.role})'

class StudySession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room = models.ForeignKey(StudyRoom, on_delete=models.CASCADE, related_name='sessions')
    started_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='started_sessions')
    start_time = models.DateTimeField()
    end_time = models.DateTimeField(null=True, blank=True)
    duration_seconds = models.IntegerField(null=True, blank=True)

    class Meta:
        db_table = 'rooms_studysession'

    def __str__(self):
        return f'Session in {self.room.name} by {self.started_by.username}'

class RoomActivity(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room = models.ForeignKey(StudyRoom, on_delete=models.CASCADE, related_name='activities')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='activities')
    action = models.CharField(max_length=50)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'rooms_roomactivity'
        ordering = ('-timestamp',)

    def __str__(self):
        username = self.user.username if self.user else 'Unknown User'
        return f'{username} {self.action} in {self.room.name}'
