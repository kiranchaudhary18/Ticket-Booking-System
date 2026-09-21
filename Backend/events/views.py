from rest_framework.pagination import PageNumberPagination
from rest_framework import generics, status, filters
from rest_framework.permissions import IsAuthenticated

from accounts.models import Role
from accounts.permissions import (
    IsAdmin,
    IsCustomer,
    IsEventOrganizer,
    IsOrganizer,
    IsVenueOwnerOrAdmin,
)

from .models import Category, Event, Show, Venue, Seat, EventSeatConfiguration
from .serializers import (
    CategoryCreateSerializer,
    CategorySerializer,
    CategoryUpdateSerializer,
    EventCreateSerializer,
    EventSerializer,
    EventDetailSerializer,
    EventStatusSerializer,
    EventUpdateSerializer,
    VenueCreateSerializer,
    VenueSerializer,
    VenueUpdateSerializer,
    ShowSerializer,
    ShowCreateSerializer,
    ShowUpdateSerializer,
    SeatSerializer,
    SeatCreateSerializer,
    SeatBulkCreateSerializer,
    SeatUpdateSerializer,
    EventSeatConfigurationSerializer,
    EventSeatConfigurationBulkSerializer,
)


class CategoryListView(generics.ListAPIView):
    """List event categories (read-only).

    - Accessible to every authenticated role: CUSTOMER, ORGANIZER and ADMIN.
    - Normal users (everyone except ADMIN) see only ACTIVE categories.
    - ADMIN sees the full list, including inactive categories.
    - No create/update/delete is possible through this endpoint (GET only).
    """

    serializer_class = CategorySerializer
    permission_classes = []

    def get_queryset(self):
        queryset = Category.objects.all()
        user = self.request.user
        if user.is_authenticated and getattr(user, 'role', None) == Role.ADMIN:
            return queryset
        return queryset.filter(is_active=True)


class CategoryCreateView(generics.CreateAPIView):
    """ADMIN-only category creation (POST).

    - CUSTOMER and ORGANIZER are denied with 403; anonymous users with 401.
    - Name must be present and unique (case-insensitive).
    - Returns 201 with the created category (including id and timestamps).
    """

    serializer_class = CategoryCreateSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = Category.objects.all()


class CategoryUpdateView(generics.UpdateAPIView):
    """ADMIN-only category update (PUT/PATCH).

    - CUSTOMER and ORGANIZER are denied with 403; anonymous users with 401.
    - Only name/description/is_active can change; the category ID and
      timestamps are read-only.
    - Name must stay unique (case-insensitive, excluding the category
      itself so renaming is possible).
    - Unknown category IDs return 404.
    """

    queryset = Category.objects.all()
    serializer_class = CategoryUpdateSerializer
    permission_classes = [IsAuthenticated, IsAdmin]


class CategorySoftDeleteView(generics.DestroyAPIView):
    """ADMIN-only soft delete for categories (DELETE).

    The database record is never removed: the category is deactivated by
    setting is_active=False, so historical references stay intact and
    ADMIN can re-activate it later via the update API.

    - CUSTOMER and ORGANIZER are denied with 403; anonymous users with 401.
    - Deactivated categories disappear from the normal (non-admin) list.
    - Idempotent: deleting an already-inactive category still returns 204.
    """

    queryset = Category.objects.all()
    permission_classes = [IsAuthenticated, IsAdmin]

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])


class VenueListView(generics.ListAPIView):
    """List event venues (read-only).

    - Accessible to every authenticated role: CUSTOMER, ORGANIZER and ADMIN.
    - Normal users (everyone except ADMIN) see only ACTIVE venues, so an
      ORGANIZER sees their own active venues among the results.
    - ADMIN sees the full list, including inactive venues.
    - No create/update/delete is possible through this endpoint (GET only).
    """

    serializer_class = VenueSerializer
    permission_classes = []

    def get_queryset(self):
        queryset = Venue.objects.all()
        user = self.request.user
        if user.is_authenticated and getattr(user, 'role', None) == Role.ADMIN:
            return queryset
        return queryset.filter(is_active=True)


class VenueCreateView(generics.CreateAPIView):
    """ORGANIZER-only venue creation (POST).

    - Only authenticated ORGANIZER users can create a venue. CUSTOMER and
      ADMIN are denied with 403; anonymous users with 401.
    - ``organizer`` is set automatically from ``request.user``; any
      ``organizer`` field supplied in the request body is ignored.
    - ``name``, ``address``, ``city`` and ``state`` are required.
    - ``pincode`` must be a valid 6-digit Indian pincode.
    - ``capacity`` must be a positive integer.
    - ``description`` and ``venue_type`` are optional.
    - Returns 201 with the created venue on success.
    """

    serializer_class = VenueCreateSerializer
    permission_classes = [IsAuthenticated, IsOrganizer]

    def perform_create(self, serializer):
        serializer.save(organizer=self.request.user)


class VenueUpdateView(generics.UpdateAPIView):
    """ORGANIZER-owner / ADMIN venue update (PUT/PATCH).

    - Only the ORGANIZER who owns the venue, or an ADMIN, can update it.
    - CUSTOMER is denied with 403; anonymous users with 401.
    - An ORGANIZER cannot update another organizer's venue.
    - ``organizer`` and ``is_active`` are read-only: use the soft-delete
      endpoint to deactivate a venue.
    - ``name``, ``address``, ``city``, ``state``, ``pincode`` and ``capacity``
      follow the same validation rules as creation.
    - Unknown venue IDs return 404.
    """

    queryset = Venue.objects.all()
    serializer_class = VenueUpdateSerializer
    permission_classes = [IsAuthenticated, IsVenueOwnerOrAdmin]


class VenueSoftDeleteView(generics.DestroyAPIView):
    """ORGANIZER-owner / ADMIN soft delete for venues (DELETE).

    The database record is never removed: the venue is deactivated by
    setting ``is_active=False``, so historical references stay intact and
    the venue can be re-activated later (via an update endpoint).

    - Only the ORGANIZER who owns the venue, or an ADMIN, can deactivate it.
    - CUSTOMER is denied with 403; anonymous users with 401.
    - An ORGANIZER cannot deactivate another organizer's venue.
    - Inactive venues disappear from the normal (non-admin) listing.
    - Idempotent: deleting an already-inactive venue still returns 204.
    """

    queryset = Venue.objects.all()
    permission_classes = [IsVenueOwnerOrAdmin]

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])



class EventPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 50

class EventListView(generics.ListAPIView):
    """List events (read-only).

    - Accessible to every authenticated role: CUSTOMER, ORGANIZER and ADMIN.
    - Normal users (everyone except ADMIN) see only ACTIVE and PUBLISHED
      events, so DRAFT, CANCELLED and inactive events stay hidden.
    - ADMIN sees the full list, including drafts, cancelled and inactive
      events.
    - No create/update/delete is possible through this endpoint (GET only).
    """

    serializer_class = EventSerializer
    permission_classes = []
    filter_backends = [filters.SearchFilter]
    search_fields = ['title', 'description']
    pagination_class = EventPagination

    def get_queryset(self):
        from django.db.models import Q
        from django.core.exceptions import ValidationError
        queryset = Event.objects.all()
        
        query_params = self.request.query_params
        category = query_params.get('category')
        city = query_params.get('city')
        state = query_params.get('state')
        language = query_params.get('language')
        start_date = query_params.get('start_date')
        end_date = query_params.get('end_date')
        age_limit = query_params.get('age_limit')

        try:
            if category:
                if category.isdigit():
                    queryset = queryset.filter(category_id=category)
                else:
                    return queryset.none()
            if city:
                queryset = queryset.filter(venue__city__iexact=city)
            if state:
                queryset = queryset.filter(venue__state__iexact=state)
            if language:
                queryset = queryset.filter(language__iexact=language)
            if start_date:
                queryset = queryset.filter(start_date__gte=start_date)
            if end_date:
                queryset = queryset.filter(end_date__lte=end_date)
            if age_limit:
                if age_limit.isdigit():
                    queryset = queryset.filter(age_limit__gte=age_limit)
                else:
                    return queryset.none()
        except (ValueError, ValidationError):
            return queryset.none()

        sort = query_params.get('sort')
        sort_mapping = {
            'newest': '-created_at',
            'oldest': 'created_at',
            'event_date_asc': 'start_date',
            'event_date_desc': '-start_date',
            'title_asc': 'title',
            'title_desc': '-title',
        }
        order_by_field = sort_mapping.get(sort, '-created_at')

        from django.utils import timezone
        now = timezone.now()

        user = self.request.user
        if user.is_authenticated and getattr(user, 'role', None) == Role.ADMIN:
            return queryset.order_by(order_by_field)
        elif user.is_authenticated and getattr(user, 'role', None) == Role.ORGANIZER:
            return queryset.filter(
                Q(organizer=user) | 
                Q(is_active=True, status=Event.Status.PUBLISHED, end_date__gte=now)
            ).order_by(order_by_field)
        else:
            return queryset.filter(
                is_active=True,
                status=Event.Status.PUBLISHED,
                end_date__gte=now
            ).order_by(order_by_field)



class EventDetailView(generics.RetrieveAPIView):
    """Retrieve detailed event information (GET).

    - CUSTOMER can view only active PUBLISHED events.
    - ORGANIZER can view their own events (including DRAFT/inactive) + other active PUBLISHED events.
    - ADMIN sees all events.
    """
    serializer_class = EventDetailSerializer
    permission_classes = []

    def get_queryset(self):
        from django.db.models import Q
        queryset = Event.objects.select_related('category', 'venue')
        user = self.request.user
        
        if user.is_authenticated and getattr(user, 'role', None) == Role.ADMIN:
            return queryset
        elif user.is_authenticated and getattr(user, 'role', None) == Role.ORGANIZER:
            return queryset.filter(
                Q(organizer=user) | 
                Q(is_active=True, status=Event.Status.PUBLISHED)
            )
        else:
            return queryset.filter(
                is_active=True,
                status=Event.Status.PUBLISHED,
            )


class EventCreateView(generics.CreateAPIView):
    """ORGANIZER-only event creation (POST).

    - Only authenticated ORGANIZER users can create an event. CUSTOMER and
      ADMIN are denied with 403; anonymous users with 401.
    - ``organizer`` is set automatically from ``request.user``; any
      ``organizer`` field supplied in the request body is ignored.
    - ``category`` must reference an existing Category.
    - ``venue`` must reference an existing Venue owned by the organizer.
    - ``title`` and ``description`` are required.
    - ``start_date`` must be before ``end_date``.
    - ``age_limit`` must be a positive integer when provided.
    - ``status`` defaults to DRAFT.
    - Returns 201 with the created event on success.
    """

    serializer_class = EventCreateSerializer
    permission_classes = [IsAuthenticated, IsOrganizer]

    def perform_create(self, serializer):
        serializer.save(organizer=self.request.user)


class EventUpdateView(generics.UpdateAPIView):
    """ORGANIZER-owner event update (PUT and PATCH). Owner only."""

    queryset = Event.objects.all()
    serializer_class = EventUpdateSerializer
    permission_classes = [IsAuthenticated, IsEventOrganizer]


class EventStatusView(generics.UpdateAPIView):
    """ORGANIZER-owner event status management (PUT and PATCH). Owner only.

    - Only ``status`` is writable (DRAFT, PUBLISHED, CANCELLED); every
      other field is read-only and the event ``organizer`` can never
      change through this endpoint.
    - Publishing validates: category exists and is active, venue exists
      and is active, title/description present, start_date < end_date,
      end_date in the future, age_limit valid.
    - Cancelling never hard-deletes: status becomes CANCELLED and the
      event is safely deactivated (is_active=False) so the record stays
      in the database for later bookings history; cancelled events are
      hidden from normal published listings.
    - CUSTOMER and ADMIN are denied with 403; anonymous with 401.
      Another organizer's event returns 403; unknown IDs return 404.
    """

    queryset = Event.objects.all()
    serializer_class = EventStatusSerializer
    permission_classes = [IsAuthenticated, IsEventOrganizer]
    http_method_names = ["put", "patch", "head", "options"]


class ShowListView(generics.ListAPIView):
    """List shows (read-only).

    - Accessible to every authenticated role.
    - CUSTOMER: view shows only for active PUBLISHED events (inactive shows/cancelled events hidden).
    - ORGANIZER: view shows belonging to their own events, including DRAFT and inactive shows.
    - ADMIN: view all shows.
    """

    serializer_class = ShowSerializer
    permission_classes = []

    def get_queryset(self):
        from django.db.models import Q
        queryset = Show.objects.all()
        user = self.request.user
        
        if user.is_authenticated and getattr(user, 'role', None) == Role.ADMIN:
            return queryset
        elif user.is_authenticated and getattr(user, 'role', None) == Role.ORGANIZER:
            # Organizers can see all shows for their own events.
            return queryset.filter(event__organizer=user)
        else:
            # Customers only see active shows for active, published events.
            return queryset.filter(
                is_active=True,
                event__is_active=True,
                event__status=Event.Status.PUBLISHED,
            )


class ShowCreateView(generics.CreateAPIView):
    """ORGANIZER-only show creation (POST).

    - Only authenticated ORGANIZER users can create a show.
    - Event must belong to the logged-in ORGANIZER.
    - Event must be active and not CANCELLED.
    """

    serializer_class = ShowCreateSerializer
    permission_classes = [IsAuthenticated, IsOrganizer]


class ShowUpdateView(generics.UpdateAPIView):
    """ORGANIZER-only show update (PUT/PATCH).

    - Only authenticated ORGANIZER users can update.
    - Organizer can only update shows for their own events.
    """
    serializer_class = ShowUpdateSerializer
    permission_classes = [IsAuthenticated, IsOrganizer]

    def get_queryset(self):
        # Naturally restricts to the logged-in organizer's shows
        return Show.objects.filter(event__organizer=self.request.user)

class ShowSoftDeleteView(generics.DestroyAPIView):
    """ORGANIZER-only soft-delete API.

    Sets is_active=False instead of removing the record from the database.
    - Only authenticated ORGANIZER users can deactivate a show.
    - Organizer can only deactivate shows for their own events.
    """
    permission_classes = [IsAuthenticated, IsOrganizer]

    def get_queryset(self):
        return Show.objects.filter(event__organizer=self.request.user)

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])

class SeatListView(generics.ListAPIView):
    """List seats (read-only).
    
    - CUSTOMER sees only active seats belonging to active venues.
    - ORGANIZER sees all seats for venues they own, plus active public seats.
    - ADMIN sees all seats.
    """
    serializer_class = SeatSerializer
    permission_classes = []
    
    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated and getattr(user, 'role', None) == Role.ADMIN:
            return Seat.objects.all()
        elif user.is_authenticated and getattr(user, 'role', None) == Role.ORGANIZER:
            from django.db.models import Q
            return Seat.objects.filter(Q(venue__organizer=user) | Q(is_active=True, venue__is_active=True))
        return Seat.objects.filter(is_active=True, venue__is_active=True)

class SeatCreateView(generics.CreateAPIView):
    """ORGANIZER-only seat creation API.
    
    - Only authenticated ORGANIZER users can create seats.
    - Organizer can only create seats for venues they own.
    """
    serializer_class = SeatCreateSerializer
    permission_classes = [IsAuthenticated, IsOrganizer]

class SeatBulkCreateView(generics.CreateAPIView):
    """ORGANIZER-only bulk seat creation API.
    
    - Creates multiple seats at once.
    - Organizer can only create seats for venues they own.
    """
    serializer_class = SeatBulkCreateSerializer
    permission_classes = [IsAuthenticated, IsOrganizer]

class SeatUpdateView(generics.UpdateAPIView):
    """ORGANIZER-only seat update API.
    
    - Organizer can only update seats for venues they own.
    - Venue cannot be changed.
    """
    serializer_class = SeatUpdateSerializer
    permission_classes = [IsAuthenticated, IsOrganizer]

    def get_queryset(self):
        return Seat.objects.filter(venue__organizer=self.request.user)

class SeatSoftDeleteView(generics.DestroyAPIView):
    """ORGANIZER-only seat soft-delete API.
    
    - Sets is_active=False.
    """
    permission_classes = [IsAuthenticated, IsOrganizer]

    def get_queryset(self):
        return Seat.objects.filter(venue__organizer=self.request.user)

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])

from .serializers import WishlistCreateSerializer, WishlistListSerializer
from .models import Wishlist

class WishlistListCreateAPIView(generics.ListCreateAPIView):
    """
    POST /api/events/wishlists/
    Add an Event to the logged-in customer's wishlist.
    GET /api/events/wishlists/
    Get the logged-in customer's wishlist.
    """
    permission_classes = [IsAuthenticated, IsCustomer]

    def get_serializer_class(self):
        if self.request.method == "GET":
            return WishlistListSerializer
        return WishlistCreateSerializer

    def get_queryset(self):
        return Wishlist.objects.filter(
            customer=self.request.user,
            event__status=Event.Status.PUBLISHED,
            event__is_active=True
        ).select_related('event', 'event__category', 'event__venue')

    def perform_create(self, serializer):
        serializer.save(customer=self.request.user)

class WishlistDeleteAPIView(generics.DestroyAPIView):
    """
    DELETE /api/events/wishlists/<id>/delete/
    Remove a specific wishlist entry.
    """
    permission_classes = [IsAuthenticated, IsCustomer]

    def get_queryset(self):
        # Customers can only delete their own wishlist entries
        return Wishlist.objects.filter(customer=self.request.user)

from .serializers import BookingCreateSerializer
from .models import Booking

class BookingCreateView(generics.CreateAPIView):
    """
    POST /api/events/bookings/create/
    Create a new booking for the logged-in customer.
      end_date in the future, age_limit valid.
    - Cancelling never hard-deletes: status becomes CANCELLED and the
      event is safely deactivated (is_active=False) so the record stays
      in the database for later bookings history; cancelled events are
      hidden from normal published listings.
    - CUSTOMER and ADMIN are denied with 403; anonymous with 401.
      Another organizer's event returns 403; unknown IDs return 404.
    """

    queryset = Event.objects.all()
    serializer_class = EventStatusSerializer
    permission_classes = [IsAuthenticated, IsEventOrganizer]
    http_method_names = ["put", "patch", "head", "options"]


class ShowListView(generics.ListAPIView):
    """List shows (read-only).

    - Accessible to every authenticated role.
    - CUSTOMER: view shows only for active PUBLISHED events (inactive shows/cancelled events hidden).
    - ORGANIZER: view shows belonging to their own events, including DRAFT and inactive shows.
    - ADMIN: view all shows.
    """

    serializer_class = ShowSerializer
    permission_classes = []

    def get_queryset(self):
        from django.db.models import Q
        queryset = Show.objects.all()
        user = self.request.user
        
        if user.is_authenticated and user.role == Role.ADMIN:
            return queryset
        elif user.is_authenticated and user.role == Role.ORGANIZER:
            # Organizers can see all shows for their own events.
            return queryset.filter(event__organizer=user)
        else:
            # Customers only see active shows for active, published events.
            return queryset.filter(
                is_active=True,
                event__is_active=True,
                event__status=Event.Status.PUBLISHED,
            )


class ShowCreateView(generics.CreateAPIView):
    """ORGANIZER-only show creation (POST).

    - Only authenticated ORGANIZER users can create a show.
    - Event must belong to the logged-in ORGANIZER.
    - Event must be active and not CANCELLED.
    """

    serializer_class = ShowCreateSerializer
    permission_classes = [IsAuthenticated, IsOrganizer]


class ShowUpdateView(generics.UpdateAPIView):
    """ORGANIZER-only show update (PUT/PATCH).

    - Only authenticated ORGANIZER users can update.
    - Organizer can only update shows for their own events.
    """
    serializer_class = ShowUpdateSerializer
    permission_classes = [IsAuthenticated, IsOrganizer]

    def get_queryset(self):
        # Naturally restricts to the logged-in organizer's shows
        return Show.objects.filter(event__organizer=self.request.user)

class ShowSoftDeleteView(generics.DestroyAPIView):
    """ORGANIZER-only soft-delete API.

    Sets is_active=False instead of removing the record from the database.
    - Only authenticated ORGANIZER users can deactivate a show.
    - Organizer can only deactivate shows for their own events.
    """
    permission_classes = [IsAuthenticated, IsOrganizer]

    def get_queryset(self):
        return Show.objects.filter(event__organizer=self.request.user)

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])

class SeatListView(generics.ListAPIView):
    """List seats (read-only).
    
    - CUSTOMER sees only active seats belonging to active venues.
    - ORGANIZER sees all seats for venues they own, plus active public seats.
    - ADMIN sees all seats.
    """
    serializer_class = SeatSerializer
    permission_classes = []
    
    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated and getattr(user, 'role', None) == Role.ADMIN:
            return Seat.objects.all()
        elif user.is_authenticated and getattr(user, 'role', None) == Role.ORGANIZER:
            from django.db.models import Q
            return Seat.objects.filter(Q(venue__organizer=user) | Q(is_active=True, venue__is_active=True))
        return Seat.objects.filter(is_active=True, venue__is_active=True)

class SeatCreateView(generics.CreateAPIView):
    """ORGANIZER-only seat creation API.
    
    - Only authenticated ORGANIZER users can create seats.
    - Organizer can only create seats for venues they own.
    """
    serializer_class = SeatCreateSerializer
    permission_classes = [IsAuthenticated, IsOrganizer]

class SeatBulkCreateView(generics.CreateAPIView):
    """ORGANIZER-only bulk seat creation API.
    
    - Creates multiple seats at once.
    - Organizer can only create seats for venues they own.
    """
    serializer_class = SeatBulkCreateSerializer
    permission_classes = [IsAuthenticated, IsOrganizer]

class SeatUpdateView(generics.UpdateAPIView):
    """ORGANIZER-only seat update API.
    
    - Organizer can only update seats for venues they own.
    - Venue cannot be changed.
    """
    serializer_class = SeatUpdateSerializer
    permission_classes = [IsAuthenticated, IsOrganizer]

    def get_queryset(self):
        return Seat.objects.filter(venue__organizer=self.request.user)

class SeatSoftDeleteView(generics.DestroyAPIView):
    """ORGANIZER-only seat soft-delete API.
    
    - Sets is_active=False.
    """
    permission_classes = [IsAuthenticated, IsOrganizer]

    def get_queryset(self):
        return Seat.objects.filter(venue__organizer=self.request.user)

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])

from .serializers import WishlistCreateSerializer, WishlistListSerializer
from .models import Wishlist

class WishlistListCreateAPIView(generics.ListCreateAPIView):
    """
    POST /api/events/wishlists/
    Add an Event to the logged-in customer's wishlist.
    GET /api/events/wishlists/
    Get the logged-in customer's wishlist.
    """
    permission_classes = [IsAuthenticated, IsCustomer]

    def get_serializer_class(self):
        if self.request.method == "GET":
            return WishlistListSerializer
        return WishlistCreateSerializer

    def get_queryset(self):
        return Wishlist.objects.filter(
            customer=self.request.user,
            event__status=Event.Status.PUBLISHED,
            event__is_active=True
        ).select_related('event', 'event__category', 'event__venue')

    def perform_create(self, serializer):
        serializer.save(customer=self.request.user)

class WishlistDeleteAPIView(generics.DestroyAPIView):
    """
    DELETE /api/events/wishlists/<id>/delete/
    Remove a specific wishlist entry.
    """
    permission_classes = [IsAuthenticated, IsCustomer]

    def get_queryset(self):
        # Customers can only delete their own wishlist entries
        return Wishlist.objects.filter(customer=self.request.user)

from .serializers import BookingCreateSerializer
from .models import Booking

class BookingCreateView(generics.CreateAPIView):
    """
    POST /api/events/bookings/create/
    Create a new booking for the logged-in customer.
    """
    queryset = Booking.objects.all()
    serializer_class = BookingCreateSerializer
    permission_classes = [IsAuthenticated, IsCustomer]

    def perform_create(self, serializer):
        serializer.save(customer=self.request.user)

from .serializers import BookingListSerializer

class BookingListView(generics.ListAPIView):
    """
    GET /api/events/bookings/
    Get bookings for the logged-in customer.
    Supports status filtering via query parameter: ?status=PENDING
    """
    serializer_class = BookingListSerializer
    permission_classes = [IsAuthenticated, IsCustomer]

    def get_queryset(self):
        queryset = Booking.objects.filter(customer=self.request.user).select_related(
            'show', 'show__event', 'show__event__venue', 'show__event__category'
        ).prefetch_related('items', 'items__seat')
        
        status_param = self.request.query_params.get('status')
        if status_param and status_param in dict(Booking.Status.choices):
            queryset = queryset.filter(status=status_param)
            
        return queryset.order_by('-created_at')

from accounts.permissions import IsBookingOwnerOrOrganizerOrAdmin
from django.shortcuts import get_object_or_404

class BookingDetailView(generics.RetrieveAPIView):
    """
    GET /api/events/bookings/<id_or_ref>/
    Retrieve booking details by ID or booking_reference.
    """
    serializer_class = BookingListSerializer
    permission_classes = [IsAuthenticated, IsBookingOwnerOrOrganizerOrAdmin]
    lookup_field = 'booking_reference'

    def get_object(self):
        queryset = self.filter_queryset(self.get_queryset())
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        lookup_value = self.kwargs[lookup_url_kwarg]
        
        # Try finding by PK if it's an integer
        if str(lookup_value).isdigit():
            obj = queryset.filter(pk=lookup_value).first()
            if obj:
                self.check_object_permissions(self.request, obj)
                return obj
                
        # Fallback to booking_reference
        obj = get_object_or_404(queryset, booking_reference=lookup_value)
        self.check_object_permissions(self.request, obj)
        return obj

    def get_queryset(self):
        return Booking.objects.all().select_related(
            'show', 'show__event', 'show__event__venue', 'show__event__category'
        ).prefetch_related('items', 'items__seat')

from rest_framework.response import Response
from rest_framework import status

class BookingCancelView(generics.GenericAPIView):
    """
    POST /api/events/bookings/<id_or_ref>/cancel/
    Cancel a booking.
    """
    permission_classes = [IsAuthenticated]
    lookup_field = 'booking_reference'

    def get_queryset(self):
        user = self.request.user
        if getattr(user, 'role', None) == Role.ADMIN:
            return Booking.objects.all()
        elif getattr(user, 'role', None) == Role.CUSTOMER:
            return Booking.objects.filter(customer=user)
        return Booking.objects.none()

    def get_object(self):
        queryset = self.filter_queryset(self.get_queryset())
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        lookup_value = self.kwargs[lookup_url_kwarg]
        
        if str(lookup_value).isdigit():
            obj = queryset.filter(pk=lookup_value).first()
            if obj:
                self.check_object_permissions(self.request, obj)
                return obj
                
        obj = get_object_or_404(queryset, booking_reference=lookup_value)
        self.check_object_permissions(self.request, obj)
        return obj

    def post(self, request, *args, **kwargs):
        booking = self.get_object()
        
        if booking.status == Booking.Status.CANCELLED:
            return Response(
                {"detail": "Booking is already cancelled."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        from django.db import transaction
        with transaction.atomic():
            booking.status = Booking.Status.CANCELLED
            booking.save(update_fields=['status', 'updated_at'])
            
            # Send cancellation notification
            from events.services.notification_service import send_booking_cancelled_notification, send_organizer_booking_notification
            from .models import Notification
            send_booking_cancelled_notification(booking)
            send_organizer_booking_notification(booking, Notification.NotificationType.BOOKING_CANCELLED)
            
        return Response({"detail": "Booking cancelled successfully.", "status": booking.status}, status=status.HTTP_200_OK)

from .serializers import SeatLockCreateSerializer

class SeatLockCreateView(generics.CreateAPIView):
    """
    POST /api/events/seat-locks/create/
    Lock seats for a short duration during checkout.
    """
    serializer_class = SeatLockCreateSerializer
    permission_classes = [IsAuthenticated, IsCustomer]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = serializer.save()
        return Response(result, status=status.HTTP_201_CREATED)

from rest_framework.views import APIView
from django.db.models import Exists, OuterRef, Q
from django.utils import timezone
from .models import SeatLock, BookingItem

class ShowAvailableSeatsView(APIView):
    """
    GET /api/events/shows/<pk>/available-seats/
    Return seat availability for a Show.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        show = get_object_or_404(Show.objects.select_related('event__venue'), pk=pk)
        venue = show.event.venue

        from django.conf import settings
        from datetime import timedelta
        lock_duration = getattr(settings, 'SEAT_LOCK_DURATION_MINUTES', 10)
        threshold_time = timezone.now() - timedelta(minutes=lock_duration)

        booked_seats = BookingItem.objects.filter(
            booking__show=show,
            seat_id=OuterRef('pk')
        ).filter(
            Q(booking__status=Booking.Status.CONFIRMED) |
            Q(booking__status=Booking.Status.PENDING, booking__created_at__gt=threshold_time)
        )

        active_locks = SeatLock.objects.filter(
            show=show,
            seat_id=OuterRef('pk'),
            expires_at__gt=timezone.now()
        )

        event_seats = EventSeatConfiguration.objects.filter(
            event=show.event, 
            seat_id=OuterRef('pk')
        )

        seats = Seat.objects.filter(venue=venue).annotate(
            is_booked=Exists(booked_seats),
            is_locked=Exists(active_locks),
            event_seat_type=Subquery(event_seats.values('seat_type')[:1]),
            event_seat_price=Subquery(event_seats.values('price')[:1]),
            event_seat_is_active=Subquery(event_seats.values('is_active')[:1]),
            has_event_config=Exists(event_seats)
        ).order_by('row', 'seat_number')

        data = []
        for seat in seats:
            status = 'AVAILABLE'
            is_seat_active = seat.event_seat_is_active if seat.has_event_config else seat.is_active
            
            if not is_seat_active or not venue.is_active:
                status = 'UNAVAILABLE'
            elif seat.is_booked:
                status = 'BOOKED'
            elif seat.is_locked:
                status = 'LOCKED'
                
            data.append({
                'id': seat.id,
                'row': seat.row,
                'seat_number': seat.seat_number,
                'seat_type': seat.event_seat_type if seat.has_event_config else seat.seat_type,
                'price': str(seat.event_seat_price) if seat.has_event_config else str(seat.price),
                'status': status
            })

        return Response(data)

from .serializers import SeatLockReleaseSerializer

class SeatLockReleaseView(generics.GenericAPIView):
    """
    POST /api/events/seat-locks/release/
    Release active locks for specific seats on a show.
    """
    serializer_class = SeatLockReleaseSerializer
    permission_classes = [IsAuthenticated, IsCustomer]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        show = serializer.validated_data['show']
        seats = serializer.validated_data['seats']
        
        with transaction.atomic():
            locks = SeatLock.objects.filter(
                customer=request.user,
                show=show,
                seat__in=seats
            )
            deleted, _ = locks.delete()
            
        return Response({"detail": f"Successfully released {deleted} lock(s)."}, status=status.HTTP_200_OK)

from .serializers import PaymentOrderCreateSerializer

class PaymentOrderCreateView(generics.CreateAPIView):
    """
    POST /api/events/payments/create-order/
    Create a Razorpay payment order for a booking.
    """
    serializer_class = PaymentOrderCreateSerializer
    permission_classes = [IsAuthenticated, IsCustomer]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        result = serializer.save()
        return Response(result, status=status.HTTP_201_CREATED)

from .serializers import PaymentVerificationSerializer

class PaymentVerificationView(generics.GenericAPIView):
    """
    POST /api/events/payments/verify/
    Verify a Razorpay payment order for a booking.
    """
    serializer_class = PaymentVerificationSerializer
    permission_classes = [IsAuthenticated, IsCustomer]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        result = serializer.save()
        return Response(result, status=status.HTTP_200_OK)

import json
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from .services.razorpay_service import RazorpayService
from .models import Payment, Ticket

class RazorpayWebhookView(APIView):
    """
    POST /api/events/payments/webhook/
    Webhook for receiving events from Razorpay.
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request, *args, **kwargs):
        razorpay_signature = request.headers.get('x-razorpay-signature')
        if not razorpay_signature:
            return Response({"detail": "Missing signature"}, status=status.HTTP_400_BAD_REQUEST)

        body = request.body.decode('utf-8')
        
        razorpay_service = RazorpayService()
        try:
            is_valid = razorpay_service.verify_webhook_signature(body, razorpay_signature)
        except ValueError as e:
             return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
             
        if not is_valid:
            return Response({"detail": "Invalid signature"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            payload = json.loads(body)
        except json.JSONDecodeError:
            return Response({"detail": "Invalid JSON"}, status=status.HTTP_400_BAD_REQUEST)
            
        event = payload.get('event')
        
        if event == 'payment.captured' or event == 'order.paid':
            payment_entity = payload.get('payload', {}).get('payment', {}).get('entity', {})
            razorpay_order_id = payment_entity.get('order_id')
            razorpay_payment_id = payment_entity.get('id')
            
            if razorpay_order_id:
                try:
                    with transaction.atomic():
                        payment = Payment.objects.select_for_update().get(gateway_order_id=razorpay_order_id)
                        if payment.status != Payment.Status.SUCCESS:
                            payment.status = Payment.Status.SUCCESS
                            payment.gateway_payment_id = razorpay_payment_id
                            payment.save()
                            
                            booking = Booking.objects.select_for_update().get(id=payment.booking_id)
                            if booking.status != Booking.Status.CANCELLED:
                                booking.status = Booking.Status.CONFIRMED
                                booking.save()
                                
                                # Send payment success notification
                                from events.services.notification_service import send_payment_success_notification, send_ticket_issued_notification, send_organizer_booking_notification
                                send_payment_success_notification(booking, payment)
                                send_organizer_booking_notification(booking, Notification.NotificationType.PAYMENT_SUCCESS)
                                
                                ticket = Ticket.generate_ticket(booking)
                                
                                # Send ticket issued notification
                                send_ticket_issued_notification(ticket)
                except Payment.DoesNotExist:
                    pass
                    
        elif event == 'payment.failed':
            payment_entity = payload.get('payload', {}).get('payment', {}).get('entity', {})
            razorpay_order_id = payment_entity.get('order_id')
            
            if razorpay_order_id:
                try:
                    with transaction.atomic():
                        payment = Payment.objects.select_for_update().get(gateway_order_id=razorpay_order_id)
                        if payment.status not in [Payment.Status.SUCCESS, Payment.Status.REFUNDED]:
                            payment.status = Payment.Status.FAILED
                            payment.save()
                except Payment.DoesNotExist:
                    pass
        
        
        # Always return 200 to acknowledge receipt if signature is valid
        return Response({"status": "ok"}, status=status.HTTP_200_OK)

from .serializers import TicketDetailSerializer, TicketListSerializer
from accounts.models import Role

class TicketDetailView(generics.RetrieveAPIView):
    """
    GET /api/events/tickets/<ticket_number>/
    Retrieve a specific ticket.
    """
    serializer_class = TicketDetailSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'ticket_number'

    def get_queryset(self):
        user = self.request.user
        queryset = Ticket.objects.select_related(
            'booking', 'booking__show', 'booking__show__event', 'booking__show__event__venue'
        ).prefetch_related('booking__items__seat')
        
        if user.role == Role.CUSTOMER:
            return queryset.filter(booking__customer=user)
        elif user.role == Role.ORGANIZER:
            return queryset.filter(booking__show__event__organizer=user)
        elif user.role == Role.ADMIN:
            return queryset
        
        return queryset.none()

class CustomerTicketListView(generics.ListAPIView):
    """
    GET /api/events/tickets/my/
    List tickets belonging to the logged in customer.
    """
    serializer_class = TicketListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        
        # Only CUSTOMER can access this specific endpoint
        if user.role != Role.CUSTOMER:
            return Ticket.objects.none()
            
        queryset = Ticket.objects.select_related(
            'booking', 'booking__show', 'booking__show__event', 'booking__show__event__venue'
        ).filter(booking__customer=user).order_by('-issued_at')
        
        # Optional Status Filtering
        status_filter = self.request.query_params.get('status')
        if status_filter in [choice[0] for choice in Ticket.Status.choices]:
            queryset = queryset.filter(status=status_filter)
            
        return queryset

import uuid

class TicketVerificationView(APIView):
    """
    POST /api/events/tickets/verify/
    Verify a ticket using its secure QR token and return detailed status.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        user = request.user
        
        if user.role == Role.CUSTOMER:
            return Response({"status": "UNAUTHORIZED", "detail": "Customers are not allowed to verify tickets."}, status=status.HTTP_403_FORBIDDEN)
            
        qr_token = request.data.get('qr_token')
        if not qr_token:
            return Response({"status": "INVALID", "detail": "qr_token is required."}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            uuid_obj = uuid.UUID(str(qr_token))
        except ValueError:
            return Response({"status": "INVALID", "detail": "Invalid token format."}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            ticket = Ticket.objects.select_related(
                'booking', 'booking__show', 'booking__show__event', 'booking__show__event__venue'
            ).prefetch_related('booking__items__seat').get(qr_token=uuid_obj)
        except Ticket.DoesNotExist:
            return Response({"status": "INVALID", "detail": "Ticket not found."}, status=status.HTTP_404_NOT_FOUND)
            
        # 1. Authorization
        if user.role == Role.ORGANIZER and ticket.booking.show.event.organizer != user:
            return Response({"status": "UNAUTHORIZED", "detail": "You do not have permission to verify tickets for this event."}, status=status.HTTP_403_FORBIDDEN)
            
        # 2. Status Validation
        if ticket.status == Ticket.Status.CANCELLED:
            return Response({
                "status": "CANCELLED", 
                "detail": "This ticket has been cancelled and cannot be checked in.",
                "ticket": TicketDetailSerializer(ticket).data
            }, status=status.HTTP_200_OK)
            
        if ticket.status == Ticket.Status.USED:
            return Response({
                "status": "ALREADY_CHECKED_IN", 
                "detail": "This ticket was already checked in.",
                "ticket": TicketDetailSerializer(ticket).data
            }, status=status.HTTP_200_OK)

        # 3. Payment Validation
        # Assuming we need to check if booking is confirmed
        if hasattr(ticket.booking, 'status') and ticket.booking.status != 'CONFIRMED':
            return Response({
                "status": "PAYMENT_PENDING", 
                "detail": "This ticket payment has not been completed.",
                "ticket": TicketDetailSerializer(ticket).data
            }, status=status.HTTP_200_OK)

        # 4. Date Validation
        today = timezone.localtime(timezone.now()).date()
        show_date = ticket.booking.show.show_date
        
        if show_date != today:
            return Response({
                "status": "WRONG_DATE", 
                "detail": f"Check-in is not available yet. This ticket is valid for {show_date.strftime('%B %d, %Y')}.",
                "ticket": TicketDetailSerializer(ticket).data
            }, status=status.HTTP_200_OK)
            
        # 5. Valid
        return Response({
            "status": "VALID",
            "detail": "Ticket is valid for today.",
            "ticket": TicketDetailSerializer(ticket).data
        }, status=status.HTTP_200_OK)


class TicketCheckInView(APIView):
    """
    POST /api/events/tickets/checkin/
    Check-in a ticket using its secure QR token, marking it as USED.
    Uses select_for_update for concurrency control.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        user = request.user
        
        if user.role == Role.CUSTOMER:
            return Response({"status": "UNAUTHORIZED", "detail": "Customers are not allowed to check-in tickets."}, status=status.HTTP_403_FORBIDDEN)
            
        qr_token = request.data.get('qr_token')
        if not qr_token:
            return Response({"status": "INVALID", "detail": "qr_token is required."}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            uuid_obj = uuid.UUID(str(qr_token))
        except ValueError:
            return Response({"status": "INVALID", "detail": "Invalid token format."}, status=status.HTTP_400_BAD_REQUEST)
            
        with transaction.atomic():
            try:
                ticket = Ticket.objects.select_for_update().select_related(
                    'booking', 'booking__show', 'booking__show__event', 'booking__show__event__venue'
                ).get(qr_token=uuid_obj)
            except Ticket.DoesNotExist:
                return Response({"status": "INVALID", "detail": "Ticket not found."}, status=status.HTTP_404_NOT_FOUND)
                
            # 1. Authorization
            if user.role == Role.ORGANIZER and ticket.booking.show.event.organizer != user:
                return Response({"status": "UNAUTHORIZED", "detail": "You do not have permission to check-in tickets for this event."}, status=status.HTTP_403_FORBIDDEN)
                
            # 2. Status Validation
            if ticket.status == Ticket.Status.CANCELLED:
                return Response({"status": "CANCELLED", "detail": "This ticket has been cancelled and cannot be checked in."}, status=status.HTTP_400_BAD_REQUEST)
                
            if ticket.status == Ticket.Status.USED:
                return Response({"status": "ALREADY_CHECKED_IN", "detail": "Ticket already checked in."}, status=status.HTTP_400_BAD_REQUEST)

            # 3. Payment Validation
            if hasattr(ticket.booking, 'status') and ticket.booking.status != 'CONFIRMED':
                return Response({"status": "PAYMENT_PENDING", "detail": "This ticket payment has not been completed."}, status=status.HTTP_400_BAD_REQUEST)

            # 4. Date Validation
            today = timezone.localtime(timezone.now()).date()
            show_date = ticket.booking.show.show_date
            
            if show_date != today:
                return Response({"status": "WRONG_DATE", "detail": f"Check-in is not available. This ticket is valid for {show_date.strftime('%B %d, %Y')}."}, status=status.HTTP_400_BAD_REQUEST)
                
            # 5. Success
            ticket.status = Ticket.Status.USED
            ticket.used_at = timezone.now()
            ticket.save()
            
            serializer = TicketDetailSerializer(ticket)
            return Response({
                "status": "CHECKED_IN",
                "detail": "Ticket checked in successfully.",
                "ticket": serializer.data
            }, status=status.HTTP_200_OK)

from .serializers import NotificationSerializer
from .models import Notification

from rest_framework.pagination import PageNumberPagination

class NotificationPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 50

class NotificationListView(generics.ListAPIView):
    """
    GET /api/events/notifications/
    List notifications for the authenticated user.
    """
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = NotificationPagination
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['created_at', 'sent_at']
    ordering = ['-created_at']

    def get_queryset(self):
        queryset = Notification.objects.filter(user=self.request.user)
        notification_type = self.request.query_params.get('notification_type')
        status_filter = self.request.query_params.get('status')
        
        if notification_type:
            queryset = queryset.filter(notification_type=notification_type)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
            
        return queryset

from decimal import Decimal
from django.db.models import Sum, Count, F
from django.db.models.functions import TruncMonth, TruncDate
from django.contrib.auth import get_user_model
from rest_framework.views import APIView
from rest_framework.response import Response

User = get_user_model()

class AdminDashboardStatisticsView(APIView):
    """
    GET /api/events/admin/statistics/
    Returns overall statistics for the admin dashboard.
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request, *args, **kwargs):
        users_qs = User.objects.all()
        events_qs = Event.objects.all()
        bookings_qs = Booking.objects.all()
        tickets_qs = Ticket.objects.all()
        payments_qs = Payment.objects.all()

        from django.db.models import Count, Q

        user_stats = users_qs.aggregate(
            total=Count('id'),
            customers=Count('id', filter=Q(role=Role.CUSTOMER)),
            organizers=Count('id', filter=Q(role=Role.ORGANIZER))
        )

        event_stats = events_qs.aggregate(
            total=Count('id'),
            published=Count('id', filter=Q(status=Event.Status.PUBLISHED)),
            draft=Count('id', filter=Q(status=Event.Status.DRAFT)),
            cancelled=Count('id', filter=Q(status=Event.Status.CANCELLED))
        )

        total_venues = Venue.objects.count()
        total_shows = Show.objects.count()

        booking_stats = bookings_qs.aggregate(
            total=Count('id'),
            confirmed=Count('id', filter=Q(status=Booking.Status.CONFIRMED)),
            cancelled=Count('id', filter=Q(status=Booking.Status.CANCELLED)),
            pending=Count('id', filter=Q(status=Booking.Status.PENDING))
        )

        ticket_stats = tickets_qs.aggregate(
            total=Count('id'),
            used=Count('id', filter=Q(status=Ticket.Status.USED)),
            active=Count('id', filter=Q(status=Ticket.Status.ACTIVE)),
            cancelled=Count('id', filter=Q(status=Ticket.Status.CANCELLED))
        )

        payment_stats = payments_qs.aggregate(
            total=Count('id'),
            successful=Count('id', filter=Q(status=Payment.Status.SUCCESS)),
            failed=Count('id', filter=Q(status=Payment.Status.FAILED)),
            pending=Count('id', filter=Q(status=Payment.Status.PENDING))
        )
        
        successful_payments_qs = payments_qs.filter(status=Payment.Status.SUCCESS)

        total_revenue = successful_payments_qs.aggregate(Sum('amount'))['amount__sum'] or Decimal('0.00')

        # Revenue by day
        revenue_by_day = successful_payments_qs.annotate(
            date=TruncDate('created_at')
        ).values('date').annotate(
            revenue=Sum('amount')
        ).order_by('-date')

        # Revenue by month
        revenue_by_month = successful_payments_qs.annotate(
            month=TruncMonth('created_at')
        ).values('month').annotate(
            revenue=Sum('amount')
        ).order_by('-month')

        # Revenue by event
        revenue_by_event = successful_payments_qs.values(
            event_id=F('booking__show__event__id'),
            event_title=F('booking__show__event__title')
        ).annotate(
            revenue=Sum('amount'),
            tickets_sold=Count('id')
        ).order_by('-revenue')

        return Response({
            "overview": {
                "users": user_stats['total'],
                "organizers": user_stats['organizers'],
                "customers": user_stats['customers'],
                "events": event_stats['total'],
                "venues": total_venues,
                "bookings": booking_stats['total'],
                "tickets": ticket_stats['total']
            },
            "bookings": {
                "pending": booking_stats['pending'],
                "confirmed": booking_stats['confirmed'],
                "cancelled": booking_stats['cancelled']
            },
            "payments": {
                "successful": payment_stats['successful'],
                "failed": payment_stats['failed'],
                "pending": payment_stats['pending']
            },
            "tickets": {
                "active": ticket_stats['active'],
                "used": ticket_stats['used'],
                "cancelled": ticket_stats['cancelled']
            },
            "revenue": {
                "total": total_revenue,
                "monthly": list(revenue_by_month),
                "daily": list(revenue_by_day),
                "event_wise": list(revenue_by_event)
            }
        }, status=status.HTTP_200_OK)

class AdminEventListView(generics.ListAPIView):
    """
    GET /api/events/admin/events/
    Admin endpoint to list all events with filtering, searching, and pagination.
    """
    serializer_class = EventSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    pagination_class = EventPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["title", "description", "organizer__name", "organizer__email"]
    ordering_fields = ["created_at", "title", "start_date"]
    ordering = ["-created_at"]

    def get_queryset(self):
        queryset = Event.objects.all()
        status_filter = self.request.query_params.get("status")
        is_active = self.request.query_params.get("is_active")
        
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if is_active is not None:
            is_active_bool = is_active.lower() in ('true', '1', 't', 'y', 'yes')
            queryset = queryset.filter(is_active=is_active_bool)
            
        return queryset

class AdminEventDetailView(generics.RetrieveUpdateAPIView):
    """
    GET, PATCH /api/events/admin/events/<id>/
    Admin endpoint to view and update an event (e.g. status/is_active).
    """
    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = Event.objects.all()

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            # Safe status transitions only
            return EventStatusSerializer
        return EventSerializer

class AdminVenueListView(generics.ListAPIView):
    """
    GET /api/events/admin/venues/
    Admin endpoint to list all venues with filtering, searching, and pagination.
    """
    serializer_class = VenueSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    pagination_class = EventPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "address", "city", "state", "organizer__name", "organizer__email"]
    ordering_fields = ["created_at", "name", "city"]
    ordering = ["-created_at"]

    def get_queryset(self):
        queryset = Venue.objects.all()
        is_active = self.request.query_params.get("is_active")
        
        if is_active is not None:
            is_active_bool = is_active.lower() in ('true', '1', 't', 'y', 'yes')
            queryset = queryset.filter(is_active=is_active_bool)
            
        return queryset

from .serializers import AdminVenueUpdateSerializer

class AdminVenueDetailView(generics.RetrieveUpdateAPIView):
    """
    GET, PATCH /api/events/admin/venues/<id>/
    Admin endpoint to view and update a venue (e.g. is_active).
    """
    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = Venue.objects.all()

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return AdminVenueUpdateSerializer
        return VenueSerializer

from .serializers import AdminBookingSerializer
import datetime

class AdminBookingListView(generics.ListAPIView):
    """
    GET /api/events/admin/bookings/
    Admin endpoint to list bookings with comprehensive filtering and searching.
    """
    serializer_class = AdminBookingSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    pagination_class = EventPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["booking_reference", "customer__email", "customer__name", "show__event__title"]
    ordering_fields = ["created_at", "total_amount"]
    ordering = ["-created_at"]

    def get_queryset(self):
        queryset = Booking.objects.select_related('customer', 'show', 'show__event', 'show__event__venue').all()
        
        status_filter = self.request.query_params.get("status")
        event_id = self.request.query_params.get("event")
        customer_id = self.request.query_params.get("customer")
        date_str = self.request.query_params.get("date")
        
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if event_id:
            queryset = queryset.filter(show__event_id=event_id)
        if customer_id:
            queryset = queryset.filter(customer_id=customer_id)
        if date_str:
            try:
                date_obj = datetime.datetime.strptime(date_str, '%Y-%m-%d').date()
                # filter by booking creation date
                queryset = queryset.filter(created_at__date=date_obj)
            except ValueError:
                pass
                
        return queryset

class AdminBookingDetailView(generics.RetrieveAPIView):
    """
    GET /api/events/admin/bookings/<id>/
    Admin endpoint to view booking details.
    """
    serializer_class = AdminBookingSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = Booking.objects.select_related('customer', 'show', 'show__event', 'show__event__venue').all()
    lookup_field = 'pk'

from django.db.models.functions import TruncDate, TruncMonth
from django.db.models import F, Count
from decimal import Decimal
from .serializers import AdminPaymentSerializer

class AdminPaymentListView(generics.ListAPIView):
    """
    GET /api/events/admin/payments/
    Admin endpoint to list all payments.
    """
    serializer_class = AdminPaymentSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    pagination_class = EventPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["booking__booking_reference", "razorpay_order_id", "razorpay_payment_id", "booking__customer__email"]
    ordering_fields = ["created_at", "amount"]
    ordering = ["-created_at"]

    def get_queryset(self):
        queryset = Payment.objects.select_related('booking', 'booking__customer').all()
        status_filter = self.request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        return queryset

class AdminRevenueReportView(APIView):
    """
    GET /api/events/admin/revenue/
    Admin endpoint for revenue reports.
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request, *args, **kwargs):
        payments = Payment.objects.all()
        
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        
        if start_date:
            try:
                dt = datetime.datetime.strptime(start_date, '%Y-%m-%d').date()
                payments = payments.filter(created_at__date__gte=dt)
            except ValueError:
                pass
        if end_date:
            try:
                dt = datetime.datetime.strptime(end_date, '%Y-%m-%d').date()
                payments = payments.filter(created_at__date__lte=dt)
            except ValueError:
                pass

        status_filter = request.query_params.get("status")
        if status_filter:
            payments = payments.filter(status=status_filter)

        from django.db.models import Count, Q

        payment_stats = payments.aggregate(
            successful=Count('id', filter=Q(status=Payment.Status.SUCCESS)),
            failed=Count('id', filter=Q(status=Payment.Status.FAILED)),
            pending=Count('id', filter=Q(status=Payment.Status.PENDING)),
            total_revenue=Sum('amount', filter=Q(status=Payment.Status.SUCCESS))
        )

        successful_payments = payments.filter(status=Payment.Status.SUCCESS)

        total_revenue = payment_stats['total_revenue'] or Decimal('0.00')
        total_failed_count = payment_stats['failed']
        total_pending_count = payment_stats['pending']
        successful_count = payment_stats['successful']

        # Revenue by event
        revenue_by_event = successful_payments.values(
            event_id=F('booking__show__event__id'),
            event_title=F('booking__show__event__title')
        ).annotate(
            revenue=Sum('amount'),
            tickets_sold=Count('id')
        ).order_by('-revenue')

        # Revenue by date
        revenue_by_date = successful_payments.annotate(
            date=TruncDate('created_at')
        ).values('date').annotate(
            revenue=Sum('amount')
        ).order_by('-date')

        # Revenue by month
        revenue_by_month = successful_payments.annotate(
            month=TruncMonth('created_at')
        ).values('month').annotate(
            revenue=Sum('amount')
        ).order_by('-month')

        return Response({
            "summary": {
                "total_revenue": total_revenue,
                "successful_payment_count": successful_count,
                "failed_payment_count": total_failed_count,
                "pending_payment_count": total_pending_count,
            },
            "by_event": list(revenue_by_event),
            "by_date": list(revenue_by_date),
            "by_month": list(revenue_by_month)
        }, status=status.HTTP_200_OK)

from .models import Ticket
from django.db.models import Q

class AdminTicketReportView(APIView):
    """
    GET /api/events/admin/tickets/report/
    Admin endpoint for ticket and check-in reports.
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request, *args, **kwargs):
        tickets = Ticket.objects.all()
        
        event_id = request.query_params.get("event")
        show_id = request.query_params.get("show")
        
        if event_id:
            tickets = tickets.filter(booking__show__event_id=event_id)
        if show_id:
            tickets = tickets.filter(booking__show_id=show_id)

        from django.db.models import Count, Q
        
        ticket_stats = tickets.aggregate(
            total=Count('id'),
            active=Count('id', filter=Q(status=Ticket.Status.ACTIVE)),
            used=Count('id', filter=Q(status=Ticket.Status.USED)),
            cancelled=Count('id', filter=Q(status=Ticket.Status.CANCELLED))
        )

        total_tickets = ticket_stats['total']
        active_tickets = ticket_stats['active']
        used_tickets = ticket_stats['used']
        cancelled_tickets = ticket_stats['cancelled']

        checkin_percentage = 0.0
        if total_tickets > 0:
            checkin_percentage = (used_tickets / total_tickets) * 100

        # Tickets by event
        tickets_by_event = tickets.values(
            event_id=F('booking__show__event__id'),
            event_title=F('booking__show__event__title')
        ).annotate(
            total_tickets=Count('id'),
            used_tickets=Count('id', filter=Q(status=Ticket.Status.USED)),
            active_tickets=Count('id', filter=Q(status=Ticket.Status.ACTIVE)),
            cancelled_tickets=Count('id', filter=Q(status=Ticket.Status.CANCELLED))
        ).order_by('-total_tickets')

        # Tickets by show
        tickets_by_show = tickets.values(
            show_id=F('booking__show__id'),
            event_title=F('booking__show__event__title'),
            show_date=F('booking__show__show_date'),
            start_time=F('booking__show__start_time')
        ).annotate(
            total_tickets=Count('id'),
            used_tickets=Count('id', filter=Q(status=Ticket.Status.USED)),
            active_tickets=Count('id', filter=Q(status=Ticket.Status.ACTIVE)),
            cancelled_tickets=Count('id', filter=Q(status=Ticket.Status.CANCELLED))
        ).order_by('-total_tickets')

        return Response({
            "summary": {
                "total_tickets": total_tickets,
                "active_tickets": active_tickets,
                "used_tickets": used_tickets,
                "cancelled_tickets": cancelled_tickets,
                "total_checkins": used_tickets,
                "checkin_percentage": round(checkin_percentage, 2)
            },
            "by_event": list(tickets_by_event),
            "by_show": list(tickets_by_show)
        }, status=status.HTTP_200_OK)

from .serializers import AdminEventReportSerializer
from django.db.models import Prefetch, OuterRef, Subquery
from django.db.models.functions import Coalesce
from decimal import Decimal
from .models import BookingItem, Payment

class AdminEventReportListView(generics.ListAPIView):
    """
    GET /api/events/admin/events/report/
    Admin endpoint for event-wise metrics and revenue.
    """
    serializer_class = AdminEventReportSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    pagination_class = EventPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["title", "organizer__name", "organizer__email"]
    ordering_fields = ["created_at", "title"]
    ordering = ["-created_at"]

    def get_queryset(self):
        revenue_subquery = Payment.objects.filter(
            status=Payment.Status.SUCCESS,
            booking__show__event=OuterRef('pk')
        ).values('booking__show__event').annotate(
            total=Sum('amount')
        ).values('total')
        
        booked_seats_subquery = BookingItem.objects.filter(
            booking__status=Booking.Status.CONFIRMED,
            booking__show__event=OuterRef('pk')
        ).values('booking__show__event').annotate(
            total=Count('id')
        ).values('total')

        tickets_issued_subquery = Ticket.objects.filter(
            booking__show__event=OuterRef('pk')
        ).values('booking__show__event').annotate(
            total=Count('id')
        ).values('total')

        tickets_used_subquery = Ticket.objects.filter(
            status=Ticket.Status.USED,
            booking__show__event=OuterRef('pk')
        ).values('booking__show__event').annotate(
            total=Count('id')
        ).values('total')

        queryset = Event.objects.select_related('organizer').annotate(
            total_shows=Count('shows', distinct=True),
            total_bookings=Count('shows__bookings', distinct=True),
            confirmed_bookings=Count('shows__bookings', filter=Q(shows__bookings__status=Booking.Status.CONFIRMED), distinct=True),
            cancelled_bookings=Count('shows__bookings', filter=Q(shows__bookings__status=Booking.Status.CANCELLED), distinct=True),
            venue_capacity=F('venue__capacity'),
            booked_seats=Coalesce(Subquery(booked_seats_subquery), 0),
            tickets_issued=Coalesce(Subquery(tickets_issued_subquery), 0),
            tickets_used=Coalesce(Subquery(tickets_used_subquery), 0),
            successful_revenue=Coalesce(Subquery(revenue_subquery), Decimal('0.00'))
        )
        return queryset

class BookingStatusView(generics.RetrieveAPIView):
    """
    GET /api/events/bookings/<id>/status/
    Poll for booking and payment status.
    """
    queryset = Booking.objects.all()
    permission_classes = [IsAuthenticated, IsCustomer]

    def get_queryset(self):
        return Booking.objects.filter(customer=self.request.user)
        
    def retrieve(self, request, *args, **kwargs):
        booking = self.get_object()
        ticket_number = booking.ticket.ticket_number if hasattr(booking, 'ticket') else None
        return Response({
            'status': booking.status,
            'ticket_number': ticket_number
        })

class RazorpayWebhookMockView(APIView):
    """
    POST /api/events/payments/mock-webhook/
    Mock endpoint to simulate a Razorpay webhook in test environment.
    """
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        from django.conf import settings
        from django.db import transaction
        import uuid
        if not settings.DEBUG:
            return Response({"error": "Not available in production."}, status=status.HTTP_403_FORBIDDEN)
            
        razorpay_order_id = request.data.get('razorpay_order_id')
        if not razorpay_order_id:
            return Response({"error": "razorpay_order_id is required."}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            with transaction.atomic():
                payment = Payment.objects.select_for_update().get(gateway_order_id=razorpay_order_id)
                if payment.status != Payment.Status.SUCCESS:
                    payment.status = Payment.Status.SUCCESS
                    # Provide a dummy payment id
                    payment.gateway_payment_id = 'pay_mock_' + str(uuid.uuid4().hex)[:10]
                    payment.save(update_fields=['status', 'gateway_payment_id', 'updated_at'])
                    
                    booking = payment.booking
                    if booking.status != Booking.Status.CONFIRMED:
                        booking.status = Booking.Status.CONFIRMED
                        booking.save(update_fields=['status', 'updated_at'])
                        Ticket.generate_ticket(booking)
                        
            return Response({"detail": "Webhook processed successfully."}, status=status.HTTP_200_OK)
        except Payment.DoesNotExist:
            return Response({"error": "Payment order not found."}, status=status.HTTP_404_NOT_FOUND)

# --- ORGANIZER VIEWS ---

class OrganizerDashboardStatisticsView(APIView):
    """
    GET /api/events/organizer/statistics/
    Returns total events, total bookings, total tickets sold, revenue for the organizer.
    """
    permission_classes = [IsAuthenticated, IsOrganizer]

    def get(self, request, *args, **kwargs):
        user = request.user
        
        events = Event.objects.filter(organizer=user)
        total_events = events.count()
        
        bookings = Booking.objects.filter(show__event__organizer=user)
        total_bookings = bookings.count()
        
        # Calculate revenue and tickets for confirmed bookings
        confirmed_bookings = bookings.filter(status=Booking.Status.CONFIRMED)
        from django.db.models import Sum, Count
        
        revenue_data = confirmed_bookings.aggregate(total_revenue=Sum('total_amount'))
        total_revenue = revenue_data['total_revenue'] or 0.0
        
        # Total tickets sold is number of booking items in confirmed bookings
        from .models import BookingItem
        tickets_sold = BookingItem.objects.filter(booking__in=confirmed_bookings).count()
        
        return Response({
            "total_events": total_events,
            "total_bookings": total_bookings,
            "total_revenue": total_revenue,
            "tickets_sold": tickets_sold
        }, status=status.HTTP_200_OK)


class OrganizerEventListView(generics.ListAPIView):
    """
    GET /api/events/organizer/events/
    List events belonging to the logged in organizer.
    """
    serializer_class = EventSerializer
    permission_classes = [IsAuthenticated, IsOrganizer]
    filter_backends = [filters.SearchFilter]
    search_fields = ['title', 'description']
    pagination_class = EventPagination

    def get_queryset(self):
        return Event.objects.filter(organizer=self.request.user).order_by('-created_at')


class OrganizerVenueListView(generics.ListAPIView):
    """
    GET /api/events/organizer/venues/
    List venues belonging to the logged in organizer.
    """
    serializer_class = VenueSerializer
    permission_classes = [IsAuthenticated, IsOrganizer]

    def get_queryset(self):
        return Venue.objects.filter(organizer=self.request.user).order_by('-created_at')


class OrganizerBookingListView(generics.ListAPIView):
    """
    GET /api/events/organizer/bookings/
    List bookings for events belonging to the logged in organizer.
    """
    serializer_class = BookingListSerializer
    permission_classes = [IsAuthenticated, IsOrganizer]

    def get_queryset(self):
        queryset = Booking.objects.filter(show__event__organizer=self.request.user).select_related(
            'customer', 'show', 'show__event', 'show__event__venue', 'show__event__category'
        ).prefetch_related('items', 'items__seat').order_by('-created_at')
        
        status_param = self.request.query_params.get('status')
        if status_param and status_param in dict(Booking.Status.choices):
            queryset = queryset.filter(status=status_param)
            
        return queryset


class EventSeatConfigurationListAPIView(generics.ListAPIView):
    """
    GET /api/events/organizer/events/<event_id>/seat-configurations/
    List seat configurations for a specific event.
    """
    serializer_class = EventSeatConfigurationSerializer
    permission_classes = [IsAuthenticated, IsOrganizer]

    def get_queryset(self):
        event_id = self.kwargs.get('event_id')
        event = get_object_or_404(Event, id=event_id, organizer=self.request.user)
        return EventSeatConfiguration.objects.filter(event=event)


class EventSeatConfigurationBulkAPIView(APIView):
    """
    POST /api/events/organizer/events/<event_id>/seat-configurations/bulk/
    Bulk configure seats for an event.
    """
    permission_classes = [IsAuthenticated, IsOrganizer]

    def post(self, request, event_id, *args, **kwargs):
        event = get_object_or_404(Event, id=event_id, organizer=request.user)
        
        serializer = EventSeatConfigurationBulkSerializer(
            data=request.data, 
            context={'request': request, 'event': event}
        )
        if serializer.is_valid():
            result = serializer.save()
            return Response(result, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
