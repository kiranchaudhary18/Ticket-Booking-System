import os
import re

from django.conf import settings as django_settings
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.token_blacklist.models import (
    BlacklistedToken,
    OutstandingToken,
)
from rest_framework_simplejwt.tokens import RefreshToken, TokenError

from .models import CustomerProfile, OrganizerProfile, Role, User


class RegisterSerializer(serializers.Serializer):
    """Validate and create CUSTOMER / ORGANIZER accounts.

    ADMIN registration is always rejected.
    """

    name = serializers.CharField(max_length=255)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)
    role = serializers.ChoiceField(choices=Role.choices)

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate_role(self, value):
        if value == Role.ADMIN:
            raise serializers.ValidationError("ADMIN registration is not allowed.")
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs["confirm_password"]:
            raise serializers.ValidationError(
                {"confirm_password": "Passwords do not match."}
            )
        validate_password(attrs["password"])
        return attrs

    def create(self, validated_data):
        validated_data.pop("confirm_password")
        # create_user hashes the password with Django's password hashers
        # and refuses to create ADMIN accounts (defense in depth).
        return User.objects.create_user(**validated_data)


class LoginSerializer(TokenObtainPairSerializer):
    """Login with email + password only.

    The request must contain only `email` and `password`. Any other field
    (e.g. `role`) is intentionally ignored so the backend always determines
    the user's role from the database.
    """

    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        data.update(
            {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role,
            }
        )
        return data

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["name"] = user.name
        token["role"] = user.role
        return token


class UserProfileSerializer(serializers.ModelSerializer):
    """Read/update the authenticated user's own profile.

    `id`, `email` and `role` are read-only through public APIs: a user can
    never change their own role, and ADMIN can never be assigned here."""

    class Meta:
        model = User
        fields = ["id", "name", "email", "role"]
        read_only_fields = ["id", "email", "role"]

    def validate_name(self, value):
        if not value.strip():
            raise serializers.ValidationError("Name cannot be empty.")
        return value

class AdminUserSerializer(serializers.ModelSerializer):
    """Read/update users for ADMIN."""
    class Meta:
        model = User
        fields = ["id", "name", "email", "role", "is_active", "date_joined", "last_login"]
        read_only_fields = ["id", "email", "date_joined", "last_login"]


class LogoutSerializer(serializers.Serializer):
    """Validate a refresh token and blacklist it (invalidate it)."""

    refresh = serializers.CharField()

    def validate_refresh(self, value):
        try:
            self.token = RefreshToken(value)
        except TokenError:
            raise serializers.ValidationError("Invalid or expired refresh token.")
        return value

    def save(self, **kwargs):
        self.token.blacklist()


class ChangePasswordSerializer(serializers.Serializer):
    """Change the authenticated user's password.

    Validates the old password, the new-password confirmation and Django's
    secure-password rules, then hashes the new password (set_password) and
    invalidates every outstanding refresh token of the user.
    """

    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    def validate_old_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Your old password is incorrect.")
        return value

    def validate(self, attrs):
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError(
                {"confirm_password": "Passwords do not match."}
            )
        user = self.context["request"].user
        validate_password(attrs["new_password"], user=user)
        return attrs

    def save(self, **kwargs):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save(update_fields=["password"])

        # Invalidate all outstanding refresh tokens issued to this user.
        for token in OutstandingToken.objects.filter(user=user):
            BlacklistedToken.objects.get_or_create(token=token)


# --- shared profile validation helpers (Phase 3 Step 3) ---------------------

PHONE_REGEX = re.compile(r"^\+?[0-9]{10,15}$")
INDIAN_PINCODE_REGEX = re.compile(r"^[1-9][0-9]{5}$")
ALLOWED_IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
ALLOWED_IMAGE_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_PROFILE_PICTURE_BYTES = 5 * 1024 * 1024  # 5 MB


def validate_phone_number(value):
    """Phone: optional leading '+', then 10-15 digits, nothing else."""
    value = value.strip()
    if value and not PHONE_REGEX.match(value):
        raise serializers.ValidationError(
            "Enter a valid phone number: 10-15 digits with an optional leading +."
        )
    return value


def validate_indian_pincode(value):
    """Pincode: exactly 6 digits, first digit 1-9 (Indian pincode format)."""
    value = value.strip()
    if value and not INDIAN_PINCODE_REGEX.match(value):
        raise serializers.ValidationError(
            "Enter a valid 6-digit Indian pincode (e.g. 560001)."
        )
    return value


def validate_website_url(value):
    """Website: must be a real URL using the http or https scheme only."""
    value = value.strip()
    if value and not value.lower().startswith(("http://", "https://")):
        raise serializers.ValidationError(
            "Enter a valid website URL starting with http:// or https://."
        )
    return value


def validate_profile_image(image):
    """Safe profile-picture upload: extension + content-type whitelist, 5 MB cap.

    DRF's ImageField (Pillow) already guarantees the bytes decode as an image;
    these checks close the remaining vectors: misleading extensions, non-image
    content types, and oversized files.
    """
    if image is None:
        return image
    extension = os.path.splitext(image.name)[1].lstrip(".").lower()
    if extension not in ALLOWED_IMAGE_EXTENSIONS:
        raise serializers.ValidationError(
            "Unsupported file type. Allowed: jpg, jpeg, png, webp."
        )
    content_type = getattr(image, "content_type", "") or ""
    if content_type not in ALLOWED_IMAGE_CONTENT_TYPES:
        raise serializers.ValidationError(
            "Uploaded file is not a valid image (jpg, png, or webp)."
        )
    if image.size > MAX_PROFILE_PICTURE_BYTES:
        raise serializers.ValidationError(
            "Profile picture must be 5 MB or smaller."
        )
    return image


class CustomerProfileSerializer(serializers.ModelSerializer):
    """Read/update the logged-in CUSTOMER's own extended profile.

    Identity fields (name/email/role) come from the linked User and are
    strictly read-only: neither the email nor the role can be changed
    through this API.
    """

    name = serializers.CharField(source="user.name", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    role = serializers.CharField(source="user.role", read_only=True)
    profile_picture_upload = serializers.ImageField(write_only=True, required=False)

    class Meta:
        model = CustomerProfile
        fields = [
            "id",
            "name",
            "email",
            "role",
            "phone",
            "date_of_birth",
            "gender",
            "address",
            "city",
            "state",
            "pincode",
            "profile_picture",
            "profile_picture_upload",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "profile_picture", "created_at", "updated_at"]

    def validate_phone(self, value):
        return validate_phone_number(value)

    def validate_pincode(self, value):
        return validate_indian_pincode(value)

    def validate_profile_picture_upload(self, image):
        return validate_profile_image(image)

    def validate_date_of_birth(self, value):
        if value and value > timezone.localdate():
            raise serializers.ValidationError("Date of birth cannot be in the future.")
        return value

    def update(self, instance, validated_data):
        import cloudinary.uploader
        
        profile_picture_upload = validated_data.pop("profile_picture_upload", None)
        
        if profile_picture_upload:
            old_url = instance.profile_picture
            if old_url and "res.cloudinary.com" in old_url:
                try:
                    public_id = old_url.split('/upload/')[1].split('/', 1)[1].rsplit('.', 1)[0]
                    cloudinary.uploader.destroy(public_id)
                except Exception:
                    pass
            
            upload_result = cloudinary.uploader.upload(
                profile_picture_upload,
                folder=f"ticketmaster/customers/{instance.user.id}"
            )
            instance.profile_picture = upload_result.get("secure_url")
            
        return super().update(instance, validated_data)


class OrganizerProfileSerializer(serializers.ModelSerializer):
    """Read/update the logged-in ORGANIZER's own extended profile.

    Identity fields (name/email/role) come from the linked User and are
    strictly read-only: neither the email nor the role can be changed
    through this API.
    """

    name = serializers.CharField(source="user.name", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    role = serializers.CharField(source="user.role", read_only=True)

    profile_picture_upload = serializers.ImageField(write_only=True, required=False)

    class Meta:
        model = OrganizerProfile
        fields = [
            "id",
            "name",
            "email",
            "role",
            "phone",
            "organization_name",
            "organization_description",
            "address",
            "city",
            "state",
            "pincode",
            "website",
            "profile_picture",
            "profile_picture_upload",
            "bank_account_number",
            "bank_ifsc",
            "razorpay_linked_account_id",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "profile_picture", "razorpay_linked_account_id", "created_at", "updated_at"]

    def validate_phone(self, value):
        return validate_phone_number(value)

    def validate_pincode(self, value):
        return validate_indian_pincode(value)

    def validate_website(self, value):
        return validate_website_url(value)

    def validate_profile_picture_upload(self, image):
        return validate_profile_image(image)

    def update(self, instance, validated_data):
        import cloudinary.uploader
        
        profile_picture_upload = validated_data.pop("profile_picture_upload", None)
        
        if profile_picture_upload:
            old_url = instance.profile_picture
            if old_url and "res.cloudinary.com" in old_url:
                try:
                    public_id = old_url.split('/upload/')[1].split('/', 1)[1].rsplit('.', 1)[0]
                    cloudinary.uploader.destroy(public_id)
                except Exception:
                    pass
            
            upload_result = cloudinary.uploader.upload(
                profile_picture_upload,
                folder=f"ticketmaster/organizers/{instance.user.id}"
            )
            instance.profile_picture = upload_result.get("secure_url")
            
        instance = super().update(instance, validated_data)

        # Handle Razorpay Linked Account Creation if bank details are provided
        if instance.bank_account_number and instance.bank_ifsc and not instance.razorpay_linked_account_id:
            try:
                from events.services.razorpay_service import RazorpayService
                rz_service = RazorpayService()
                linked_account_id = rz_service.create_linked_account(
                    name=instance.user.name,
                    email=instance.user.email,
                    business_name=instance.organization_name,
                    account_number=instance.bank_account_number,
                    ifsc_code=instance.bank_ifsc
                )
                if linked_account_id:
                    instance.razorpay_linked_account_id = linked_account_id
                    instance.save(update_fields=['razorpay_linked_account_id'])
            except Exception as e:
                # Log error but don't fail profile update
                print(f"Failed to create Razorpay linked account: {e}")

        return instance


class ForgotPasswordSerializer(serializers.Serializer):
    """Email a password-reset link for the given address.

    The response is identical whether or not the email exists, so attackers
    cannot discover which accounts are registered.
    """

    email = serializers.EmailField()

    def validate_email(self, value):
        return value.strip().lower()

    def save(self, **kwargs):
        email = self.validated_data["email"]
        user = User.objects.filter(email__iexact=email, is_active=True).first()
        if user is None:
            # Stay silent: never reveal whether the email is registered.
            return

        # Django's token generator: signed with SECRET_KEY, tied to the
        # user's password hash and a timestamp, so it is time-limited
        # (PASSWORD_RESET_TIMEOUT) and invalidated when the password changes.
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        reset_url = (
            f"{django_settings.FRONTEND_URL}/reset-password"
            f"?uid={uid}&token={token}"
        )
        send_mail(
            subject="Reset your password - Ticket Booking System",
            message=(
                f"Hello {user.name},\n\n"
                "We received a request to reset your password.\n\n"
                "Open the link below to choose a new password "
                f"(valid for {django_settings.PASSWORD_RESET_TIMEOUT // 60} "
                "minutes):\n\n"
                f"{reset_url}\n\n"
                "If you did not request this, you can safely ignore this email."
            ),
            from_email=django_settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )


class ResetPasswordSerializer(serializers.Serializer):
    """Set a new password using the emailed uid + time-limited token."""

    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    _INVALID = "Invalid or expired password reset link."

    def validate(self, attrs):
        # Resolve the user from the base64-encoded uid.
        try:
            uid = force_str(urlsafe_base64_decode(attrs["uid"]))
            user = User.objects.get(pk=uid)
        except (User.DoesNotExist, TypeError, ValueError, OverflowError):
            raise serializers.ValidationError({"token": self._INVALID})

        # Same generic error for tampered, expired and already-used tokens.
        if not default_token_generator.check_token(user, attrs["token"]):
            raise serializers.ValidationError({"token": self._INVALID})

        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError(
                {"confirm_password": "Passwords do not match."}
            )
        validate_password(attrs["new_password"], user=user)

        self.user = user
        return attrs

    def save(self, **kwargs):
        self.user.set_password(self.validated_data["new_password"])
        self.user.save(update_fields=["password"])

        # Invalidate every outstanding refresh token issued to this user.
        for token in OutstandingToken.objects.filter(user=self.user):
            BlacklistedToken.objects.get_or_create(token=token)

        return self.user