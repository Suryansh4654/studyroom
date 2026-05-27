from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import StudyRoom, RoomMember, StudySession, RoomActivity
from accounts.serializers import UserSerializer

User = get_user_model()

class StudyRoomSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)
    members_count = serializers.SerializerMethodField()
    last_session_date = serializers.SerializerMethodField()
    active_session = serializers.SerializerMethodField()

    class Meta:
        model = StudyRoom
        fields = ('id', 'name', 'description', 'created_by', 'invite_code', 'is_active', 'created_at', 'members_count', 'last_session_date', 'active_session', 'daily_target_hours')
        read_only_fields = ('id', 'invite_code', 'is_active', 'created_at', 'created_by')

    def get_members_count(self, obj):
        return obj.members.count()

    def get_last_session_date(self, obj):
        last_session = obj.sessions.order_by('-start_time').first()
        return last_session.start_time if last_session else None

    def get_active_session(self, obj):
        active = obj.sessions.filter(end_time__isnull=True).first()
        if active:
            return {
                'id': active.id,
                'started_by': active.started_by.username,
                'start_time': active.start_time
            }
        return None

class RoomMemberSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = RoomMember
        fields = ('id', 'room', 'user', 'role', 'joined_at')
        read_only_fields = ('id', 'joined_at')

class StudySessionSerializer(serializers.ModelSerializer):
    started_by = UserSerializer(read_only=True)

    class Meta:
        model = StudySession
        fields = ('id', 'room', 'started_by', 'start_time', 'end_time', 'duration_seconds')
        read_only_fields = ('id', 'duration_seconds')

class RoomActivitySerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = RoomActivity
        fields = ('id', 'room', 'user', 'action', 'timestamp')
