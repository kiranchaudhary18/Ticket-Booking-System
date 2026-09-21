from rest_framework import serializers

from .models import Category

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "description", "is_active", "created_at", "updated_at"]
        read_only_fields = fields

class CategoryCreateSerializer(serializers.ModelSerializer):
    name = serializers.CharField(max_length=100)
    description = serializers.CharField(required=False, allow_blank=True, allow_null=False)
    is_active = serializers.BooleanField(required=False, default=True)

    class Meta:
        model = Category
        fields = ["id", "name", "description", "is_active", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Category name is required.")
        if Category.objects.filter(name__iexact=value).exists():
            raise serializers.ValidationError("A category with this name already exists.")
        return value

    def validate_description(self, value):
        if value is None:
            return ""
        return value.strip()


class CategoryUpdateSerializer(serializers.ModelSerializer):
    name = serializers.CharField(max_length=100)
    description = serializers.CharField(required=False, allow_blank=True)
    is_active = serializers.BooleanField(required=False)

    class Meta:
        model = Category
        fields = ["id", "name", "description", "is_active", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Category name is required.")
        queryset = Category.objects.filter(name__iexact=value)
        if self.instance is not None:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError("A category with this name already exists.")
        return value

    def validate_description(self, value):
        if value is None:
            return ""
        return value.strip()

from .models import Venue, Event, Show, Seat, Wishlist, Booking, BookingItem, Payment, EventSeatConfiguration
from django.db import transaction
from decimal import Decimal

class VenueSerializer(serializers.ModelSerializer):
    class Meta:
        model = Venue
        fields = ['id', 'name', 'description', 'address', 'city', 'state', 'pincode', 'capacity', 'venue_type', 'organizer', 'is_active', 'created_at', 'updated_at']
        read_only_fields = fields

class VenueCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Venue
        fields = ['id', 'name', 'description', 'address', 'city', 'state', 'pincode', 'capacity', 'venue_type', 'organizer', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'organizer', 'is_active', 'created_at', 'updated_at']

class VenueUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Venue
        fields = ['id', 'name', 'description', 'address', 'city', 'state', 'pincode', 'capacity', 'venue_type', 'organizer', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'organizer', 'is_active', 'created_at', 'updated_at']

class AdminVenueUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Venue
        fields = ['id', 'name', 'description', 'address', 'city', 'state', 'pincode', 'capacity', 'venue_type', 'organizer', 'is_active', 'created_at', 'updated_at']
        # Admin can update everything except id, organizer, timestamps
        read_only_fields = ['id', 'organizer', 'created_at', 'updated_at']

class EventSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = ['id', 'title', 'description', 'event_image', 'category', 'venue', 'organizer', 'status', 'start_date', 'end_date', 'age_limit', 'language', 'is_active', 'created_at', 'updated_at']
        read_only_fields = fields

class EventCreateSerializer(serializers.ModelSerializer):
    event_image_upload = serializers.ImageField(write_only=True, required=False)

    class Meta:
        model = Event
        fields = ['id', 'title', 'description', 'event_image', 'event_image_upload', 'category', 'venue', 'organizer', 'status', 'start_date', 'end_date', 'age_limit', 'language', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'organizer', 'event_image', 'is_active', 'created_at', 'updated_at']

    def validate_venue(self, value):
        user = self.context['request'].user
        if value.organizer != user:
            raise serializers.ValidationError('You can only use a venue you own.')
        if not value.is_active:
            raise serializers.ValidationError('Venue is not active.')
        return value

    def validate_category(self, value):
        if not value.is_active:
            raise serializers.ValidationError('Category is not active.')
        return value

    def validate(self, attrs):
        start_date = attrs.get('start_date')
        end_date = attrs.get('end_date')
        if start_date and end_date and start_date >= end_date:
            raise serializers.ValidationError({'end_date': 'End date must be later than start date.'})
        return attrs

    def create(self, validated_data):
        import cloudinary.uploader
        event_image_upload = validated_data.pop('event_image_upload', None)
        event = super().create(validated_data)
        
        if event_image_upload:
            upload_result = cloudinary.uploader.upload(
                event_image_upload,
                folder=f"ticketmaster/events/{event.id}"
            )
            event.event_image = upload_result.get("secure_url")
            event.save(update_fields=['event_image'])
            
        return event

class EventUpdateSerializer(serializers.ModelSerializer):
    event_image_upload = serializers.ImageField(write_only=True, required=False)

    class Meta:
        model = Event
        fields = ['id', 'title', 'description', 'event_image', 'event_image_upload', 'category', 'venue', 'organizer', 'status', 'start_date', 'end_date', 'age_limit', 'language', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'organizer', 'event_image', 'is_active', 'created_at', 'updated_at']

    def validate_venue(self, value):
        user = self.context['request'].user
        if value.organizer != user:
            raise serializers.ValidationError('You can only use a venue you own.')
        if not value.is_active:
            raise serializers.ValidationError('Venue is not active.')
        return value

    def validate_category(self, value):
        if not value.is_active:
            raise serializers.ValidationError('Category is not active.')
        return value

    def validate(self, attrs):
        start_date = attrs.get('start_date', getattr(self.instance, 'start_date', None))
        end_date = attrs.get('end_date', getattr(self.instance, 'end_date', None))
        if start_date and end_date and start_date >= end_date:
            raise serializers.ValidationError({'end_date': 'End date must be later than start date.'})
        return attrs

    def update(self, instance, validated_data):
        import cloudinary.uploader
        
        event_image_upload = validated_data.pop("event_image_upload", None)
        
        if event_image_upload:
            old_url = instance.event_image
            if old_url and "res.cloudinary.com" in old_url:
                try:
                    public_id = old_url.split('/upload/')[1].split('/', 1)[1].rsplit('.', 1)[0]
                    cloudinary.uploader.destroy(public_id)
                except Exception:
                    pass
            
            upload_result = cloudinary.uploader.upload(
                event_image_upload,
                folder=f"ticketmaster/events/{instance.id}"
            )
            instance.event_image = upload_result.get("secure_url")
            
        return super().update(instance, validated_data)

class EventStatusSerializer(serializers.ModelSerializer):
    status = serializers.ChoiceField(choices=Event.Status.choices)
    class Meta:
        model = Event
        fields = ['id', 'title', 'description', 'event_image', 'category', 'venue', 'organizer', 'status', 'start_date', 'end_date', 'age_limit', 'language', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'title', 'description', 'event_image', 'category', 'venue', 'organizer', 'start_date', 'end_date', 'age_limit', 'language', 'is_active', 'created_at', 'updated_at']

    def validate(self, attrs):
        target = attrs.get('status', getattr(self.instance, 'status', None))
        if self.instance is not None and target == Event.Status.PUBLISHED:
            event = self.instance
            try:
                category = Category.objects.get(pk=event.category_id)
            except Category.DoesNotExist:
                raise serializers.ValidationError({'status': 'Cannot publish: category does not exist.'})
            if not category.is_active:
                raise serializers.ValidationError({'status': 'Cannot publish: category is inactive.'})
            try:
                venue = Venue.objects.get(pk=event.venue_id)
            except Venue.DoesNotExist:
                raise serializers.ValidationError({'status': 'Cannot publish: venue does not exist.'})
            if not venue.is_active:
                raise serializers.ValidationError({'status': 'Cannot publish: venue is inactive.'})
            if not (event.title or '').strip():
                raise serializers.ValidationError({'status': 'Cannot publish: title is required.'})
            if not (event.description or '').strip():
                raise serializers.ValidationError({'status': 'Cannot publish: description is required.'})
            if event.start_date and event.end_date and event.start_date >= event.end_date:
                raise serializers.ValidationError({'status': 'Cannot publish: start_date must be before end_date.'})
            from django.utils import timezone
            if event.end_date and event.end_date <= timezone.now():
                raise serializers.ValidationError({'status': 'Cannot publish: event has already ended.'})
            if event.age_limit is not None and event.age_limit < 1:
                raise serializers.ValidationError({'status': 'Cannot publish: age_limit is invalid.'})
        return attrs

    def update(self, instance, validated_data):
        new_status = validated_data.get('status', instance.status)
        if new_status == Event.Status.CANCELLED:
            instance.status = Event.Status.CANCELLED
            instance.is_active = False
            instance.save(update_fields=['status', 'is_active', 'updated_at'])
            return instance
        instance.status = new_status
        instance.save(update_fields=['status', 'updated_at'])
        return instance

class ShowSerializer(serializers.ModelSerializer):
    class Meta:
        model = Show
        fields = ['id', 'event', 'show_date', 'start_time', 'end_time', 'is_active', 'created_at', 'updated_at']
        read_only_fields = fields

class ShowCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Show
        fields = ['event', 'show_date', 'start_time', 'end_time']

    def validate_event(self, value):
        user = self.context['request'].user
        if value.organizer != user:
            raise serializers.ValidationError('You can only create shows for your own events.')
        if not value.is_active:
            raise serializers.ValidationError('Event is not active.')
        if value.status == Event.Status.CANCELLED:
            raise serializers.ValidationError('Cannot create a show for a cancelled event.')
        return value

    def validate(self, attrs):
        start_time = attrs.get('start_time')
        end_time = attrs.get('end_time')
        if start_time and end_time and start_time >= end_time:
            raise serializers.ValidationError({'end_time': 'end_time must be later than start_time.'})
        event = attrs.get('event')
        show_date = attrs.get('show_date')
        if Show.objects.filter(event=event, show_date=show_date, start_time=start_time, end_time=end_time).exists():
            raise serializers.ValidationError('A show with this exact schedule already exists for this event.')
        return attrs

class ShowUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Show
        fields = ['id', 'event', 'show_date', 'start_time', 'end_time', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'event', 'created_at', 'updated_at']

    def validate(self, attrs):
        if self.instance and self.instance.event.status == Event.Status.CANCELLED:
            raise serializers.ValidationError("Cannot update a show for a cancelled event.")
        if self.instance and not self.instance.event.is_active:
            raise serializers.ValidationError("Cannot update a show for an inactive event.")

        start_time = attrs.get('start_time', getattr(self.instance, 'start_time', None))
        end_time = attrs.get('end_time', getattr(self.instance, 'end_time', None))
        if start_time and end_time and start_time >= end_time:
            raise serializers.ValidationError({'end_time': 'end_time must be later than start_time.'})

        show_date = attrs.get('show_date', getattr(self.instance, 'show_date', None))
        event = self.instance.event if self.instance else attrs.get('event')
        
        qs = Show.objects.filter(event=event, show_date=show_date, start_time=start_time, end_time=end_time)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
            
        if qs.exists():
            raise serializers.ValidationError("A show with this exact schedule already exists for this event.")
            
        return attrs

class SeatSerializer(serializers.ModelSerializer):
    class Meta:
        model = Seat
        fields = ['id', 'venue', 'row', 'seat_number', 'seat_type', 'price', 'is_active', 'created_at', 'updated_at']
        read_only_fields = fields

class SeatCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Seat
        fields = ['venue', 'row', 'seat_number', 'seat_type', 'price']

    def validate_venue(self, value):
        user = self.context['request'].user
        if value.organizer != user:
            raise serializers.ValidationError("You can only create seats for a venue you own.")
        if not value.is_active:
            raise serializers.ValidationError("Venue is not active.")
        return value

    def validate(self, attrs):
        venue = attrs.get('venue')
        row = attrs.get('row')
        seat_number = attrs.get('seat_number')
        if seat_number is not None:
            if not seat_number.isdigit() or int(seat_number) <= 0:
                raise serializers.ValidationError({'seat_number': 'Seat number must be a positive number.'})
        if Seat.objects.filter(venue=venue, row=row, seat_number=seat_number).exists():
            raise serializers.ValidationError("This seat already exists in the selected venue.")
        return attrs

class SeatBulkCreateSerializer(serializers.Serializer):
    venue = serializers.PrimaryKeyRelatedField(queryset=Venue.objects.all())
    row = serializers.CharField(max_length=10)
    start_seat_number = serializers.IntegerField(min_value=1)
    end_seat_number = serializers.IntegerField(min_value=1)
    seat_type = serializers.ChoiceField(choices=Seat.SeatType.choices, default=Seat.SeatType.REGULAR)
    price = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0.00'))

    def validate_venue(self, value):
        user = self.context['request'].user
        if value.organizer != user:
            raise serializers.ValidationError("You can only create seats for a venue you own.")
        if not value.is_active:
            raise serializers.ValidationError("Venue is not active.")
        return value

    def validate(self, attrs):
        start = attrs.get('start_seat_number')
        end = attrs.get('end_seat_number')
        if start and end and start > end:
            raise serializers.ValidationError({"end_seat_number": "End seat number must be greater than or equal to start seat number."})
        return attrs

    def create(self, validated_data):
        venue = validated_data['venue']
        row = validated_data['row']
        start = validated_data['start_seat_number']
        end = validated_data['end_seat_number']
        seat_type = validated_data['seat_type']
        price = validated_data['price']

        seats = []
        for i in range(start, end + 1):
            seats.append(Seat(
                venue=venue,
                row=row,
                seat_number=str(i),
                seat_type=seat_type,
                price=price
            ))
            
        with transaction.atomic():
            # Update conflicts if the seats already exist
            created_seats = Seat.objects.bulk_create(
                seats,
                update_conflicts=True,
                update_fields=['seat_type', 'price'],
                unique_fields=['venue', 'row', 'seat_number']
            )
            
        return {
            "venue": venue,
            "row": row,
            "start_seat_number": start,
            "end_seat_number": end,
            "seat_type": seat_type,
            "price": price,
            "seats_created": len(seats)
        }
    
    def to_representation(self, instance):
        return {
            "venue": instance.get('venue').id if instance.get('venue') else None,
            "row": instance.get('row'),
            "start_seat_number": instance.get('start_seat_number'),
            "end_seat_number": instance.get('end_seat_number'),
            "seat_type": instance.get('seat_type'),
            "price": str(instance.get('price')),
            "seats_created": instance.get('seats_created')
        }

class SeatUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Seat
        fields = ['id', 'venue', 'row', 'seat_number', 'seat_type', 'price', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'venue', 'is_active', 'created_at', 'updated_at']

    def validate(self, attrs):
        row = attrs.get('row', getattr(self.instance, 'row', None))
        seat_number = attrs.get('seat_number', getattr(self.instance, 'seat_number', None))
        venue = self.instance.venue
        
        if seat_number is not None:
            if not seat_number.isdigit() or int(seat_number) <= 0:
                raise serializers.ValidationError({'seat_number': 'Seat number must be a positive number.'})
        
        qs = Seat.objects.filter(venue=venue, row=row, seat_number=seat_number).exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("This seat already exists in the venue.")
            
        return attrs

class EventSeatConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventSeatConfiguration
        fields = ['id', 'event', 'seat', 'seat_type', 'price', 'is_active']
        read_only_fields = ['id', 'event']

class EventSeatConfigurationBulkSerializer(serializers.Serializer):
    seat_ids = serializers.ListField(
        child=serializers.IntegerField(),
        allow_empty=False
    )
    seat_type = serializers.ChoiceField(choices=Seat.SeatType.choices)
    price = serializers.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        min_value=Decimal("0.00")
    )
    is_active = serializers.BooleanField(default=True)

    def validate(self, attrs):
        request = self.context.get('request')
        event = self.context.get('event')
        seat_ids = attrs.get('seat_ids', [])
        
        # Verify seats exist and belong to the event's venue
        seats = Seat.objects.filter(id__in=seat_ids)
        if len(seats) != len(seat_ids):
            raise serializers.ValidationError({"seat_ids": "One or more seat IDs are invalid."})
            
        for seat in seats:
            if seat.venue_id != event.venue_id:
                raise serializers.ValidationError({"seat_ids": f"Seat {seat.id} does not belong to the venue of this event."})
                
        return attrs
    
    def create(self, validated_data):
        event = self.context.get('event')
        seat_ids = validated_data.get('seat_ids')
        seat_type = validated_data.get('seat_type')
        price = validated_data.get('price')
        is_active = validated_data.get('is_active')
        
        # We will use update_or_create to avoid duplicates
        created_configs = []
        for seat_id in seat_ids:
            config, created = EventSeatConfiguration.objects.update_or_create(
                event=event,
                seat_id=seat_id,
                defaults={
                    'seat_type': seat_type,
                    'price': price,
                    'is_active': is_active
                }
            )
            created_configs.append(config)
            
        # Return a summary dict, but usually bulk create views might not need to serialize this perfectly
        return {
            "configured_count": len(created_configs)
        }
        
    def to_representation(self, instance):
        return instance

class EventDetailSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    venue_name = serializers.CharField(source='venue.name', read_only=True)
    venue_city = serializers.CharField(source='venue.city', read_only=True)
    venue_state = serializers.CharField(source='venue.state', read_only=True)

    class Meta:
        model = Event
        fields = [
            'id', 'title', 'description', 'event_image',
            'organizer', 'category', 'category_name',
            'venue', 'venue_name', 'venue_city', 'venue_state',
            'status', 'start_date', 'end_date',
            'age_limit', 'language', 'is_active',
        ]
        read_only_fields = fields

class WishlistCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Wishlist
        fields = ['id', 'event', 'created_at']
        read_only_fields = ['id', 'created_at']

    def validate_event(self, value):
        if value.status != Event.Status.PUBLISHED or not value.is_active:
            raise serializers.ValidationError("You can only add active published events to your wishlist.")
        return value

    def validate(self, attrs):
        request = self.context.get('request')
        event = attrs.get('event')
        if Wishlist.objects.filter(customer=request.user, event=event).exists():
            raise serializers.ValidationError({"event": "This event is already in your wishlist."})
        return attrs

class WishlistListSerializer(serializers.ModelSerializer):
    event = EventDetailSerializer(read_only=True)
    class Meta:
        model = Wishlist
        fields = ['id', 'event', 'created_at']

class BookingCreateSerializer(serializers.ModelSerializer):
    seats = serializers.PrimaryKeyRelatedField(
        queryset=Seat.objects.all(),
        many=True,
        write_only=True
    )

    class Meta:
        model = Booking
        fields = ['id', 'show', 'seats', 'booking_reference', 'status', 'total_amount', 'created_at']
        read_only_fields = ['id', 'booking_reference', 'status', 'total_amount', 'created_at']

    def validate_show(self, value):
        if not value.is_active:
            raise serializers.ValidationError("Show is not active.")
        if not value.event.is_active:
            raise serializers.ValidationError("Event is not active.")
        if value.event.status != Event.Status.PUBLISHED:
            raise serializers.ValidationError("Event is not published.")
        if not value.event.venue.is_active:
            raise serializers.ValidationError("Venue is not active.")
        return value

    def validate_seats(self, value):
        if not value:
            raise serializers.ValidationError("At least one seat is required.")
        
        seat_ids = [seat.id for seat in value]
        if len(seat_ids) != len(set(seat_ids)):
            raise serializers.ValidationError("Duplicate seat IDs are not allowed.")
        
        for seat in value:
            if not seat.is_active:
                raise serializers.ValidationError(f"Seat {seat.id} is not active.")
        
        return value

    def validate(self, attrs):
        show = attrs.get('show')
        seats = attrs.get('seats')
        
        if show and seats:
            venue = show.event.venue
            for seat in seats:
                if seat.venue != venue:
                    raise serializers.ValidationError({"seats": f"Seat {seat.id} does not belong to the show's venue."})
            
            from django.utils import timezone
            from django.conf import settings
            from datetime import timedelta
            from django.db.models import Q
            
            lock_duration = getattr(settings, 'SEAT_LOCK_DURATION_MINUTES', 10)
            threshold_time = timezone.now() - timedelta(minutes=lock_duration)

            booked_seats = BookingItem.objects.filter(
                booking__show=show,
                seat__in=seats
            ).filter(
                Q(booking__status=Booking.Status.CONFIRMED) |
                Q(booking__status=Booking.Status.PENDING, booking__created_at__gt=threshold_time)
            ).values_list('seat_id', flat=True)
            
            if booked_seats:
                raise serializers.ValidationError({"seats": f"Some seats are already booked or locked: {list(booked_seats)}"})
                
            from django.utils import timezone
            from .models import SeatLock
            customer = self.context['request'].user
            
            active_locks = SeatLock.objects.filter(
                customer=customer,
                show=show,
                seat__in=seats,
                expires_at__gt=timezone.now()
            ).values_list('seat_id', flat=True)
            
            locked_seat_ids = set(active_locks)
            requested_seat_ids = set(seat.id for seat in seats)
            
            missing_locks = requested_seat_ids - locked_seat_ids
            if missing_locks:
                raise serializers.ValidationError({"seats": f"You do not have active locks for these seats: {list(missing_locks)}"})
                
        return attrs

    def create(self, validated_data):
        seats = validated_data.pop('seats')
        customer = self.context['request'].user
        show = validated_data['show']
        with transaction.atomic():
            # Apply row-level locks on the seats to prevent race conditions
            locked_seats = list(Seat.objects.select_for_update().filter(id__in=[s.id for s in seats]))
            
            from django.utils import timezone
            from django.conf import settings
            from datetime import timedelta
            from django.db.models import Q

            lock_duration = getattr(settings, 'SEAT_LOCK_DURATION_MINUTES', 10)
            threshold_time = timezone.now() - timedelta(minutes=lock_duration)

            # Re-verify that seats are not booked inside the locked transaction
            booked_seats = BookingItem.objects.filter(
                booking__show=show,
                seat__in=seats
            ).filter(
                Q(booking__status=Booking.Status.CONFIRMED) |
                Q(booking__status=Booking.Status.PENDING, booking__created_at__gt=threshold_time)
            )
            if booked_seats.exists():
                raise serializers.ValidationError({"seats": "Some seats are already booked."})
                
            # Re-verify locks are still held
            from django.utils import timezone
            from .models import SeatLock
            active_locks = SeatLock.objects.filter(
                customer=customer,
                show=show,
                seat__in=seats,
                expires_at__gt=timezone.now()
            ).values_list('seat_id', flat=True)
            if len(active_locks) != len(seats):
                raise serializers.ValidationError({"seats": "You do not have active locks for all requested seats."})

            booking = Booking.objects.create(**validated_data)
            
            booking_items = []
            for seat in seats:
                booking_items.append(
                    BookingItem(
                        booking=booking,
                        seat=seat,
                        price=seat.price
                    )
                )
            BookingItem.objects.bulk_create(booking_items)
            booking.update_total_amount()
            
            SeatLock.objects.filter(
                customer=customer,
                show=show,
                seat__in=seats
            ).delete()
            
            # Send notification
            from events.services.notification_service import send_notification
            from events.models import Notification
            
            subject = f"Booking Created: {show.event.title}"
            seats_str = ", ".join([f"{s.row}{s.seat_number}" for s in seats])
            timeout_mins = getattr(settings, 'PAYMENT_TIMEOUT_MINUTES', 15)
            
            message = f"Your booking has been created successfully!\n\nReference: {booking.booking_reference}\nEvent: {show.event.title}\nShow: {show.show_date} at {show.start_time}\nVenue: {show.event.venue.name}\nSeats: {seats_str}\nTotal Amount: {booking.total_amount}\nStatus: {booking.status}\n\nPlease complete your payment within {timeout_mins} minutes to confirm your tickets."
            
            if not Notification.objects.filter(related_booking=booking, notification_type=Notification.NotificationType.BOOKING_CREATED).exists():
                send_notification(
                    user=customer,
                    notification_type=Notification.NotificationType.BOOKING_CREATED,
                    subject=subject,
                    message=message,
                    related_booking=booking
                )
                
            from events.services.notification_service import send_organizer_booking_notification
            send_organizer_booking_notification(booking, Notification.NotificationType.BOOKING_CREATED)
            
        return booking

class BookingItemSerializer(serializers.ModelSerializer):
    seat = SeatSerializer(read_only=True)
    
    class Meta:
        model = BookingItem
        fields = ['id', 'seat', 'price', 'created_at']
        read_only_fields = fields

class BookingListSerializer(serializers.ModelSerializer):
    show = ShowSerializer(read_only=True)
    event = EventSerializer(source='show.event', read_only=True)
    venue = VenueSerializer(source='show.event.venue', read_only=True)
    seats = BookingItemSerializer(source='items', many=True, read_only=True)
    ticket_number = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = ['id', 'booking_reference', 'status', 'show', 'event', 'venue', 'seats', 'total_amount', 'created_at', 'updated_at', 'ticket_number']
        read_only_fields = fields

    def get_ticket_number(self, obj):
        if hasattr(obj, 'ticket') and obj.ticket:
            return obj.ticket.ticket_number
        return None

from accounts.serializers import UserProfileSerializer

class AdminBookingSerializer(serializers.ModelSerializer):
    customer = UserProfileSerializer(read_only=True)
    show = ShowSerializer(read_only=True)
    event = EventSerializer(source='show.event', read_only=True)
    venue = VenueSerializer(source='show.event.venue', read_only=True)
    seats = BookingItemSerializer(source='items', many=True, read_only=True)
    payment_status = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = [
            'id', 'booking_reference', 'customer', 'event', 'show', 'venue', 
            'seats', 'total_amount', 'status', 'payment_status', 'created_at', 'updated_at'
        ]
        read_only_fields = fields

    def get_payment_status(self, obj):
        payment = obj.payments.order_by('-created_at').first()
        return payment.status if payment else None

class AdminPaymentSerializer(serializers.ModelSerializer):
    booking_reference = serializers.CharField(source='booking.booking_reference', read_only=True)
    customer_email = serializers.CharField(source='booking.customer.email', read_only=True)

    class Meta:
        model = Payment
        fields = ['id', 'booking', 'booking_reference', 'customer_email', 'razorpay_order_id', 'razorpay_payment_id', 'amount', 'status', 'created_at', 'updated_at']
        read_only_fields = fields

from .models import SeatLock
from django.conf import settings
from django.utils import timezone
from datetime import timedelta

class AdminEventReportSerializer(serializers.ModelSerializer):
    organizer_name = serializers.CharField(source='organizer.name', read_only=True)
    organizer_email = serializers.CharField(source='organizer.email', read_only=True)
    
    total_shows = serializers.IntegerField(read_only=True)
    total_bookings = serializers.IntegerField(read_only=True)
    confirmed_bookings = serializers.IntegerField(read_only=True)
    cancelled_bookings = serializers.IntegerField(read_only=True)
    booked_seats = serializers.IntegerField(read_only=True)
    tickets_issued = serializers.IntegerField(read_only=True)
    tickets_used = serializers.IntegerField(read_only=True)
    successful_revenue = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    
    total_seats = serializers.SerializerMethodField()
    available_seats = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = [
            'id', 'title', 'organizer_name', 'organizer_email',
            'total_shows', 'total_seats', 'booked_seats', 'available_seats',
            'total_bookings', 'confirmed_bookings', 'cancelled_bookings',
            'tickets_issued', 'tickets_used', 'successful_revenue'
        ]

    def get_total_seats(self, obj):
        venue_capacity = getattr(obj, 'venue_capacity', 0)
        return obj.total_shows * venue_capacity

    def get_available_seats(self, obj):
        return max(0, self.get_total_seats(obj) - obj.booked_seats)

class SeatLockCreateSerializer(serializers.Serializer):
    show = serializers.PrimaryKeyRelatedField(queryset=Show.objects.all())
    seats = serializers.PrimaryKeyRelatedField(queryset=Seat.objects.all(), many=True)
    
    def validate_show(self, value):
        if not value.is_active:
            raise serializers.ValidationError("Show is not active.")
        if not value.event.is_active:
            raise serializers.ValidationError("Event is not active.")
        if value.event.status != Event.Status.PUBLISHED:
            raise serializers.ValidationError("Event is not published.")
        if not value.event.venue.is_active:
            raise serializers.ValidationError("Venue is not active.")
        return value

    def validate_seats(self, value):
        if not value:
            raise serializers.ValidationError("At least one seat is required.")
        if len(set(value)) != len(value):
            raise serializers.ValidationError("Duplicate seat IDs are not allowed.")
        
        for seat in value:
            if not seat.is_active:
                raise serializers.ValidationError(f"Seat {seat.id} is not active.")
        return value

    def validate(self, data):
        show = data['show']
        seats = data['seats']
        venue = show.event.venue

        for seat in seats:
            if seat.venue != venue:
                raise serializers.ValidationError({"seats": f"Seat {seat.id} does not belong to the show's venue."})
        
        booked = BookingItem.objects.filter(
            booking__show=show, 
            seat__in=seats
        ).exclude(booking__status=Booking.Status.CANCELLED)
        
        if booked.exists():
            raise serializers.ValidationError({"seats": "One or more selected seats are already booked."})

        customer = self.context['request'].user
        active_locks = SeatLock.objects.filter(
            show=show,
            seat__in=seats,
            expires_at__gt=timezone.now()
        ).exclude(customer=customer)
        
        if active_locks.exists():
            raise serializers.ValidationError({"seats": "One or more selected seats are currently locked by another user."})

        return data

    def create(self, validated_data):
        show = validated_data['show']
        seats = validated_data['seats']
        customer = self.context['request'].user
        
        duration = getattr(settings, 'SEAT_LOCK_DURATION_MINUTES', 10)
        expires_at = timezone.now() + timedelta(minutes=duration)
        
        with transaction.atomic():
            # Apply row-level locks on the seats to prevent race conditions
            locked_seats = list(Seat.objects.select_for_update().filter(id__in=[s.id for s in seats]))
            
            # Re-verify that seats are not booked inside the locked transaction
            booked = BookingItem.objects.filter(
                booking__show=show, 
                seat__in=seats
            ).exclude(booking__status=Booking.Status.CANCELLED)
            if booked.exists():
                raise serializers.ValidationError({"seats": "One or more selected seats are already booked."})

            # Re-verify active locks by other users inside the locked transaction
            active_locks = SeatLock.objects.filter(
                show=show,
                seat__in=seats,
                expires_at__gt=timezone.now()
            ).exclude(customer=customer)
            if active_locks.exists():
                raise serializers.ValidationError({"seats": "One or more selected seats are currently locked by another user."})

            # Safely proceed
            SeatLock.objects.filter(customer=customer, show=show, seat__in=seats).delete()
            
            locks = []
            for seat in seats:
                locks.append(SeatLock(
                    customer=customer,
                    show=show,
                    seat=seat,
                    expires_at=expires_at
                ))
            SeatLock.objects.bulk_create(locks)
            
        return {
            'show': show.id,
            'locked_seats': [seat.id for seat in seats],
            'expires_at': expires_at,
            'remaining_seconds': duration * 60
        }

class SeatLockReleaseSerializer(serializers.Serializer):
    show = serializers.PrimaryKeyRelatedField(queryset=Show.objects.all())
    seats = serializers.PrimaryKeyRelatedField(queryset=Seat.objects.all(), many=True)
    
    def validate_seats(self, value):
        if not value:
            raise serializers.ValidationError("At least one seat is required.")
        return value

from .models import Payment, Ticket
from .services.razorpay_service import RazorpayService

class PaymentOrderCreateSerializer(serializers.Serializer):
    booking_id = serializers.PrimaryKeyRelatedField(
        queryset=Booking.objects.all(),
        source='booking'
    )

    def validate_booking_id(self, booking):
        request = self.context.get('request')
        if request and booking.customer != request.user:
            raise serializers.ValidationError("You can only create payments for your own bookings.")
        if booking.status == Booking.Status.CANCELLED:
            raise serializers.ValidationError("Cannot create payment for a cancelled booking.")
        if not booking.items.exists():
            raise serializers.ValidationError("Booking has no items.")
        
        # Prevent duplicate active payment orders by reusing them
        existing_payment = Payment.objects.filter(
            booking=booking,
            status__in=[Payment.Status.CREATED, Payment.Status.PENDING]
        ).first()
        
        if existing_payment:
            booking._existing_payment = existing_payment
        else:
            if Payment.objects.filter(booking=booking, status=Payment.Status.SUCCESS).exists():
                raise serializers.ValidationError("This booking has already been paid for.")
            
        from django.utils import timezone
        from django.conf import settings
        from datetime import timedelta
        from django.db.models import Q
        
        lock_duration = getattr(settings, 'SEAT_LOCK_DURATION_MINUTES', 10)
        threshold_time = timezone.now() - timedelta(minutes=lock_duration)
        
        if booking.status == Booking.Status.PENDING and booking.created_at <= threshold_time:
            # The lock has expired. We must check if seats are still available.
            seats = [item.seat for item in booking.items.all()]
            
            with transaction.atomic():
                # Re-verify against other confirmed/pending bookings
                booked_seats = BookingItem.objects.filter(
                    booking__show=booking.show,
                    seat__in=seats
                ).exclude(booking=booking).filter(
                    Q(booking__status=Booking.Status.CONFIRMED) |
                    Q(booking__status=Booking.Status.PENDING, booking__created_at__gt=threshold_time)
                )
                if booked_seats.exists():
                    raise serializers.ValidationError("One or more selected seats are no longer available.")
                
                # Re-verify against active SeatLocks by other users
                active_locks = SeatLock.objects.filter(
                    show=booking.show,
                    seat__in=seats,
                    expires_at__gt=timezone.now()
                ).exclude(customer=request.user if request else None)
                if active_locks.exists():
                    raise serializers.ValidationError("One or more selected seats are currently locked by another user.")
                
                # Seats are still available, renew the lock
                booking.created_at = timezone.now()
                booking.save(update_fields=['created_at'])
            
        return booking

    def create(self, validated_data):
        booking = validated_data['booking']
        razorpay_service = RazorpayService()
        
        existing_payment = getattr(booking, '_existing_payment', None)
        
        if existing_payment:
            payment = existing_payment
        else:
            try:
                # Get the organizer's linked account ID if it exists
                organizer_account_id = None
                try:
                    organizer_profile = booking.show.event.organizer.organizer_profile
                    if organizer_profile.razorpay_linked_account_id:
                        organizer_account_id = organizer_profile.razorpay_linked_account_id
                except Exception:
                    pass

                order = razorpay_service.create_order(
                    amount=booking.total_amount,
                    currency="INR",
                    receipt=str(booking.booking_reference),
                    organizer_account_id=organizer_account_id,
                    platform_fee=3  # Default platform fee per booking
                )
            except Exception as e:
                raise serializers.ValidationError(f"Failed to create Razorpay order: {str(e)}")
                
            with transaction.atomic():
                payment = Payment.objects.create(
                    booking=booking,
                    gateway=Payment.Gateway.RAZORPAY,
                    gateway_order_id=order.get('id'),
                    amount=booking.total_amount,
                    currency="INR",
                    status=Payment.Status.CREATED
                )
            
        return {
            "key_id": razorpay_service.key_id,
            "order_id": payment.gateway_order_id,
            "amount": int(payment.amount * 100),
            "currency": payment.currency
        }

class PaymentVerificationSerializer(serializers.Serializer):
    booking_id = serializers.PrimaryKeyRelatedField(
        queryset=Booking.objects.all(),
        source='booking'
    )
    razorpay_order_id = serializers.CharField(max_length=255)
    razorpay_payment_id = serializers.CharField(max_length=255)
    razorpay_signature = serializers.CharField(max_length=255)

    def validate(self, attrs):
        booking = attrs['booking']
        request = self.context.get('request')
        
        if request and booking.customer != request.user:
            raise serializers.ValidationError("You can only verify payments for your own bookings.")
            
        razorpay_order_id = attrs['razorpay_order_id']
        razorpay_payment_id = attrs['razorpay_payment_id']
        razorpay_signature = attrs['razorpay_signature']
        
        if booking.status == Booking.Status.CANCELLED:
            raise serializers.ValidationError("Cannot verify payment for a cancelled booking.")
        
        payment = Payment.objects.filter(booking=booking, gateway_order_id=razorpay_order_id).first()
        if not payment:
            raise serializers.ValidationError("Invalid razorpay_order_id for this booking.")
            
        if payment.status == Payment.Status.SUCCESS:
            raise serializers.ValidationError("This payment has already been verified.")
            
        razorpay_service = RazorpayService()
        is_valid_signature = razorpay_service.verify_payment_signature(
            razorpay_order_id=razorpay_order_id,
            razorpay_payment_id=razorpay_payment_id,
            razorpay_signature=razorpay_signature
        )
        
        if not is_valid_signature:
            raise serializers.ValidationError("Invalid payment signature.")
            
        attrs['payment'] = payment
        return attrs
        
    def save(self):
        payment = self.validated_data['payment']
        razorpay_payment_id = self.validated_data['razorpay_payment_id']
        booking = self.validated_data['booking']
        
        with transaction.atomic():
            # Acquire row locks to prevent race conditions during verification
            locked_payment = Payment.objects.select_for_update().get(id=payment.id)
            if locked_payment.status == Payment.Status.SUCCESS:
                 raise serializers.ValidationError("This payment has already been verified.")
                 
            locked_payment.status = Payment.Status.SUCCESS
            locked_payment.gateway_payment_id = razorpay_payment_id
            locked_payment.save()
            
            locked_booking = Booking.objects.select_for_update().get(id=booking.id)
            if locked_booking.status == Booking.Status.CANCELLED:
                raise serializers.ValidationError("Cannot verify payment for a cancelled booking.")
                
            from django.utils import timezone
            from django.conf import settings
            from datetime import timedelta
            from django.db.models import Q
            from .models import SeatLock, BookingItem, Seat
            
            lock_duration = getattr(settings, 'SEAT_LOCK_DURATION_MINUTES', 10)
            threshold_time = timezone.now() - timedelta(minutes=lock_duration)
            
            seats = [item.seat for item in locked_booking.items.all()]
            # Lock the seats for update to ensure strict serialization
            locked_seats = list(Seat.objects.select_for_update().filter(id__in=[s.id for s in seats]))
            
            booked_by_others = BookingItem.objects.filter(
                booking__show=locked_booking.show,
                seat__in=seats
            ).exclude(booking=locked_booking).filter(
                Q(booking__status=Booking.Status.CONFIRMED) |
                Q(booking__status=Booking.Status.PENDING, booking__created_at__gt=threshold_time)
            )
            
            if booked_by_others.exists():
                locked_payment.status = Payment.Status.FAILED
                locked_payment.save()
                locked_booking.status = Booking.Status.CANCELLED
                locked_booking.save()
                raise serializers.ValidationError("Payment successful but seats are no longer available. Please contact support for a refund.")
                
            locked_booking.status = Booking.Status.CONFIRMED
            locked_booking.save()
            
            # Send payment success notification
            from events.services.notification_service import send_payment_success_notification, send_ticket_issued_notification, send_organizer_booking_notification
            send_payment_success_notification(locked_booking, locked_payment)
            
            # Send organizer notification
            send_organizer_booking_notification(locked_booking, Notification.NotificationType.PAYMENT_SUCCESS)
            
            # Generate the ticket
            ticket = Ticket.generate_ticket(locked_booking)
            
            # Send ticket issued notification
            send_ticket_issued_notification(ticket)
            
        return {
            "detail": "Payment verified successfully.", 
            "booking_status": locked_booking.status,
            "ticket_number": ticket.ticket_number
        }

from .models import Notification

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            'id', 'notification_type', 'channel', 'subject', 'message', 
            'status', 'created_at', 'sent_at'
        ]
        read_only_fields = fields

class TicketDetailSerializer(serializers.ModelSerializer):
    booking_reference = serializers.CharField(source='booking.booking_reference', read_only=True)
    event = serializers.SerializerMethodField()
    show = serializers.SerializerMethodField()
    venue = serializers.SerializerMethodField()
    seats = serializers.SerializerMethodField()
    total_amount = serializers.DecimalField(source='booking.total_amount', max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = Ticket
        fields = [
            'ticket_number', 'status', 'booking_reference', 'event', 'show', 
            'venue', 'seats', 'total_amount', 'issued_at', 'used_at', 'qr_code_image', 'qr_token'
        ]

    def get_event(self, obj):
        return {
            "id": obj.booking.show.event.id,
            "title": obj.booking.show.event.title
        }

    def get_show(self, obj):
        return {
            "id": obj.booking.show.id,
            "date": obj.booking.show.show_date,
            "start_time": obj.booking.show.start_time
        }

    def get_venue(self, obj):
        return {
            "id": obj.booking.show.event.venue.id,
            "name": obj.booking.show.event.venue.name
        }

    def get_seats(self, obj):
        return [
            {
                "row": item.seat.row, 
                "seat_number": item.seat.seat_number, 
                "price": item.price,
                "seat_ticket_number": f"{obj.ticket_number}-{item.seat.row}{item.seat.seat_number}"
            }
            for item in obj.booking.items.all()
        ]

class TicketListSerializer(serializers.ModelSerializer):
    event = serializers.SerializerMethodField()
    show = serializers.SerializerMethodField()
    venue = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = [
            'ticket_number', 'status', 'event', 'show', 
            'venue', 'issued_at', 'used_at'
        ]

    def get_event(self, obj):
        return {
            "id": obj.booking.show.event.id,
            "title": obj.booking.show.event.title
        }

    def get_show(self, obj):
        return {
            "id": obj.booking.show.id,
            "date": obj.booking.show.show_date,
            "start_time": obj.booking.show.start_time
        }

    def get_venue(self, obj):
        return {
            "id": obj.booking.show.event.venue.id,
            "name": obj.booking.show.event.venue.name
        }
