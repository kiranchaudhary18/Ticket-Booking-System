from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator, RegexValidator
from decimal import Decimal
from django.db import models
from django.db.models.functions import Lower
from django.core.files.base import ContentFile
from io import BytesIO
import uuid
import qrcode

from accounts.models import Role

# Pincode: exactly 6 digits, first digit 1-9 (Indian pincode format).
indian_pincode_validator = RegexValidator(
    regex=r"^[1-9]\d{5}$",
    message="Enter a valid 6-digit Indian pincode (e.g. 560001).",
)


class Category(models.Model):
    """Event category (e.g. Music, Sports, Theatre).

    Rules:
    - ``name`` is required and unique (case-insensitive: "Music" and
      "MUSIC" are treated as the same category).
    - ``description`` is optional.
    - ``is_active`` defaults to True so new categories are usable
      immediately; inactive categories are hidden from public flows.
    """

    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            # Case-insensitive uniqueness for the category name.
            models.UniqueConstraint(
                Lower("name"),
                name="unique_category_name_case_insensitive",
            ),
        ]

    def save(self, *args, **kwargs):
        # Normalise: strip surrounding whitespace before persisting.
        self.name = self.name.strip()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Venue(models.Model):
    """Event venue owned by an ORGANIZER user.

    Rules:
    - ``organizer`` must be a user whose role is ORGANIZER; CUSTOMER
      (and ADMIN) users can never own a Venue. Enforced in ``save()``
      and surfaced to the admin/forms via ``limit_choices_to``.
    - ``name``, ``address``, ``city`` and ``state`` are required.
    - ``description`` is optional.
    - ``pincode`` must be a valid 6-digit Indian pincode.
    - ``capacity`` must be a positive integer.
    - ``is_active`` defaults to True; inactive venues are hidden from
      public flows.
    """

    class VenueType(models.TextChoices):
        INDOOR = "INDOOR", "Indoor"
        OUTDOOR = "OUTDOOR", "Outdoor"
        VIRTUAL = "VIRTUAL", "Virtual"
        OTHER = "OTHER", "Other"

    organizer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="venues",
        limit_choices_to={"role": Role.ORGANIZER},
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    address = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    pincode = models.CharField(
        max_length=10,
        validators=[indian_pincode_validator],
    )
    capacity = models.PositiveIntegerField(
        validators=[MinValueValidator(1)],
    )
    venue_type = models.CharField(
        max_length=20,
        choices=VenueType.choices,
        blank=True,
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def clean(self):
        if self.name is not None:
            self.name = self.name.strip()
        super().clean()

    def save(self, *args, **kwargs):
        # Guard: only ORGANIZER users may own a Venue (never CUSTOMER).
        if self.organizer_id and self.organizer.role != Role.ORGANIZER:
            raise ValueError("Only ORGANIZER users can own a Venue.")
        self.name = self.name.strip()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.city})"


class EventTicketSequence(models.Model):
    event = models.OneToOneField(
        "Event",
        on_delete=models.CASCADE,
        related_name="ticket_sequence",
    )
    last_sequence = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"Sequence for {self.event.event_code or self.event.id}: {self.last_sequence}"


class Event(models.Model):
    """Event listed by an ORGANIZER user.

    Rules:
    - ``organizer`` must be a user whose role is ORGANIZER; CUSTOMER
      (and ADMIN) users can never own an Event. Enforced in ``save()``
      and surfaced to the admin/forms via ``limit_choices_to``.
    - ``category`` must reference an existing Category.
    - ``venue`` must reference an existing Venue.
    - ``title`` is required; ``description`` is required.
    - ``start_date`` must be before ``end_date`` (enforced in ``clean()``).
    - ``status`` defaults to DRAFT; ``is_active`` defaults to True.
    """

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        PUBLISHED = "PUBLISHED", "Published"
        CANCELLED = "CANCELLED", "Cancelled"

    organizer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="events",
        limit_choices_to={"role": Role.ORGANIZER},
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.CASCADE,
        related_name="events",
    )
    venue = models.ForeignKey(
        Venue,
        on_delete=models.CASCADE,
        related_name="events",
    )
    event_code = models.CharField(max_length=10, unique=True, null=True, blank=True)
    title = models.CharField(max_length=255)
    description = models.TextField()
    event_image = models.URLField(
        max_length=500,
        null=True,
        blank=True,
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
    )
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    age_limit = models.PositiveIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1)],
    )
    language = models.CharField(max_length=50, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def clean(self):
        if self.title is not None:
            self.title = self.title.strip()
        super().clean()
        # start_date must be before end_date.
        if self.start_date and self.end_date and self.start_date >= self.end_date:
            raise ValidationError(
                {"end_date": "end_date must be later than start_date."}
            )

    def save(self, *args, **kwargs):
        # Guard: only ORGANIZER users may own an Event (never CUSTOMER).
        if self.organizer_id and self.organizer.role != Role.ORGANIZER:
            raise ValueError("Only ORGANIZER users can own an Event.")
        self.title = self.title.strip()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title


class Show(models.Model):
    """A scheduled performance or instance of an Event.
    
    Rules:
    - Must belong to an existing Event.
    - Cannot be created/updated for a CANCELLED event.
    - start_time must be before end_time.
    """

    event = models.ForeignKey(
        Event,
        on_delete=models.CASCADE,
        related_name="shows",
    )
    show_date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["show_date", "start_time"]

    def clean(self):
        super().clean()
        if self.start_time and self.end_time and self.start_time >= self.end_time:
            raise ValidationError(
                {"end_time": "end_time must be later than start_time."}
            )
        
        if self.event_id:
            # We use event_id to prevent hitting the DB if event isn't assigned
            if self.event.status == Event.Status.CANCELLED:
                raise ValidationError(
                    {"event": "Cannot create or update a show for a cancelled event."}
                )

    def save(self, *args, **kwargs):
        # We enforce the CANCELLED event rule on save() to be robust.
        if self.event_id and self.event.status == Event.Status.CANCELLED:
            raise ValueError("Cannot create or update a show for a cancelled event.")
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.event.title} on {self.show_date} at {self.start_time}"


class Seat(models.Model):
    class SeatType(models.TextChoices):
        REGULAR = "REGULAR", "Regular"
        PREMIUM = "PREMIUM", "Premium"
        VIP = "VIP", "VIP"

    venue = models.ForeignKey(Venue, on_delete=models.CASCADE, related_name="seats")
    row = models.CharField(max_length=10)
    seat_number = models.CharField(max_length=10)
    seat_type = models.CharField(
        max_length=20,
        choices=SeatType.choices,
        default=SeatType.REGULAR
    )
    price = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        validators=[MinValueValidator(Decimal("0.00"))]
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["venue", "row", "seat_number"],
                name="unique_venue_row_seat"
            )
        ]

    def __str__(self):
        return f"{self.venue.name} - {self.row}{self.seat_number} ({self.seat_type})"


class EventSeatConfiguration(models.Model):
    """Event-specific seat configuration overriding the default Seat properties."""
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="seat_configurations")
    seat = models.ForeignKey(Seat, on_delete=models.CASCADE, related_name="event_configurations")
    seat_type = models.CharField(max_length=20, choices=Seat.SeatType.choices)
    price = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        validators=[MinValueValidator(Decimal("0.00"))]
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["event", "seat"],
                name="unique_event_seat_configuration"
            )
        ]

    def clean(self):
        super().clean()
        if self.event_id and self.seat_id:
            if self.event.venue != self.seat.venue:
                raise ValidationError({"seat": "Seat must belong to the event's venue."})

    def save(self, *args, **kwargs):
        if self.event_id and self.seat_id:
            if self.event.venue != self.seat.venue:
                raise ValueError("Seat must belong to the event's venue.")
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.event.title} - {self.seat.row}{self.seat.seat_number} ({self.seat_type})"


class Wishlist(models.Model):
    """Customer's wishlist for an Event."""
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="wishlists",
        limit_choices_to={"role": Role.CUSTOMER},
    )
    event = models.ForeignKey(
        Event,
        on_delete=models.CASCADE,
        related_name="wishlisted_by",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["customer", "event"],
                name="unique_customer_event_wishlist"
            )
        ]

    def save(self, *args, **kwargs):
        if self.customer_id and self.customer.role != Role.CUSTOMER:
            raise ValueError("Only CUSTOMER users can have wishlist entries.")
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.customer.email} - {self.event.title}"


class Booking(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        CONFIRMED = "CONFIRMED", "Confirmed"
        CANCELLED = "CANCELLED", "Cancelled"

    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="bookings",
        limit_choices_to={"role": Role.CUSTOMER},
    )
    show = models.ForeignKey(
        Show,
        on_delete=models.PROTECT,
        related_name="bookings",
    )
    booking_reference = models.CharField(max_length=100, unique=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    total_amount = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))]
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if self.customer_id and self.customer.role != Role.CUSTOMER:
            raise ValueError("Only CUSTOMER users can make a booking.")
        if not self.booking_reference:
            self.booking_reference = str(uuid.uuid4()).upper().replace("-", "")[:12]
        super().save(*args, **kwargs)

    def update_total_amount(self):
        from django.db.models import Sum
        total = self.items.aggregate(total=Sum('price'))['total'] or Decimal('0.00')
        self.total_amount = total
        self.save(update_fields=['total_amount', 'updated_at'])

    def __str__(self):
        return f"{self.booking_reference} - {self.customer.email}"


class BookingItem(models.Model):
    booking = models.ForeignKey(
        Booking,
        on_delete=models.CASCADE,
        related_name="items",
    )
    seat = models.ForeignKey(
        Seat,
        on_delete=models.PROTECT,
        related_name="booking_items",
    )
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))]
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def clean(self):
        super().clean()
        if self.booking_id and self.seat_id:
            if self.seat.venue != self.booking.show.event.venue:
                raise ValidationError({"seat": "Seat must belong to the same venue as the show."})

    def save(self, *args, **kwargs):
        if self.booking_id and self.seat_id:
            if self.seat.venue != self.booking.show.event.venue:
                raise ValueError("Seat must belong to the same venue as the show.")
            
        if self.pk is None and self.seat_id:
            # First try to get the price from event-specific configuration
            config = EventSeatConfiguration.objects.filter(
                event=self.booking.show.event, 
                seat=self.seat
            ).first()
            if config:
                self.price = config.price
            else:
                self.price = self.seat.price

        super().save(*args, **kwargs)
        self.booking.update_total_amount()

    def delete(self, *args, **kwargs):
        booking = self.booking
        super().delete(*args, **kwargs)
        booking.update_total_amount()

    def __str__(self):
        return f"{self.booking.booking_reference} - {self.seat}"

class SeatLock(models.Model):
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="seat_locks",
        limit_choices_to={"role": Role.CUSTOMER},
    )
    show = models.ForeignKey(
        Show,
        on_delete=models.CASCADE,
        related_name="seat_locks",
    )
    seat = models.ForeignKey(
        Seat,
        on_delete=models.CASCADE,
        related_name="locks",
    )
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['show', 'seat', 'expires_at']),
        ]

    def clean(self):
        super().clean()
        if self.show_id and self.seat_id:
            if self.seat.venue != self.show.event.venue:
                raise ValidationError({"seat": "Seat must belong to the same venue as the show."})
            
        from django.utils import timezone
        if self.show_id and self.seat_id and self.expires_at:
            active_locks = SeatLock.objects.filter(
                show=self.show,
                seat=self.seat,
                expires_at__gt=timezone.now()
            )
            if self.pk:
                active_locks = active_locks.exclude(pk=self.pk)
            if active_locks.exists():
                raise ValidationError("This seat is currently locked by another user.")

    def save(self, *args, **kwargs):
        if self.customer_id and self.customer.role != Role.CUSTOMER:
            raise ValueError("Only CUSTOMER users can lock seats.")
        if self.show_id and self.seat_id:
            if self.seat.venue != self.show.event.venue:
                raise ValueError("Seat must belong to the same venue as the show.")
            
        from django.utils import timezone
        if self.show_id and self.seat_id and self.expires_at:
            active_locks = SeatLock.objects.filter(
                show=self.show,
                seat=self.seat,
                expires_at__gt=timezone.now()
            )
            if self.pk:
                active_locks = active_locks.exclude(pk=self.pk)
            if active_locks.exists():
                raise ValueError("This seat is currently locked by another user.")
                
        super().save(*args, **kwargs)

    def is_active(self):
        from django.utils import timezone
        return self.expires_at > timezone.now()

    def __str__(self):
        return f"Lock for {self.seat} on {self.show} until {self.expires_at}"

class Payment(models.Model):
    class Gateway(models.TextChoices):
        RAZORPAY = "RAZORPAY", "Razorpay"

    class Status(models.TextChoices):
        CREATED = "CREATED", "Created"
        PENDING = "PENDING", "Pending"
        SUCCESS = "SUCCESS", "Success"
        FAILED = "FAILED", "Failed"
        REFUNDED = "REFUNDED", "Refunded"

    booking = models.ForeignKey(
        Booking,
        on_delete=models.CASCADE,
        related_name="payments"
    )
    gateway = models.CharField(
        max_length=20,
        choices=Gateway.choices,
        default=Gateway.RAZORPAY
    )
    gateway_order_id = models.CharField(
        max_length=255, 
        null=True, 
        blank=True, 
        unique=True
    )
    gateway_payment_id = models.CharField(
        max_length=255, 
        null=True, 
        blank=True, 
        unique=True
    )
    amount = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        validators=[MinValueValidator(Decimal("0.00"))]
    )
    currency = models.CharField(
        max_length=3,
        default="INR"
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.CREATED
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        super().clean()
        if self.booking_id and self.amount != self.booking.total_amount:
            raise ValidationError(
                {"amount": "Payment amount must match the booking total amount."}
            )

    def save(self, *args, **kwargs):
        if self.booking_id and self.amount != self.booking.total_amount:
            raise ValueError("Payment amount must match the booking total amount.")
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Payment {self.id} for Booking {self.booking.booking_reference}"

class Ticket(models.Model):
    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Active'
        USED = 'USED', 'Used'
        CANCELLED = 'CANCELLED', 'Cancelled'

    booking = models.OneToOneField(
        Booking,
        on_delete=models.CASCADE,
        related_name="ticket"
    )
    ticket_number = models.CharField(max_length=100, unique=True)
    qr_token = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE
    )
    qr_code_image = models.ImageField(upload_to='ticket_qrs/', null=True, blank=True)
    issued_at = models.DateTimeField(auto_now_add=True)
    used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        super().clean()
        if self.booking_id:
            if self.booking.status != Booking.Status.CONFIRMED and self.status == self.Status.ACTIVE:
                raise ValidationError({"booking": "Only confirmed bookings can have an active ticket."})

    def save(self, *args, **kwargs):
        if self.booking_id:
            if self.booking.status != Booking.Status.CONFIRMED and self.status == self.Status.ACTIVE:
                raise ValueError("Only confirmed bookings can have an active ticket.")
                
        # Only generate the QR code if it doesn't exist and the ticket is active
        if not self.qr_code_image and self.status == self.Status.ACTIVE:
            self.generate_qr_code()
            
        super().save(*args, **kwargs)

    def generate_qr_code(self):
        if self.qr_code_image:
            return
            
        verification_data = str(self.qr_token)
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_H,
            box_size=10,
            border=4,
        )
        qr.add_data(verification_data)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        buffer = BytesIO()
        img.save(buffer, format="PNG")
        file_name = f"ticket_qr_{self.ticket_number}.png"
        
        # save=False to avoid recursive save calls
        self.qr_code_image.save(file_name, ContentFile(buffer.getvalue()), save=False)

    def __str__(self):
        return f"Ticket {self.ticket_number} for Booking {self.booking.booking_reference}"

    @classmethod
    def generate_ticket(cls, booking):
        from django.db import transaction
        if booking.status != Booking.Status.CONFIRMED:
            raise ValueError("Booking must be CONFIRMED to generate a ticket.")
        
        with transaction.atomic():
            ticket = cls.objects.filter(booking=booking).first()
            if ticket:
                return ticket
                
            event = booking.show.event
            sequence, _ = EventTicketSequence.objects.select_for_update().get_or_create(event=event)
            sequence.last_sequence += 1
            sequence.save()
            
            event_code = event.event_code or f"EVT{event.id}"
            ticket_number = f"{event_code}-{sequence.last_sequence:03d}"
            
            ticket = cls.objects.create(
                booking=booking,
                ticket_number=ticket_number
            )
            return ticket


class Notification(models.Model):
    class NotificationType(models.TextChoices):
        BOOKING_CREATED = "BOOKING_CREATED", "Booking Created"
        PAYMENT_SUCCESS = "PAYMENT_SUCCESS", "Payment Success"
        TICKET_ISSUED = "TICKET_ISSUED", "Ticket Issued"
        BOOKING_CANCELLED = "BOOKING_CANCELLED", "Booking Cancelled"
        PAYMENT_FAILED = "PAYMENT_FAILED", "Payment Failed"

    class Channel(models.TextChoices):
        EMAIL = "EMAIL", "Email"

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        SENT = "SENT", "Sent"
        FAILED = "FAILED", "Failed"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications"
    )
    notification_type = models.CharField(max_length=50, choices=NotificationType.choices)
    channel = models.CharField(max_length=50, choices=Channel.choices, default=Channel.EMAIL)
    subject = models.CharField(max_length=255)
    message = models.TextField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    related_booking = models.ForeignKey(
        Booking,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notifications"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    retry_count = models.IntegerField(default=0)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "status"]),
            models.Index(fields=["notification_type"]),
        ]

    def __str__(self):
        return f"Notification {self.id} for {self.user.email} - {self.notification_type}"
