from django.urls import path
from .views import ChatMessageListView

urlpatterns = [
    path('<uuid:room_id>/messages/', ChatMessageListView.as_view(), name='chat_messages'),
]
