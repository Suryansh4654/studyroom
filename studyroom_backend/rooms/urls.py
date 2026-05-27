from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RoomViewSet, JoinRoomView, LeaveRoomView, RoomMembersListView,
    StudySessionStartView, StudySessionEndView, StudySessionListView,
    RoomActivityListView
)

router = DefaultRouter()
router.register('', RoomViewSet, basename='room')

urlpatterns = [
    path('join/', JoinRoomView.as_view(), name='room_join'),
    path('<uuid:pk>/leave/', LeaveRoomView.as_view(), name='room_leave'),
    path('<uuid:room_id>/members/', RoomMembersListView.as_view(), name='room_members'),
    path('<uuid:room_id>/sessions/start/', StudySessionStartView.as_view(), name='session_start'),
    path('<uuid:room_id>/sessions/end/', StudySessionEndView.as_view(), name='session_end'),
    path('<uuid:room_id>/sessions/', StudySessionListView.as_view(), name='session_list'),
    path('<uuid:room_id>/activity/', RoomActivityListView.as_view(), name='room_activity'),
    path('', include(router.urls)),
]
