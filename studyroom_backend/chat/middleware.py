import jwt
from django.conf import settings
from django.contrib.auth.models import AnonymousUser
from channels.db import database_sync_to_async
from urllib.parse import parse_qs

@database_sync_to_async
def get_user_from_token(token_string):
    try:
        from rest_framework_simplejwt.tokens import AccessToken
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        access_token = AccessToken(token_string)
        user_id = access_token['user_id']
        user = User.objects.get(id=user_id)
        print(f"[WS Auth] Successfully authenticated user: {user.username}")
        return user
    except Exception as e:
        print(f"[WS Auth Error] Failed to authenticate token: {e}")
        return AnonymousUser()

class JWTAuthMiddleware:
    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        query_string = scope.get('query_string', b'').decode('utf-8')
        query_params = parse_qs(query_string)
        token = query_params.get('token', [None])[0]

        if token:
            scope['user'] = await get_user_from_token(token)
        else:
            print("[WS Auth Warning] No token provided in WebSocket query string.")
            scope['user'] = AnonymousUser()

        return await self.inner(scope, receive, send)
