from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions
from .models import ChatMessage
from .serializers import ChatMessageSerializer
from rooms.views import IsRoomMember
from rooms.models import StudyRoom

class ChatMessageListView(generics.ListAPIView):
    serializer_class = ChatMessageSerializer
    permission_classes = (permissions.IsAuthenticated, IsRoomMember)

    def get_queryset(self):
        room_id = self.kwargs.get('room_id')
        # Ensure room exists
        get_object_or_404(StudyRoom, pk=room_id)
        # Fetch last 50 messages, ordered by sent_at asc for chronologically correct rendering
        # Note: to get the last 50 messages, we can order by -sent_at, slice 50, and then reverse them in memory,
        # or we can order by sent_at directly and fetch last 50. Ordering by -sent_at, slicing 50 and reversing
        # is extremely standard and highly performant.
        messages = ChatMessage.objects.filter(room_id=room_id).order_by('-sent_at')[:50]
        return reversed(messages)
