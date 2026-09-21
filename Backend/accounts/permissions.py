from rest_framework.permissions import BasePermission

from .models import Role


class IsRole(BasePermission):
    """Base class for role-based permissions.

    Subclasses define `allowed_roles`. Access is granted only to
    authenticated, active users whose role is in `allowed_roles`.
    """

    allowed_roles: set = set()

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and user.is_active
            and getattr(user, "role", None) in self.allowed_roles
        )


class IsAdmin(IsRole):
    """Allow access only to ADMIN users."""

    allowed_roles = {Role.ADMIN}


class IsCustomer(IsRole):
    """Allow access only to CUSTOMER users."""

    allowed_roles = {Role.CUSTOMER}


class IsOrganizer(IsRole):
    """Allow access only to ORGANIZER users."""

    allowed_roles = {Role.ORGANIZER}


class IsVenueOwnerOrAdmin(BasePermission):
    """Allow access only to the ORGANIZER who owns the venue or to ADMIN.

    Object-level permission: the requesting user must be an ADMIN, or an
    ORGANIZER whose ID matches the venue's ``organizer_id``.
    """

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and user.is_active
            and getattr(user, "role", None) in {Role.ORGANIZER, Role.ADMIN}
        )

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.role == Role.ADMIN:
            return True
        return user.role == Role.ORGANIZER and obj.organizer_id == user.pk
class IsEventOrganizer(BasePermission):
    """Allow access only to the ORGANIZER who owns the event.

    Object-level permission: the requesting user must be the ORGANIZER
    whose ID matches the event's ``organizer_id``;CUSTOMER,and ADMIN are
    always denied.
    """

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and user.is_active
            and getattr(user, "role", None) in {Role.ORGANIZER}
        )

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        return user.role == Role.ORGANIZER and obj.organizer_id == user.pk

class IsBookingOwnerOrOrganizerOrAdmin(BasePermission):
    """Allow access to the customer who made the booking, the organizer of the event, or an admin."""
    
    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.is_active)

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not (user and user.is_authenticated and user.is_active):
            return False
        
        if getattr(user, "role", None) == Role.ADMIN:
            return True
            
        if getattr(user, "role", None) == Role.CUSTOMER:
            return obj.customer_id == user.pk
            
        if getattr(user, "role", None) == Role.ORGANIZER:
            return obj.show.event.organizer_id == user.pk
            
        return False