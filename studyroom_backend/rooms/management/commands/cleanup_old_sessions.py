from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from rooms.models import StudySession, RoomActivity

class Command(BaseCommand):
    help = 'Clean up dangling study sessions that were left open for more than 12 hours'

    def handle(self, *args, **options):
        threshold = timezone.now() - timedelta(hours=12)
        dangling_sessions = StudySession.objects.filter(end_time__isnull=True, start_time__lt=threshold)
        
        count = dangling_sessions.count()
        if count == 0:
            self.stdout.write(self.style.SUCCESS('No dangling sessions found.'))
            return

        self.stdout.write(f'Found {count} dangling sessions. Cleaning up...')

        for session in dangling_sessions:
            # Auto-close after 2 hours from start, or at current threshold
            auto_end_time = session.start_time + timedelta(hours=2)
            session.end_time = auto_end_time
            session.duration_seconds = int((auto_end_time - session.start_time).total_seconds())
            session.save()

            # Log cleanup activity
            RoomActivity.objects.create(
                room=session.room,
                user=session.started_by,
                action='ended_session'
            )
            self.stdout.write(f'Closed session {session.id} in room {session.room.name}')

        self.stdout.write(self.style.SUCCESS(f'Successfully cleaned up {count} dangling sessions.'))
