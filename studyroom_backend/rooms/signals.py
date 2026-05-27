from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import RoomMember, RoomActivity, StudySession

@receiver(post_save, sender=RoomMember)
def log_member_join(sender, instance, created, **kwargs):
    if created:
        RoomActivity.objects.create(
            room=instance.room,
            user=instance.user,
            action='joined'
        )

@receiver(post_delete, sender=RoomMember)
def log_member_leave(sender, instance, **kwargs):
    RoomActivity.objects.create(
        room=instance.room,
        user=instance.user,
        action='left'
    )
