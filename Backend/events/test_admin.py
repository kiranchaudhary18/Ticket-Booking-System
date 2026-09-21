from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal

from events.models import Category, Event, Show, Venue, Seat, Booking, BookingItem, Payment, Ticket
from accounts.models import Role

User = get_user_model()

class AdminTests(TestCase):
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
        self.admin = User.objects.create_user(
            email="admin@example.com",
            password="password123",
            first_name="Admin",
            last_name="User",
            role=Role.ADMIN,
            is_staff=True,
            is_superuser=True
        )

        self.category = Category.objects.create(name="Music", description="Live Music")
        self.venue = Venue.objects.create(
            name="Main Arena",
            address="123 Street",
            city="City",
            state="State",
            pincode="123456",
            capacity=100,
            organizer=self.organizer
        )
        self.event = Event.objects.create(
            title="Concert",
            description="A great concert",
            category=self.category,
            venue=self.venue,
            organizer=self.organizer,
            status=Event.Status.PUBLISHED,
            start_date=timezone.now() + timedelta(days=1),
            end_date=timezone.now() + timedelta(days=2)
        )
        self.show = Show.objects.create(
            event=self.event,
            show_date=timezone.now().date() + timedelta(days=1),
            start_time=(timezone.now() + timedelta(hours=1)).time(),
            end_time=(timezone.now() + timedelta(hours=3)).time()
        )
        self.seat = Seat.objects.create(
            venue=self.venue,
            row="A",
            seat_number="1",
            price=Decimal("100.00")
        )

        # Booking
        self.booking = Booking.objects.create(
            customer=self.customer,
            show=self.show,
            booking_reference="REF123",
            total_amount=Decimal("100.00"),
            status=Booking.Status.CONFIRMED
        )
        BookingItem.objects.create(booking=self.booking, seat=self.seat, price=Decimal("100.00"))

        # Payment successful
        self.payment = Payment.objects.create(
            booking=self.booking,
            gateway_order_id="order_123",
            amount=Decimal("100.00"),
            status=Payment.Status.SUCCESS
        )

        # Payment failed
        self.payment_failed = Payment.objects.create(
            booking=self.booking,
            gateway_order_id="order_456",
            amount=Decimal("100.00"),
            status=Payment.Status.FAILED
        )

        # Ticket
        self.ticket = Ticket.objects.create(
            booking=self.booking,
            ticket_number="TICKET123",
            status=Ticket.Status.ACTIVE
        )

    def test_admin_can_access_dashboard(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse("events:admin_statistics")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIn("overview", data)
        self.assertEqual(data["overview"]["users"], 3)

    def test_customer_cannot_access_dashboard(self):
        self.client.force_authenticate(user=self.customer)
        url = reverse("events:admin_statistics")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_organizer_cannot_access_dashboard(self):
        self.client.force_authenticate(user=self.organizer)
        url = reverse("events:admin_statistics")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_rejected(self):
        url = reverse("events:admin_statistics")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_admin_users_list_and_filter(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse("accounts:admin_user_list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Test password never returned
        results = response.json().get('results', [])
        for user_data in results:
            self.assertNotIn("password", user_data)
            
        # Test filter
        response = self.client.get(url, {"role": "CUSTOMER"})
        self.assertEqual(len(response.json()['results']), 1)
        self.assertEqual(response.json()['results'][0]['email'], "customer@example.com")

    def test_admin_events_list_and_filter(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse("events:admin_event_list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        response = self.client.get(url, {"status": "PUBLISHED"})
        self.assertEqual(len(response.json()['results']), 1)

    def test_admin_event_invalid_status_change(self):
        self.client.force_authenticate(user=self.admin)
        self.event.status = Event.Status.DRAFT
        self.event.title = ""  # Invalid title
        self.event.save()
        
        url = reverse("events:admin_event_detail", args=[self.event.id])
        response = self.client.patch(url, {"status": "PUBLISHED"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_bookings_list_and_filter(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse("events:admin_booking_list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        response = self.client.get(url, {"status": "CONFIRMED"})
        self.assertEqual(len(response.json()['results']), 1)

    def test_historical_booking_preserved(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse("events:admin_booking_detail", args=[self.booking.id])
        response = self.client.delete(url)
        # Should be 405 Method Not Allowed because RetrieveAPIView doesn't have destroy
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_revenue_counts_only_successful(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse("events:admin_revenue_report")
        response = self.client.get(url)
        data = response.json()
        
        self.assertEqual(data["summary"]["successful_payment_count"], 1)
        self.assertEqual(data["summary"]["failed_payment_count"], 1)
        # Revenue should only count the 100.00 from successful payment
        self.assertEqual(float(data["summary"]["total_revenue"]), 100.0)

    def test_revenue_date_filter(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse("events:admin_revenue_report")
        # Ensure filter doesn't break
        response = self.client.get(url, {"start_date": "2020-01-01", "end_date": "2030-01-01"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_ticket_statistics_no_qr(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse("events:admin_ticket_report")
        response = self.client.get(url)
        data = response.json()
        self.assertEqual(data["summary"]["total_tickets"], 1)
        self.assertEqual(data["summary"]["active_tickets"], 1)
        
        # Ensure no QR code leaks in events list
        for ev in data.get("by_event", []):
            self.assertNotIn("qr_code", ev)

    def test_event_wise_statistics(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse("events:admin_event_report")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.json().get('results', [])
        self.assertEqual(len(results), 1)
        
        evt = results[0]
        self.assertEqual(evt["total_shows"], 1)
        self.assertEqual(evt["booked_seats"], 1)
        self.assertEqual(evt["confirmed_bookings"], 1)
        self.assertEqual(float(evt["successful_revenue"]), 100.0)
