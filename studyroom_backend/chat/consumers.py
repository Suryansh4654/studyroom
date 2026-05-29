import json
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser

def to_json_compatible(data):
    """
    Recursively converts non-serializable objects (like UUIDs and datetimes)
    to strings so they are 100% safe for standard JSON encoding.
    """
    if isinstance(data, dict):
        return {k: to_json_compatible(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [to_json_compatible(v) for v in data]
    elif hasattr(data, 'hex'):  # UUID check
        return str(data)
    elif hasattr(data, 'isoformat'):  # datetime check
        return data.isoformat()
    return data

class RoomConsumer(AsyncJsonWebsocketConsumer):
    # Class-level dictionary to track online users across connections
    # Format: { room_id: { user_id_str: { "username": "...", "count": N } } }
    online_users = {}

    async def connect(self):
        try:
            self.room_id = str(self.scope['url_route']['kwargs']['room_id'])
            self.room_group_name = f'room_{self.room_id}'
            self.user = self.scope.get('user')

            print(f"[WS Connect] User {self.user} is attempting to connect to room {self.room_id}")

            # 1. Reject unauthenticated connections
            if not self.user or self.user.is_anonymous:
                print(f"[WS Connection Rejected] User is anonymous or missing in room {self.room_id}")
                await self.close(code=4001) # custom close code for Unauthenticated
                return

            # 2. Reject non-member connections
            if not await self.is_member(self.user, self.room_id):
                print(f"[WS Connection Rejected] User {self.user.username} is NOT a member of room {self.room_id}")
                await self.close(code=4003) # custom close code for Forbidden
                return

            # 3. Accept connection and add to group
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
            await self.accept()
            print(f"[WS Connected] User {self.user.username} successfully connected to room {self.room_id}")

            # 4. Track online status
            user_id_str = str(self.user.id)
            if self.room_id not in RoomConsumer.online_users:
                RoomConsumer.online_users[self.room_id] = {}
            
            if user_id_str not in RoomConsumer.online_users[self.room_id]:
                RoomConsumer.online_users[self.room_id][user_id_str] = {
                    'username': self.user.username,
                    'count': 1
                }
                # Log connection activity when user joins
                activity_data = await self.log_activity(self.room_id, self.user, 'joined')
                if activity_data:
                    await self.channel_layer.group_send(
                        self.room_group_name,
                        {
                            'type': 'activity_broadcast',
                            'activity': activity_data
                        }
                    )
            else:
                RoomConsumer.online_users[self.room_id][user_id_str]['count'] += 1

            # 5. Broadcast updated online list
            await self.broadcast_online_users()
        except Exception as e:
            print(f"[WS Connect Error] Exception occurred in connect: {e}")
            await self.close(code=4000)

    async def disconnect(self, close_code):
        try:
            if not hasattr(self, 'room_group_name'):
                return

            print(f"[WS Disconnect] User {self.user.username if hasattr(self, 'user') and not self.user.is_anonymous else 'Anonymous'} is disconnecting from room {self.room_id} (code: {close_code})")

            # Leave group
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

            # Track offline status
            user_id_str = str(self.user.id)
            if self.room_id in RoomConsumer.online_users and user_id_str in RoomConsumer.online_users[self.room_id]:
                RoomConsumer.online_users[self.room_id][user_id_str]['count'] -= 1
                if RoomConsumer.online_users[self.room_id][user_id_str]['count'] <= 0:
                    del RoomConsumer.online_users[self.room_id][user_id_str]
                    
                    # Log disconnection activity when user fully leaves
                    activity_data = await self.log_activity(self.room_id, self.user, 'left')
                    if activity_data:
                        await self.channel_layer.group_send(
                            self.room_group_name,
                            {
                                'type': 'activity_broadcast',
                                'activity': activity_data
                            }
                        )

            # Broadcast updated online list
            await self.broadcast_online_users()
        except Exception as e:
            print(f"[WS Disconnect Error] Exception occurred in disconnect: {e}")

    async def receive_json(self, content):
        try:
            event_type = content.get('type')
            print(f"[WS Receive] Event '{event_type}' received from user {self.user.username} in room {self.room_id}")

            if event_type == 'chat.message':
                message_text = content.get('message', '').strip()
                if message_text:
                    serialized_msg = await self.save_chat_message(self.room_id, self.user, message_text)
                    await self.channel_layer.group_send(
                        self.room_group_name,
                        {
                            'type': 'chat_message_broadcast',
                            'message': serialized_msg
                        }
                    )
            elif event_type == 'session.start':
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'session_update_broadcast',
                        'action': 'started'
                    }
                )
            elif event_type == 'session.end':
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'session_update_broadcast',
                        'action': 'ended'
                    }
                )
        except Exception as e:
            print(f"[WS Receive Error] Exception inside receive_json: {e}")

    # --- Group Broadcast Receivers ---

    async def chat_message_broadcast(self, event):
        await self.send_json({
            'type': 'chat.message',
            'message': event['message']
        })

    async def session_update_broadcast(self, event):
        await self.send_json({
            'type': 'session.update',
            'action': event['action']
        })

    async def activity_broadcast(self, event):
        await self.send_json({
            'type': 'activity.update',
            'activity': event['activity']
        })

    async def user_status_broadcast(self, event):
        await self.send_json({
            'type': 'user.status',
            'online_users': event['online_users']
        })

    async def task_update_broadcast(self, event):
        await self.send_json({
            'type': 'task.update',
            'action': event['action'],
            'task': event.get('task'),
            'task_id': event.get('task_id')
        })

    # --- Helper methods ---

    async def broadcast_online_users(self):
        online_list = []
        if self.room_id in RoomConsumer.online_users:
            online_list = [info['username'] for info in RoomConsumer.online_users[self.room_id].values()]

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'user_status_broadcast',
                'online_users': online_list
            }
        )

    @database_sync_to_async
    def is_member(self, user, room_id):
        from rooms.models import RoomMember
        return RoomMember.objects.filter(room_id=room_id, user=user).exists()

    @database_sync_to_async
    def log_activity(self, room_id, user, action):
        from rooms.models import StudyRoom, RoomActivity
        from rooms.serializers import RoomActivitySerializer
        try:
            room = StudyRoom.objects.get(id=room_id)
            activity = RoomActivity.objects.create(room=room, user=user, action=action)
            # Standardize UUIDs/Datetimes to string primitives
            return to_json_compatible(RoomActivitySerializer(activity).data)
        except Exception as e:
            print(f"[WS Log Activity Error] Failed to log activity {action}: {e}")
            return None

    @database_sync_to_async
    def save_chat_message(self, room_id, user, message_text):
        from rooms.models import StudyRoom
        from chat.models import ChatMessage
        from chat.serializers import ChatMessageSerializer
        room = StudyRoom.objects.get(id=room_id)
        msg = ChatMessage.objects.create(room=room, sender=user, message=message_text)
        # Standardize UUIDs/Datetimes to string primitives
        return to_json_compatible(ChatMessageSerializer(msg).data)
