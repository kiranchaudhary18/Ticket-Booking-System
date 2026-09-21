from django.conf import settings
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models


class Role(models.TextChoices):
    ADMIN = "ADMIN", "Admin"
    CUSTOMER = "CUSTOMER", "Customer"
    ORGANIZER = "ORGANIZER", "Organizer"


class UserManager(BaseUserManager):
    """Manager for the custom User model.

    Public signup (create_user) can never create an ADMIN account.
    Only create_superuser may assign the ADMIN role.
    """

    use_in_migrations = True

    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError("The Email field must be set.")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        if extra_fields.get("role") == Role.ADMIN:
            raise ValueError("ADMIN accounts cannot be created through signup.")
        extra_fields.setdefault("role", Role.CUSTOMER)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", Role.ADMIN)
        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")
        return self._create_user(email, password, **extra_fields)


class User(AbstractUser):
    """Custom user model using email as the unique login identifier."""

    username = None
    first_name = None
    last_name = None

    email = models.EmailField(unique=True)
    name = models.CharField(max_length=255)
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.CUSTOMER,
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    def __str__(self):
        return self.email


class CustomerProfile(models.Model):
    """Extended profile for a CUSTOMER user (one-to-one with the User model).

    Only CUSTOMER users may own a CustomerProfile. This is enforced in
    ``save()`` and at the API layer via the IsCustomer permission.
    """

    class Gender(models.TextChoices):
        MALE = "MALE", "Male"
        FEMALE = "FEMALE", "Female"
        OTHER = "OTHER", "Other"
        PREFER_NOT_TO_SAY = "PREFER_NOT_TO_SAY", "Prefer not to say"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="customer_profile",
    )
    phone = models.CharField(max_length=15, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=20, choices=Gender.choices, blank=True)
    address = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    pincode = models.CharField(max_length=10, blank=True)
    profile_picture = models.URLField(max_length=500, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        # Guard: only CUSTOMER users may own a CustomerProfile.
        if self.user_id and self.user.role != Role.CUSTOMER:
            raise ValueError("Only CUSTOMER users can have a CustomerProfile.")
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Customer profile: {self.user.email}"


class OrganizerProfile(models.Model):
    """Extended profile for an ORGANIZER user (one-to-one with the User model).

    Only ORGANIZER users may own an OrganizerProfile. This is enforced in
    ``save()`` and at the API layer via the IsOrganizer permission.
    """

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="organizer_profile",
    )
    phone = models.CharField(max_length=15, blank=True)
    organization_name = models.CharField(max_length=255, blank=True)
    organization_description = models.TextField(blank=True)
    address = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    pincode = models.CharField(max_length=10, blank=True)
    website = models.URLField(blank=True)
    profile_picture = models.URLField(max_length=500, null=True, blank=True)
    
    # Banking & Payouts (Razorpay Route)
    razorpay_linked_account_id = models.CharField(max_length=255, blank=True)
    bank_account_number = models.CharField(max_length=50, blank=True)
    bank_ifsc = models.CharField(max_length=20, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        # Guard: only ORGANIZER users may own an OrganizerProfile.
        if self.user_id and self.user.role != Role.ORGANIZER:
            raise ValueError("Only ORGANIZER users can have an OrganizerProfile.")
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Organizer profile: {self.user.email}"
