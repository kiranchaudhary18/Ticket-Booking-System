from django.core.management.base import BaseCommand
from django.utils import timezone
from events.models import SeatLock

class Command(BaseCommand):
    help = 'Cleans up expired seat locks from the database.'

    def handle(self, *args, **options):
        now = timezone.now()
        expired_locks = SeatLock.objects.filter(expires_at__lte=now)
        count = expired_locks.count()
        
        if count > 0:
            expired_locks.delete()
            self.stdout.write(self.style.SUCCESS(f'Successfully deleted {count} expired seat lock(s).'))
        else:
            self.stdout.write(self.style.SUCCESS('No expired seat locks found.'))
