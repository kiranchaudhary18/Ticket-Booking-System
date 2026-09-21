from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from django.core import mail
from django.utils import timezone
from datetime import timedelta
from unittest.mock import patch

from events.models import Category, Event, Show, Venue, Seat, Booking, Payment, Ticket, Notification
from accounts.models import Role
from django.core.management import call_command

User = get_user_model()

class NotificationTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.customer = User.objects.create_user(
            email="customer@example.com",
            password="password123",
            first_name="Customer",
            last_name="User",
            role=Role.CUSTOMER
        )
        self.organizer = User.objects.create_user(
            email="organizer@example.com",
            password="password123",
            first_name="Organizer",
            last_name="User",
            role=Role.ORGANIZER
        )
        self.other_customer = User.objects.create_user(
            email="other@example.com",
            password="password123",
            first_name="Other",
            last_name="Customer",
            role=Role.CUSTOMER
        )
        
        self.category = Category.objects.create(name="Music")
        self.venue = Venue.objects.create(name="Arena", address="123", capacity=100)
        self.event = Event.objects.create(
            title="Concert",
            description="A concert",
            category=self.category,
            organizer=self.organizer,
            venue=self.venue,
            duration_minutes=120,
            status=Event.Status.PUBLISHED
        )
        self.show = Show.objects.create(
            event=self.event,
            show_date=timezone.now().date() + timedelta(days=5),
            start_time="18:00:00",
            end_time="20:00:00"
        )
        self.seat = Seat.objects.create(
            venue=self.venue,
            row="A",
            seat_number="1",
            category=Seat.Category.VIP,
            price_multiplier=1.0,
            base_price=100.00
        )
        
        self.booking = Booking.objects.create(
            customer=self.customer,
            show=self.show,
            total_amount=100.00,
            status=Booking.Status.PENDING
        )
        self.booking_item = self.booking.items.create(
            seat=self.seat,
            price=100.00
        )

    def test_notification_created_correctly(self):
        notification = Notification.objects.create(
            user=self.customer,
            notification_type=Notification.NotificationType.BOOKING_CREATED,
            subject="Test",
            message="Message",
            related_booking=self.booking
        )
        self.assertEqual(notification.status, Notification.Status.PENDING)
        self.assertIsNotNone(notification.created_at)

    def test_notification_status_changes_correctly(self):
        notification = Notification.objects.create(
            user=self.customer,
            notification_type=Notification.NotificationType.BOOKING_CREATED,
            subject="Test",
            message="Message",
            related_booking=self.booking
        )
        notification.status = Notification.Status.SENT
        notification.sent_at = timezone.now()
        notification.save()
        self.assertEqual(notification.status, Notification.Status.SENT)
        self.assertIsNotNone(notification.sent_at)

    def test_booking_confirmation_email_created(self):
        # Trigger booking creation via API to test integration
        self.client.force_authenticate(user=self.customer)
        response = self.client.post(reverse("events:booking_create"), {
            "show": self.show.id,
            "seat_ids": [self.seat.id]
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Check that customer and organizer notifications are created
        self.assertTrue(Notification.objects.filter(user=self.customer, notification_type=Notification.NotificationType.BOOKING_CREATED).exists())
        self.assertTrue(Notification.objects.filter(user=self.organizer, notification_type=Notification.NotificationType.BOOKING_CREATED).exists())
        
        # Email is sent via signal/service so length should be > 0 (depends on backend, but we have console or locmem in tests)
        self.assertGreater(len(mail.outbox), 0)

    def test_duplicate_booking_event_does_not_create_duplicate_notification(self):
        from events.services.notification_service import send_notification
        # Simulate creating the notification twice
        notif1 = send_notification(self.customer, Notification.NotificationType.BOOKING_CREATED, "Sub", "Msg", self.booking)
        
        # In actual flow, it is checked with `.exists()`. Let's mock the actual function.
        from events.serializers import BookingCreateSerializer
        # We manually test the idempotency function wrapper if exists
        from events.services.notification_service import send_organizer_booking_notification
        
        send_organizer_booking_notification(self.booking, Notification.NotificationType.BOOKING_CREATED)
        count_before = Notification.objects.filter(user=self.organizer, notification_type=Notification.NotificationType.BOOKING_CREATED).count()
        send_organizer_booking_notification(self.booking, Notification.NotificationType.BOOKING_CREATED)
        count_after = Notification.objects.filter(user=self.organizer, notification_type=Notification.NotificationType.BOOKING_CREATED).count()
        
        self.assertEqual(count_before, 1)
        self.assertEqual(count_after, 1)

    def test_successful_verified_payment_creates_payment_notification(self):
        from events.services.notification_service import send_payment_success_notification
        payment = Payment.objects.create(booking=self.booking, amount=100, status=Payment.Status.PENDING)
        send_payment_success_notification(self.booking, payment)
        self.assertTrue(Notification.objects.filter(user=self.customer, notification_type=Notification.NotificationType.PAYMENT_SUCCESS).exists())

    def test_failed_payment_does_not_create_success_notification(self):
        payment = Payment.objects.create(booking=self.booking, amount=100, status=Payment.Status.FAILED)
        self.assertFalse(Notification.objects.filter(user=self.customer, notification_type=Notification.NotificationType.PAYMENT_SUCCESS).exists())

    def test_ticket_generation_creates_ticket_notification(self):
        from events.services.notification_service import send_ticket_issued_notification
        self.booking.status = Booking.Status.CONFIRMED
        self.booking.save()
        ticket = Ticket.generate_ticket(self.booking)
        send_ticket_issued_notification(ticket)
        self.assertTrue(Notification.objects.filter(user=self.customer, notification_type=Notification.NotificationType.TICKET_ISSUED).exists())

    def test_duplicate_ticket_generation_does_not_send_duplicate_notification(self):
        self.booking.status = Booking.Status.CONFIRMED
        self.booking.save()
        ticket = Ticket.generate_ticket(self.booking)
        from events.services.notification_service import send_ticket_issued_notification
        send_ticket_issued_notification(ticket)
        count_before = Notification.objects.filter(user=self.customer, notification_type=Notification.NotificationType.TICKET_ISSUED).count()
        send_ticket_issued_notification(ticket)
        count_after = Notification.objects.filter(user=self.customer, notification_type=Notification.NotificationType.TICKET_ISSUED).count()
        self.assertEqual(count_before, 1)
        self.assertEqual(count_after, 1)

    def test_booking_cancellation_creates_cancellation_notification(self):
        self.client.force_authenticate(user=self.customer)
        response = self.client.post(reverse("events:booking_cancel", kwargs={'booking_reference': self.booking.booking_reference}))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(Notification.objects.filter(user=self.customer, notification_type=Notification.NotificationType.BOOKING_CANCELLED).exists())
        self.assertTrue(Notification.objects.filter(user=self.organizer, notification_type=Notification.NotificationType.BOOKING_CANCELLED).exists())

    def test_user_sees_only_own_notifications(self):
        Notification.objects.create(user=self.customer, notification_type=Notification.NotificationType.BOOKING_CREATED, subject="S1", message="M1")
        Notification.objects.create(user=self.organizer, notification_type=Notification.NotificationType.BOOKING_CREATED, subject="S2", message="M2")
        
        self.client.force_authenticate(user=self.customer)
        response = self.client.get(reverse("events:notification_list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['subject'], "S1")

    def test_user_cannot_access_another_users_notifications(self):
        Notification.objects.create(user=self.customer, notification_type=Notification.NotificationType.BOOKING_CREATED, subject="S1", message="M1")
        
        self.client.force_authenticate(user=self.other_customer)
        response = self.client.get(reverse("events:notification_list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 0)

    def test_unauthenticated_notification_api_is_rejected(self):
        response = self.client.get(reverse("events:notification_list"))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    @patch('events.services.notification_service.send_mail')
    def test_failed_email_becomes_failed(self, mock_send_mail):
        mock_send_mail.side_effect = Exception("SMTP Error")
        from events.services.notification_service import send_notification
        notification = send_notification(self.customer, Notification.NotificationType.BOOKING_CREATED, "Sub", "Msg")
        self.assertEqual(notification.status, Notification.Status.FAILED)

    @patch('events.management.commands.retry_failed_notifications.send_mail')
    def test_failed_notification_can_be_retried(self, mock_send_mail):
        notification = Notification.objects.create(user=self.customer, status=Notification.Status.FAILED, channel=Notification.Channel.EMAIL, subject="Sub", message="Msg")
        call_command('retry_failed_notifications')
        notification.refresh_from_db()
        self.assertEqual(notification.status, Notification.Status.SENT)
        self.assertEqual(notification.retry_count, 1)
        mock_send_mail.assert_called_once()

    @patch('events.management.commands.retry_failed_notifications.send_mail')
    def test_successfully_sent_notification_is_not_retried(self, mock_send_mail):
        notification = Notification.objects.create(user=self.customer, status=Notification.Status.SENT, channel=Notification.Channel.EMAIL, subject="Sub", message="Msg")
        call_command('retry_failed_notifications')
        mock_send_mail.assert_not_called()

    @patch('events.management.commands.retry_failed_notifications.send_mail')
    def test_maximum_retry_limit_is_respected(self, mock_send_mail):
        notification = Notification.objects.create(user=self.customer, status=Notification.Status.FAILED, channel=Notification.Channel.EMAIL, retry_count=3, subject="Sub", message="Msg")
        call_command('retry_failed_notifications')
        mock_send_mail.assert_not_called()
