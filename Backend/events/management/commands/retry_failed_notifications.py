from django.core.management.base import BaseCommand
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from events.models import Notification

class Command(BaseCommand):
    help = 'Retries failed email notifications up to a maximum limit.'

    def handle(self, *args, **options):
        max_retries = getattr(settings, 'NOTIFICATION_MAX_RETRIES', 3)
        
        failed_notifications = Notification.objects.filter(
            status=Notification.Status.FAILED,
            channel=Notification.Channel.EMAIL,
            retry_count__lt=max_retries
        )
        
        count = 0
        success_count = 0
        
        for notification in failed_notifications:
            count += 1
            notification.retry_count += 1
            
            try:
                send_mail(
                    subject=notification.subject,
                    message=notification.message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[notification.user.email],
                    fail_silently=False,
                )
                
                notification.status = Notification.Status.SENT
                notification.sent_at = timezone.now()
                success_count += 1
                self.stdout.write(self.style.SUCCESS(f"Successfully retried notification ID: {notification.id}"))
                
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"Retry failed for notification ID: {notification.id}. Error: {str(e)}"))
                
            finally:
                notification.save(update_fields=['status', 'sent_at', 'retry_count'])
                
        self.stdout.write(self.style.SUCCESS(f'Processed {count} failed notification(s). {success_count} succeeded.'))
