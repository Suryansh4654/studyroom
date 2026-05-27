from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.url_ok if hasattr(admin, 'site') and hasattr(admin.site, 'url_ok') else admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/rooms/', include('rooms.urls')),
    path('api/rooms/', include('chat.urls')),
]
