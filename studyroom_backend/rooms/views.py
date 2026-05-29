
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from chat.consumers import to_json_compatible
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.utils import timezone
from rest_framework import viewsets, permissions, status, generics
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.views import APIView

from .models import StudyRoom, RoomMember, StudySession, RoomActivity, RoomTask
from .serializers import StudyRoomSerializer, RoomMemberSerializer, StudySessionSerializer, RoomActivitySerializer, RoomTaskSerializer

class IsRoomMember(permissions.BasePermission):
    def has_permission(self, request, view):
        room_id = view.kwargs.get('room_id') or view.kwargs.get('pk')
        if not room_id:
            return True
        return RoomMember.objects.filter(room_id=room_id, user=request.user).exists()

class IsRoomOwner(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return RoomMember.objects.filter(room=obj, user=request.user, role='owner').exists()

class RoomViewSet(viewsets.ModelViewSet):
    serializer_class = StudyRoomSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        return StudyRoom.objects.filter(members__user=self.request.user)

    def get_permissions(self):
        if self.action in ['retrieve', 'destroy', 'update', 'partial_update']:
            return [permissions.IsAuthenticated()]
        return super().get_permissions()

    def check_object_permissions(self, request, obj):
        super().check_object_permissions(request, obj)
        if self.action == 'retrieve':
            if not RoomMember.objects.filter(room=obj, user=request.user).exists():
                self.permission_denied(request, message='Only members can access this room.')
        elif self.action in ['destroy', 'update', 'partial_update']:
            if not RoomMember.objects.filter(room=obj, user=request.user, role='owner').exists():
                self.permission_denied(request, message='Only the room owner can manage, update, or delete this room.')

    def perform_create(self, serializer):
        with transaction.atomic():
            room = serializer.save(created_by=self.request.user)
            RoomMember.objects.create(
                room=room,
                user=self.request.user,
                role='owner'
            )

    def perform_update(self, serializer):
        with transaction.atomic():
            room = serializer.save()
            RoomActivity.objects.create(
                room=room,
                user=self.request.user,
                action="updated chamber settings"
            )

    @action(detail=True, methods=['post'], url_path='promote-member')
    def promote_member(self, request, pk=None):
        room = self.get_object()
        # Enforce owner check
        if not RoomMember.objects.filter(room=room, user=request.user, role='owner').exists():
            return Response({'error': 'Only the owner can promote other members.'}, status=status.HTTP_403_FORBIDDEN)
        
        member_id = request.data.get('member_id')
        try:
            member_to_promote = RoomMember.objects.get(room=room, id=member_id)
        except RoomMember.DoesNotExist:
            return Response({'error': 'Member not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        if member_to_promote.user == request.user:
            return Response({'error': 'You are already the owner.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            # Current owner becomes member
            RoomMember.objects.filter(room=room, user=request.user).update(role='member')
            # Target member becomes owner
            member_to_promote.role = 'owner'
            member_to_promote.save()
            
            RoomActivity.objects.create(
                room=room,
                user=request.user,
                action=f"transferred ownership to {member_to_promote.user.username}"
            )
        
        return Response({'message': f'Successfully transferred ownership to {member_to_promote.user.username}.'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='kick-member')
    def kick_member(self, request, pk=None):
        room = self.get_object()
        # Enforce owner check
        if not RoomMember.objects.filter(room=room, user=request.user, role='owner').exists():
            return Response({'error': 'Only the owner can kick members.'}, status=status.HTTP_403_FORBIDDEN)
        
        member_id = request.data.get('member_id')
        try:
            member_to_kick = RoomMember.objects.get(room=room, id=member_id)
        except RoomMember.DoesNotExist:
            return Response({'error': 'Member not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        if member_to_kick.user == request.user:
            return Response({'error': 'You cannot kick yourself.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            username = member_to_kick.user.username
            member_to_kick.delete()
            
            RoomActivity.objects.create(
                room=room,
                user=request.user,
                action=f"removed {username} from the study chamber"
            )
        
        return Response({'message': f'Successfully kicked {username} from the room.'}, status=status.HTTP_200_OK)

class JoinRoomView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request, *args, **kwargs):
        invite_code = request.data.get('invite_code')
        if not invite_code:
            return Response({'error': 'Invite code is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            room = StudyRoom.objects.get(invite_code__iexact=invite_code.strip())
        except StudyRoom.DoesNotExist:
            return Response({'error': 'Invalid invite code.'}, status=status.HTTP_404_NOT_FOUND)

        if not room.is_active:
            return Response({'error': 'This room is inactive.'}, status=status.HTTP_400_BAD_REQUEST)

        member, created = RoomMember.objects.get_or_create(
            room=room,
            user=request.user,
            defaults={'role': 'member'}
        )

        if not created:
            return Response(
                {
                    'room': StudyRoomSerializer(room).data,
                    'message': 'You are already a member of this room.'
                },
                status=status.HTTP_200_OK
            )

        return Response(
            {
                'room': StudyRoomSerializer(room).data,
                'message': 'Successfully joined room.'
            },
            status=status.HTTP_201_CREATED
        )

class LeaveRoomView(APIView):
    permission_classes = (permissions.IsAuthenticated, IsRoomMember)

    def post(self, request, pk, *args, **kwargs):
        room = get_object_or_404(StudyRoom, pk=pk)
        try:
            membership = RoomMember.objects.get(room=room, user=request.user)
        except RoomMember.DoesNotExist:
            return Response({'error': 'You are not a member of this room.'}, status=status.HTTP_400_BAD_REQUEST)

        if membership.role == 'owner':
            owners = RoomMember.objects.filter(room=room, role='owner')
            if owners.count() == 1:
                if RoomMember.objects.filter(room=room).count() == 1:
                    room.delete()
                    return Response({'message': 'Left room. Since you were the only member, the room has been deleted.'}, status=status.HTTP_200_OK)
                else:
                    return Response({'error': 'You are the sole owner. Please delete the room or appoint another owner first.'}, status=status.HTTP_400_BAD_REQUEST)

        membership.delete()
        return Response({'message': 'Successfully left the room.'}, status=status.HTTP_200_OK)

class RoomMembersListView(generics.ListAPIView):
    serializer_class = RoomMemberSerializer
    permission_classes = (permissions.IsAuthenticated, IsRoomMember)

    def get_queryset(self):
        room_id = self.kwargs.get('room_id')
        return RoomMember.objects.filter(room_id=room_id).select_related('user')

class StudySessionStartView(APIView):
    permission_classes = (permissions.IsAuthenticated, IsRoomMember)

    def post(self, request, room_id, *args, **kwargs):
        room = get_object_or_404(StudyRoom, pk=room_id)
        active_session = StudySession.objects.filter(room=room, end_time__isnull=True).exists()
        if active_session:
            return Response({'error': 'There is already an active study session in this room.'}, status=status.HTTP_400_BAD_REQUEST)

        session = StudySession.objects.create(
            room=room,
            started_by=request.user,
            start_time=timezone.now()
        )

        RoomActivity.objects.create(
            room=room,
            user=request.user,
            action='started_session'
        )

        return Response(StudySessionSerializer(session).data, status=status.HTTP_201_CREATED)

class StudySessionEndView(APIView):
    permission_classes = (permissions.IsAuthenticated, IsRoomMember)

    def post(self, request, room_id, *args, **kwargs):
        room = get_object_or_404(StudyRoom, pk=room_id)
        try:
            active_session = StudySession.objects.get(room=room, end_time__isnull=True)
        except StudySession.DoesNotExist:
            return Response({'error': 'No active study session found in this room.'}, status=status.HTTP_400_BAD_REQUEST)

        now = timezone.now()
        active_session.end_time = now
        delta = now - active_session.start_time
        active_session.duration_seconds = int(delta.total_seconds())
        active_session.save()

        RoomActivity.objects.create(
            room=room,
            user=request.user,
            action='ended_session'
        )

        return Response(StudySessionSerializer(active_session).data, status=status.HTTP_200_OK)

class StudySessionListView(generics.ListAPIView):
    serializer_class = StudySessionSerializer
    permission_classes = (permissions.IsAuthenticated, IsRoomMember)

    def get_queryset(self):
        room_id = self.kwargs.get('room_id')
        return StudySession.objects.filter(room_id=room_id, end_time__isnull=False).order_by('-start_time')

class RoomActivityListView(generics.ListAPIView):
    serializer_class = RoomActivitySerializer
    permission_classes = (permissions.IsAuthenticated, IsRoomMember)

    def get_queryset(self):
        room_id = self.kwargs.get('room_id')
        return RoomActivity.objects.filter(room_id=room_id).select_related('user').order_by('-timestamp')


class RoomTaskListView(generics.ListCreateAPIView):
    serializer_class = RoomTaskSerializer
    permission_classes = (permissions.IsAuthenticated, IsRoomMember)

    def get_queryset(self):
        return RoomTask.objects.filter(room_id=self.kwargs['room_id']).order_by('created_at')

    def perform_create(self, serializer):
        room = get_object_or_404(StudyRoom, pk=self.kwargs['room_id'])
        task = serializer.save(room=room, created_by=self.request.user)
        
        # WebSocket broadcast
        channel_layer = get_channel_layer()
        serialized_task = RoomTaskSerializer(task).data
        json_task = to_json_compatible(serialized_task)
        async_to_sync(channel_layer.group_send)(
            f'room_{room.id}',
            {
                'type': 'task_update_broadcast',
                'action': 'created',
                'task': json_task
            }
        )

class RoomTaskToggleView(APIView):
    permission_classes = (permissions.IsAuthenticated, IsRoomMember)

    def post(self, request, room_id, task_id, *args, **kwargs):
        task = get_object_or_404(RoomTask, room_id=room_id, pk=task_id)
        task.is_completed = not task.is_completed
        task.save()

        # WebSocket broadcast
        channel_layer = get_channel_layer()
        serialized_task = RoomTaskSerializer(task).data
        json_task = to_json_compatible(serialized_task)
        async_to_sync(channel_layer.group_send)(
            f'room_{room_id}',
            {
                'type': 'task_update_broadcast',
                'action': 'toggled',
                'task_id': str(task.id),
                'task': json_task
            }
        )
        return Response(json_task, status=status.HTTP_200_OK)

class RoomTaskDetailView(APIView):
    permission_classes = (permissions.IsAuthenticated, IsRoomMember)

    def delete(self, request, room_id, task_id, *args, **kwargs):
        task = get_object_or_404(RoomTask, room_id=room_id, pk=task_id)
        task_id_str = str(task.id)
        task.delete()

        # WebSocket broadcast
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'room_{room_id}',
            {
                'type': 'task_update_broadcast',
                'action': 'deleted',
                'task_id': task_id_str
            }
        )
        return Response({'message': 'Task deleted successfully.'}, status=status.HTTP_204_NO_CONTENT)
