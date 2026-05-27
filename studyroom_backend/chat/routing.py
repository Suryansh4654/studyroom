from django.urls import re_path, path
from .consumers import RoomConsumer

websocket_urlpatterns = [
    # Route matching /ws/room/<room_id>/
    path('ws/room/<uuid:room_id>/', RoomConsumer.as_asgi()),
]
