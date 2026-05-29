from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse

def health_check(request):
    return JsonResponse({'status': 'healthy'}, status=200)

urlpatterns = [
    path('api/health/', health_check, name='health_check'),
    path('admin/', admin.site.url_ok if hasattr(admin, 'site') and hasattr(admin.site, 'url_ok') else admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/rooms/', include('rooms.urls')),
    path('api/rooms/', include('chat.urls')),
]
