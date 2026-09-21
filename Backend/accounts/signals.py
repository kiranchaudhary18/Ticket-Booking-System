from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import CustomerProfile, OrganizerProfile, Role, User


@receiver(post_save, sender=User)
def create_customer_profile(sender, instance, created, **kwargs):
    """Automatically create a CustomerProfile whenever a CUSTOMER is created.

    ORGANIZER and ADMIN users intentionally do not get a customer profile.
    """
    if created and instance.role == Role.CUSTOMER:
        CustomerProfile.objects.get_or_create(user=instance)


@receiver(post_save, sender=User)
def create_organizer_profile(sender, instance, created, **kwargs):
    """Automatically create an OrganizerProfile whenever an ORGANIZER is created.

    CUSTOMER and ADMIN users intentionally do not get an organizer profile.
    """
    if created and instance.role == Role.ORGANIZER:
        OrganizerProfile.objects.get_or_create(user=instance)
