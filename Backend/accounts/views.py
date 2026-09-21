from rest_framework import generics, status, filters
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from django.contrib.auth import get_user_model
from .models import CustomerProfile, OrganizerProfile

User = get_user_model()
from .permissions import IsAdmin, IsCustomer, IsOrganizer  # noqa: F401 (reusable permissions exported for use across apps
from .serializers import (
    ChangePasswordSerializer,
    CustomerProfileSerializer,
    ForgotPasswordSerializer,
    LoginSerializer,
    LogoutSerializer,
    OrganizerProfileSerializer,
    RegisterSerializer,
    ResetPasswordSerializer,
    UserProfileSerializer,
    AdminUserSerializer,
)


class RegisterView(generics.CreateAPIView):
    """Public endpoint to register CUSTOMER or ORGANIZER accounts."""

    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role,
            },
            status=status.HTTP_201_CREATED,
        )


class AdminUserListView(generics.ListAPIView):
    """
    GET /api/accounts/admin/users/
    Admin endpoint to list users with filtering, searching, and pagination.
    """

    serializer_class = AdminUserSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    filter_backends = [
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    search_fields = ["name", "email"]
    ordering_fields = ["date_joined", "name", "email"]
    ordering = ["-date_joined"]

    def get_queryset(self):
        queryset = User.objects.all()
        role = self.request.query_params.get("role")
        is_active = self.request.query_params.get("is_active")
        
        if role:
            queryset = queryset.filter(role=role)
        if is_active is not None:
            is_active_bool = is_active.lower() in ('true', '1', 't', 'y', 'yes')
            queryset = queryset.filter(is_active=is_active_bool)
            
        return queryset


class AdminUserDetailView(generics.RetrieveUpdateAPIView):
    """
    GET, PATCH /api/accounts/admin/users/<id>/
    Admin endpoint to view and update user (activate/deactivate and change role).
    """

    serializer_class = AdminUserSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = User.objects.all()

    def update(self, request, *args, **kwargs):
        user = self.get_object()
        if user == request.user:
            return Response(
                {
                    "detail": (
                        "You cannot modify your own account through this API."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().update(request, *args, **kwargs)


class LoginView(TokenObtainPairView):
    """Login with email + password, returns JWT access/refresh tokens.

    The backend determines the user's role from the database; the request
    must not supply a role.
    """

    serializer_class = LoginSerializer


class MeView(generics.RetrieveUpdateAPIView):
    """View/update the authenticated user's own profile (role immutable)."""

    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class CustomerProfileView(generics.RetrieveUpdateAPIView):
    """Get/update the logged-in CUSTOMER's own extended profile.

    Only authenticated CUSTOMER users may access it: ORGANIZER and ADMIN
    receive 403. The profile is always looked up from the authenticated
    user, so a customer can never view or change anyone else's profile.
    If a customer has no profile yet (e.g. legacy data), one is created
    on first access so the endpoint never 404s.
    """

    serializer_class = CustomerProfileSerializer
    permission_classes = [IsAuthenticated, IsCustomer]

    def get_object(self):
        profile, _ = CustomerProfile.objects.get_or_create(user=self.request.user)
        return profile


class OrganizerProfileView(generics.RetrieveUpdateAPIView):
    """Get/update the logged-in ORGANIZER's own extended profile.

    Only authenticated ORGANIZER users may access it: CUSTOMER and ADMIN
    receive 403. The profile is always looked up from the authenticated
    user, so an organizer can never view or change anyone else's profile.
    If an organizer has no profile yet (e.g. legacy data), one is created
    on first access so the endpoint never 404s.
    """

    serializer_class = OrganizerProfileSerializer
    permission_classes = [IsAuthenticated, IsOrganizer]

    def get_object(self):
        profile, _ = OrganizerProfile.objects.get_or_create(user=self.request.user)
        return profile


class LogoutView(APIView):
    """Logout: blacklist the supplied refresh token so it can no longer be used."""

    permission_classes = [IsAuthenticated]
    serializer_class = LogoutSerializer

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {"detail": "Successfully logged out."}, status=status.HTTP_205_RESET_CONTENT
        )


class ChangePasswordView(APIView):
    """Change the authenticated user's own password."""

    permission_classes = [IsAuthenticated]
    serializer_class = ChangePasswordSerializer

    def post(self, request):
        serializer = self.serializer_class(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {"detail": "Password changed successfully."}, status=status.HTTP_200_OK
        )


class ForgotPasswordView(APIView):
    """Public: email a password-reset link.

    Always answers with the same generic message so the response never
    reveals whether the email address is registered.
    """

    serializer_class = ForgotPasswordSerializer

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {
                "detail": (
                    "If an account with that email exists, a password reset "
                    "link has been sent."
                )
            },
            status=status.HTTP_200_OK,
        )


class ResetPasswordView(APIView):
    """Public: set a new password using the emailed uid + token."""

    serializer_class = ResetPasswordSerializer

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {"detail": "Password has been reset successfully."},
            status=status.HTTP_200_OK,
        )