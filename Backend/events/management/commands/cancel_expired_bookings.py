from django.core.management.base import BaseCommand
from django.utils import timezone
from django.conf import settings
from datetime import timedelta
from events.models import Booking, Payment
from django.db import transaction

class Command(BaseCommand):
    help = 'Cancels abandoned PENDING bookings and fails associated payment orders.'

    def handle(self, *args, **options):
        timeout_minutes = getattr(settings, 'PAYMENT_TIMEOUT_MINUTES', 15)
        cutoff_time = timezone.now() - timedelta(minutes=timeout_minutes)
        
        expired_bookings = Booking.objects.filter(
            status=Booking.Status.PENDING,
            created_at__lt=cutoff_time
        )
        
        count = 0
        for booking in expired_bookings:
            with transaction.atomic():
                # Lock the booking to prevent race conditions
                try:
                    locked_booking = Booking.objects.select_for_update(nowait=True).get(id=booking.id)
                except Exception:
                    # Skip if locked by another process (like a webhook verifying payment right now)
                    continue
                    
                if locked_booking.status != Booking.Status.PENDING:
                    continue
                    
                # Mark associated payments as failed
                Payment.objects.filter(
                    booking=locked_booking,
                    status__in=[Payment.Status.CREATED, Payment.Status.PENDING]
                ).update(status=Payment.Status.FAILED)
                
                # Cancel the booking
                locked_booking.status = Booking.Status.CANCELLED
                locked_booking.save()
                
                # Send cancellation notification
                from events.services.notification_service import send_booking_cancelled_notification, send_organizer_booking_notification
                send_booking_cancelled_notification(locked_booking)
                send_organizer_booking_notification(locked_booking, Notification.NotificationType.BOOKING_CANCELLED)
                
                count += 1
                
        self.stdout.write(self.style.SUCCESS(f'Successfully cancelled {count} expired booking(s).'))
