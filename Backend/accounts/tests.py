import base64
import os
import re
import tempfile
from io import StringIO
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core import mail
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase, override_settings
from django.urls import path
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import status
from rest_framework.response import Response
from rest_framework.test import APITestCase
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.tokens import AccessToken

from .models import CustomerProfile, OrganizerProfile, Role
from .permissions import IsAdmin, IsCustomer, IsOrganizer

User = get_user_model()

REGISTER_URL = "/api/accounts/register/"
LOGIN_URL = "/api/accounts/login/"
CUSTOMER_PROFILE_URL = "/api/accounts/customer-profile/"
ORGANIZER_PROFILE_URL = "/api/accounts/organizer-profile/"

# Smallest valid PNG (1x1 pixel) used for profile-picture upload tests.
TINY_PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ"
    "AAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
)


class RegisterAPITests(APITestCase):
    def _payload(self, **overrides):
        data = {
            "name": "John Doe",
            "email": "john@example.com",
            "password": "StrongPass123!",
            "confirm_password": "StrongPass123!",
            "role": Role.CUSTOMER,
        }
        data.update(overrides)
        return data

    def test_register_customer_success(self):
        response = self.client.post(REGISTER_URL, self._payload(), format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["email"], "john@example.com")
        self.assertEqual(response.data["role"], Role.CUSTOMER)
        self.assertNotIn("password", response.data)

        user = User.objects.get(email="john@example.com")
        self.assertEqual(user.name, "John Doe")
        self.assertEqual(user.role, Role.CUSTOMER)
        # Password must be hashed, never stored in plain text.
        self.assertNotEqual(user.password, "StrongPass123!")
        self.assertTrue(user.check_password("StrongPass123!"))

    def test_register_organizer_success(self):
        response = self.client.post(
            REGISTER_URL, self._payload(role=Role.ORGANIZER), format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["role"], Role.ORGANIZER)

    def test_register_admin_rejected(self):
        response = self.client.post(
            REGISTER_URL, self._payload(role=Role.ADMIN), format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("role", response.data)
        self.assertFalse(User.objects.filter(email="john@example.com").exists())

    def test_register_duplicate_email_rejected(self):
        User.objects.create_user(
            email="john@example.com",
            password="StrongPass123!",
            name="John Doe",
        )
        response = self.client.post(REGISTER_URL, self._payload(), format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)
        self.assertEqual(User.objects.filter(email="john@example.com").count(), 1)

    def test_register_invalid_email_rejected(self):
        response = self.client.post(
            REGISTER_URL, self._payload(email="not-an-email"), format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)

    def test_register_password_mismatch_rejected(self):
        response = self.client.post(
            REGISTER_URL,
            self._payload(confirm_password="DifferentPass123!"),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("confirm_password", response.data)
        self.assertFalse(User.objects.filter(email="john@example.com").exists())

    def test_register_weak_password_rejected(self):
        response = self.client.post(
            REGISTER_URL,
            self._payload(password="123", confirm_password="123"),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(email="john@example.com").exists())

    def test_register_missing_fields_rejected(self):
        response = self.client.post(REGISTER_URL, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("name", response.data)
        self.assertIn("email", response.data)
        self.assertIn("password", response.data)
        self.assertIn("role", response.data)


class LoginAPITests(APITestCase):
    def _create_user(self, role=Role.CUSTOMER, email="login@example.com"):
        return User.objects.create_user(
            email=email,
            password="StrongPass123!",
            name="Login User",
            role=role,
        )

    def test_login_customer_success(self):
        user = self._create_user(role=Role.CUSTOMER)
        response = self.client.post(
            LOGIN_URL,
            {"email": "login@example.com", "password": "StrongPass123!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["id"], user.id)
        self.assertEqual(response.data["name"], "Login User")
        self.assertEqual(response.data["email"], "login@example.com")
        self.assertEqual(response.data["role"], Role.CUSTOMER)

        # Access token must carry the user's claims and resolve to the user.
        token = AccessToken(response.data["access"])
        self.assertEqual(token["name"], "Login User")
        self.assertEqual(token["role"], Role.CUSTOMER)

        auth = JWTAuthentication()
        self.assertEqual(auth.get_user(auth.get_validated_token(response.data["access"])), user)

    def test_login_organizer_success(self):
        self._create_user(role=Role.ORGANIZER)
        response = self.client.post(
            LOGIN_URL,
            {"email": "login@example.com", "password": "StrongPass123!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["role"], Role.ORGANIZER)

    def test_login_role_in_request_is_ignored(self):
        # A role provided in the login request must NOT change the stored role.
        self._create_user(role=Role.CUSTOMER)
        response = self.client.post(
            LOGIN_URL,
            {
                "email": "login@example.com",
                "password": "StrongPass123!",
                "role": Role.ADMIN,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["role"], Role.CUSTOMER)
        self.assertEqual(response.data["id"], User.objects.get(email="login@example.com").id)

    def test_login_wrong_password_rejected(self):
        self._create_user()
        response = self.client.post(
            LOGIN_URL,
            {"email": "login@example.com", "password": "WrongPass123!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_unknown_email_rejected(self):
        response = self.client.post(
            LOGIN_URL,
            {"email": "nobody@example.com", "password": "StrongPass123!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_missing_fields_rejected(self):
        self._create_user()
        response = self.client.post(LOGIN_URL, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_admin_success(self):
        # Admins can log in too; role is returned from the database.
        user = User.objects.create_superuser(
            email="admin@example.com",
            password="StrongPass123!",
            name="Admin User",
        )
        response = self.client.post(
            LOGIN_URL,
            {"email": "admin@example.com", "password": "StrongPass123!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], user.id)
        self.assertEqual(response.data["role"], Role.ADMIN)


# --- Test-only protected views used to exercise the reusable role permissions ---


class _AdminOnlyView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        return Response({"ok": True})


class _CustomerOnlyView(APIView):
    permission_classes = [IsCustomer]

    def get(self, request):
        return Response({"ok": True})


class _OrganizerOnlyView(APIView):
    permission_classes = [IsOrganizer]

    def get(self, request):
        return Response({"ok": True})


urlpatterns = [
    path("perm/admin/", _AdminOnlyView.as_view()),
    path("perm/customer/", _CustomerOnlyView.as_view()),
    path("perm/organizer/", _OrganizerOnlyView.as_view()),
]


@override_settings(ROOT_URLCONF="accounts.tests")
class RolePermissionTests(APITestCase):
    def _make_user(self, role):
        if role == Role.ADMIN:
            # ADMIN cannot be created via public signup (create_user);
            # use the superuser path (create_superuser) which is the only way.
            return User.objects.create_superuser(
                email="admin@example.com",
                password="StrongPass123!",
                name="Admin User",
            )
        return User.objects.create_user(
            email=f"{role.lower()}@example.com",
            password="StrongPass123!",
            name=f"{role.title()} User",
            role=role,
        )

    def test_anonymous_rejected_from_all(self):
        for url in ("/perm/admin/", "/perm/customer/", "/perm/organizer/"):
            with self.subTest(url=url):
                response = self.client.get(url)
                self.assertIn(
                    response.status_code,
                    (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
                )

    def test_admin_can_only_access_admin_apis(self):
        user = self._make_user(Role.ADMIN)
        self.client.force_authenticate(user=user)
        self.assertEqual(self.client.get("/perm/admin/").status_code, status.HTTP_200_OK)
        self.assertEqual(self.client.get("/perm/customer/").status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.get("/perm/organizer/").status_code, status.HTTP_403_FORBIDDEN)

    def test_customer_can_only_access_customer_apis(self):
        user = self._make_user(Role.CUSTOMER)
        self.client.force_authenticate(user=user)
        self.assertEqual(self.client.get("/perm/customer/").status_code, status.HTTP_200_OK)
        self.assertEqual(self.client.get("/perm/admin/").status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.get("/perm/organizer/").status_code, status.HTTP_403_FORBIDDEN)

    def test_organizer_can_only_access_organizer_apis(self):
        user = self._make_user(Role.ORGANIZER)
        self.client.force_authenticate(user=user)
        self.assertEqual(self.client.get("/perm/organizer/").status_code, status.HTTP_200_OK)
        self.assertEqual(self.client.get("/perm/admin/").status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.get("/perm/customer/").status_code, status.HTTP_403_FORBIDDEN)

class MeAPITests(APITestCase):
    ME_URL = "/api/accounts/me/"

    def _create_and_force_auth(self, role=Role.CUSTOMER):
        user = User.objects.create_user(
            email="me@example.com",
            password="StrongPass123!",
            name="Me User",
            role=role,
        )
        self.client.force_authenticate(user=user)
        return user

    def test_me_requires_authentication(self):
        response = self.client.get(self.ME_URL)
        self.assertIn(
            response.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )

    def test_get_own_profile(self):
        user = self._create_and_force_auth(role=Role.CUSTOMER)
        response = self.client.get(self.ME_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], user.id)
        self.assertEqual(response.data["email"], user.email)
        self.assertEqual(response.data["name"], user.name)
        self.assertEqual(response.data["role"], Role.CUSTOMER)

    def test_patch_name_updates(self):
        user = self._create_and_force_auth(role=Role.CUSTOMER)
        response = self.client.patch(self.ME_URL, {"name": "New Name"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "New Name")
        user.refresh_from_db()
        self.assertEqual(user.name, "New Name")

    def test_cannot_change_own_role_to_organizer(self):
        user = self._create_and_force_auth(role=Role.CUSTOMER)
        response = self.client.patch(self.ME_URL, {"role": Role.ORGANIZER}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["role"], Role.CUSTOMER)
        user.refresh_from_db()
        self.assertEqual(user.role, Role.CUSTOMER)

    def test_cannot_change_own_role_to_admin(self):
        user = self._create_and_force_auth(role=Role.ORGANIZER)
        response = self.client.patch(self.ME_URL, {"role": Role.ADMIN}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["role"], Role.ORGANIZER)
        user.refresh_from_db()
        self.assertEqual(user.role, Role.ORGANIZER)
        # ADMIN role must never be assignable through public APIs.



        self.assertFalse(User.objects.filter(role=Role.ADMIN).exists())

    def test_cannot_change_email(self):
        user = self._create_and_force_auth(role=Role.CUSTOMER)
        response = self.client.patch(self.ME_URL, {"email": "hacked@example.com"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "me@example.com")
        user.refresh_from_db()
        self.assertEqual(user.email, "me@example.com")
class AdminCommandTests(TestCase):
    """Tests for the `create_admin` management command."""

    def _run(self, emails, passwords):
        """Run create_admin with mocked interactive prompts and capture output."""
        out = StringIO()
        err = StringIO()
        with patch("builtins.input", side_effect=emails), patch(
            "getpass.getpass", side_effect=passwords
        ):
            call_command(
                "create_admin",
                stdout=out,
                stderr=err,
            )
        return out.getvalue(), err.getvalue()

    def test_creates_superuser_admin(self):
        out, err = self._run(
            ["admin@example.com"],
            ["StrongPass123!", "StrongPass123!"],
        )
        self.assertIn("Admin account created", out)
        user = User.objects.get(email="admin@example.com")
        self.assertTrue(user.is_superuser)
        self.assertTrue(user.is_staff)
        self.assertEqual(user.role, Role.ADMIN)
        self.assertTrue(user.check_password("StrongPass123!"))

    def test_creates_admin_with_password_stdin(self):
        out = StringIO()
        err = StringIO()
        stdin = StringIO("StrongPass123!\nStrongPass123!\n")
        with patch("sys.stdin", stdin):
            call_command(
                "create_admin",
                email="admin@example.com",
                password_stdin=True,
                stdout=out,
                stderr=err,
            )
        self.assertIn("Admin account created", out.getvalue())
        user = User.objects.get(email="admin@example.com")
        self.assertTrue(user.is_superuser)
        self.assertEqual(user.role, Role.ADMIN)
        self.assertTrue(user.check_password("StrongPass123!"))

    def test_rejects_weak_password(self):
        out, err = self._run(
            ["admin@example.com"],
            ["123", "123", "StrongPass123!", "StrongPass123!"],
        )
        self.assertIn("This password is too short", err)
        self.assertTrue(User.objects.filter(email="admin@example.com").exists())

    def test_rejects_password_mismatch(self):
        out, err = self._run(
            ["admin@example.com"],
            ["StrongPass123!", "DifferentPass123!", "StrongPass123!", "StrongPass123!"],
        )
        self.assertIn("Passwords do not match", err)
        self.assertTrue(User.objects.filter(email="admin@example.com").exists())

    def test_rejects_existing_email(self):
        User.objects.create_user(
            email="taken@example.com",
            password="StrongPass123!",
            name="Taken",
            role=Role.CUSTOMER,
        )
        with self.assertRaisesMessage(
            CommandError, "A user with email 'taken@example.com' already exists."
        ):
            self._run(
                ["taken@example.com"],
                ["StrongPass123!", "StrongPass123!"],
            )
        # No admin was created; the existing user is untouched.
        user = User.objects.get(email="taken@example.com")
        self.assertFalse(user.is_superuser)
        self.assertEqual(user.role, Role.CUSTOMER)

    def test_rejects_invalid_email(self):
        out, err = self._run(
            ["not-an-email", "admin@example.com"],
            ["StrongPass123!", "StrongPass123!"],
        )
        self.assertIn("not a valid email", err)
        self.assertTrue(User.objects.filter(email="admin@example.com").exists())


class AdminAuthTests(TestCase):
    """Django admin authentication with the email-based custom user model."""

    def test_superuser_can_log_into_admin(self):
        User.objects.create_superuser(
            email="root@example.com",
            password="StrongPass123!",
            name="Root",
        )
        logged_in = self.client.login(
            email="root@example.com", password="StrongPass123!"
        )
        self.assertTrue(logged_in)
        response = self.client.get("/admin/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_customer_cannot_access_admin(self):
        User.objects.create_user(
            email="customer@example.com",
            password="StrongPass123!",
            name="Customer",
            role=Role.CUSTOMER,
        )
        logged_in = self.client.login(
            email="customer@example.com", password="StrongPass123!"
        )
        self.assertTrue(logged_in)
        response = self.client.get("/admin/")
        # No staff status -> redirect to the admin login page.
        self.assertEqual(response.status_code, status.HTTP_302_FOUND)
        self.assertIn("/admin/login/", response.url)

    def test_admin_user_model_registered(self):
        from django.contrib import admin as django_admin

        self.assertIn(
            User, django_admin.site._registry
        )
        registered = django_admin.site._registry[User]
        self.assertEqual(registered.ordering, ("email",))
class LogoutAPITests(APITestCase):
    LOGIN_URL = "/api/accounts/login/"
    REFRESH_URL = "/api/accounts/refresh/"
    LOGOUT_URL = "/api/accounts/logout/"

    def _login(self, role=Role.CUSTOMER, email="logout@example.com"):
        User.objects.create_user(
            email=email,
            password="StrongPass123!",
            name="Logout User",
            role=role,
        )
        response = self.client.post(
            self.LOGIN_URL,
            {"email": email, "password": "StrongPass123!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return response.data

    def test_login_returns_valid_access_and_refresh(self):
        data = self._login()
        # Access token must authenticate a protected request.
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {data['access']}")
        response = self.client.get("/api/accounts/me/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "logout@example.com")

    def test_refresh_token_returns_new_access_token(self):
        data = self._login()
        response = self.client.post(
            self.REFRESH_URL, {"refresh": data["refresh"]}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)

    def test_logout_blacklists_refresh_token(self):
        data = self._login()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {data['access']}")
        # Logout requires authentication + a valid refresh token.
        response = self.client.post(
            self.LOGOUT_URL, {"refresh": data["refresh"]}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_205_RESET_CONTENT)

    def test_logout_rejects_unauthenticated_request(self):
        data = self._login()
        response = self.client.post(
            self.LOGOUT_URL, {"refresh": data["refresh"]}, format="json"
        )
        self.assertIn(
            response.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )

    def test_logout_rejects_invalid_refresh_token(self):
        data = self._login()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {data['access']}")
        response = self.client.post(
            self.LOGOUT_URL, {"refresh": "not-a-token"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_blacklisted_refresh_token_rejected(self):
        data = self._login()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {data['access']}")
        # Logout blacklists this refresh token.
        response = self.client.post(
            self.LOGOUT_URL, {"refresh": data["refresh"]}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_205_RESET_CONTENT)

        # The blacklisted refresh token must no longer issue new tokens.
        response = self.client.post(
            self.REFRESH_URL, {"refresh": data["refresh"]}, format="json"
        )
        self.assertIn(
            response.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_400_BAD_REQUEST),
        )
class ChangePasswordAPITests(APITestCase):
    LOGIN_URL = "/api/accounts/login/"
    REFRESH_URL = "/api/accounts/refresh/"
    CHANGE_URL = "/api/accounts/change-password/"

    OLD_PASSWORD = "StrongPass123!"
    NEW_PASSWORD = "NewStrongPass456!"

    def _create_and_login(self, email="change@example.com"):
        User.objects.create_user(
            email=email,
            password=self.OLD_PASSWORD,
            name="Change User",
            role=Role.CUSTOMER,
        )
        response = self.client.post(
            self.LOGIN_URL,
            {"email": email, "password": self.OLD_PASSWORD},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")
        return response.data

    def _change(self, old=None, new=None, confirm=None):
        payload = {
            "old_password": self.OLD_PASSWORD if old is None else old,
            "new_password": self.NEW_PASSWORD if new is None else new,
            "confirm_password": self.NEW_PASSWORD if confirm is None else confirm,
        }
        return self.client.post(self.CHANGE_URL, payload, format="json")

    def test_change_password_success(self):
        self._create_and_login()
        response = self._change()
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # The stored password must be hashed, never plaintext.
        user = User.objects.get(email="change@example.com")
        self.assertNotEqual(user.password, self.NEW_PASSWORD)
        self.assertTrue(user.check_password(self.NEW_PASSWORD))

        # Old password no longer logs in; the new password does.
        old_login = self.client.post(
            self.LOGIN_URL,
            {"email": "change@example.com", "password": self.OLD_PASSWORD},
            format="json",
        )
        self.assertEqual(old_login.status_code, status.HTTP_401_UNAUTHORIZED)

        new_login = self.client.post(
            self.LOGIN_URL,
            {"email": "change@example.com", "password": self.NEW_PASSWORD},
            format="json",
        )
        self.assertEqual(new_login.status_code, status.HTTP_200_OK)

    def test_change_password_wrong_old_password(self):
        self._create_and_login()
        response = self._change(old="WrongOldPass123!")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("old_password", response.data)

        # Password must remain unchanged on failure.
        user = User.objects.get(email="change@example.com")
        self.assertTrue(user.check_password(self.OLD_PASSWORD))
        self.assertFalse(user.check_password(self.NEW_PASSWORD))

    def test_change_password_rejects_confirmation_mismatch(self):
        self._create_and_login()
        response = self._change(confirm="DifferentPass456!")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("confirm_password", response.data)

        user = User.objects.get(email="change@example.com")
        self.assertTrue(user.check_password(self.OLD_PASSWORD))

    def test_change_password_rejects_weak_new_password(self):
        self._create_and_login()
        response = self._change(new="123", confirm="123")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        user = User.objects.get(email="change@example.com")
        self.assertTrue(user.check_password(self.OLD_PASSWORD))

    def test_change_password_requires_authentication(self):
        response = self._change()
        self.assertIn(
            response.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )

    def test_change_password_invalidates_existing_refresh_tokens(self):
        data = self._create_and_login()
        self._change()

        # The refresh token issued before the password change must be dead.
        response = self.client.post(
            self.REFRESH_URL, {"refresh": data["refresh"]}, format="json"
        )
        self.assertIn(
            response.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_400_BAD_REQUEST),
        )


class PasswordResetAPITests(APITestCase):
    """Phase 2 Step 8: forgot-password / reset-password flows."""

    FORGOT_URL = "/api/auth/forgot-password/"
    RESET_URL = "/api/auth/reset-password/"
    LOGIN_URL = "/api/accounts/login/"
    REFRESH_URL = "/api/accounts/refresh/"

    OLD_PASSWORD = "StrongPass123!"
    NEW_PASSWORD = "BrandNewPass789!"
    GENERIC_DETAIL = (
        "If an account with that email exists, a password reset link has been sent."
    )

    def setUp(self):
        self.user = User.objects.create_user(
            email="reset@example.com",
            password=self.OLD_PASSWORD,
            name="Reset User",
            role=Role.CUSTOMER,
        )

    def _request_reset(self, email="reset@example.com"):
        return self.client.post(self.FORGOT_URL, {"email": email}, format="json")

    def _uid_and_token(self, user=None):
        user = user or self.user
        # Login may have updated last_login (UPDATE_LAST_LOGIN=True), which is
        # part of the token hash — always build tokens from fresh DB state.
        user.refresh_from_db()
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        return uid, default_token_generator.make_token(user)

    def _reset(self, uid, token, new_password=None, confirm=None):
        new_password = new_password or self.NEW_PASSWORD
        return self.client.post(
            self.RESET_URL,
            {
                "uid": uid,
                "token": token,
                "new_password": new_password,
                "confirm_password": new_password if confirm is None else confirm,
            },
            format="json",
        )

    def test_forgot_password_sends_email_with_working_token(self):
        response = self._request_reset()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["detail"], self.GENERIC_DETAIL)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("reset@example.com", mail.outbox[0].to)

        # The emailed link must contain a uid + token pair that validates.
        match = re.search(
            r"uid=([A-Za-z0-9_\-=]+)&token=([0-9a-z]+-[0-9a-f]+)",
            mail.outbox[0].body,
        )
        self.assertIsNotNone(match)
        self.assertTrue(default_token_generator.check_token(self.user, match.group(2)))

    def test_forgot_password_never_reveals_unknown_email(self):
        response = self._request_reset("ghost@example.com")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["detail"], self.GENERIC_DETAIL)
        # No email is sent for unregistered addresses.
        self.assertEqual(len(mail.outbox), 0)

    def test_forgot_password_same_response_for_known_and_unknown_email(self):
        known = self._request_reset("reset@example.com")
        mail.outbox = []
        unknown = self._request_reset("ghost@example.com")
        self.assertEqual(known.status_code, unknown.status_code)
        self.assertEqual(known.data, unknown.data)

    def test_forgot_password_missing_email_rejected(self):
        response = self.client.post(self.FORGOT_URL, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # --- reset-password ---

    def test_reset_password_success(self):
        uid, token = self._uid_and_token()
        response = self._reset(uid, token)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # The stored password must be hashed, and actually changed.
        user = User.objects.get(email="reset@example.com")
        self.assertNotEqual(user.password, self.NEW_PASSWORD)
        self.assertTrue(user.check_password(self.NEW_PASSWORD))
        self.assertFalse(user.check_password(self.OLD_PASSWORD))

        old_login = self.client.post(
            self.LOGIN_URL,
            {"email": "reset@example.com", "password": self.OLD_PASSWORD},
            format="json",
        )
        self.assertEqual(old_login.status_code, status.HTTP_401_UNAUTHORIZED)

        new_login = self.client.post(
            self.LOGIN_URL,
            {"email": "reset@example.com", "password": self.NEW_PASSWORD},
            format="json",
        )
        self.assertEqual(new_login.status_code, status.HTTP_200_OK)

    def test_reset_password_rejects_invalid_token(self):
        uid, _ = self._uid_and_token()
        response = self._reset(uid, "not-a-real-token")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("token", response.data)

    def test_reset_password_rejects_token_belonging_to_other_user(self):
        other = User.objects.create_user(
            email="other@example.com",
            password="OtherStrongPass1!",
            name="Other User",
        )
        uid, _ = self._uid_and_token()
        _, other_token = self._uid_and_token(other)
        response = self._reset(uid, other_token)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reset_password_rejects_expired_token(self):
        uid, token = self._uid_and_token()
        # PASSWORD_RESET_TIMEOUT=-1 makes every token instantly expired.
        with override_settings(PASSWORD_RESET_TIMEOUT=-1):
            response = self._reset(uid, token)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("token", response.data)

    def test_reset_password_token_is_single_use(self):
        uid, token = self._uid_and_token()
        first = self._reset(uid, token)
        self.assertEqual(first.status_code, status.HTTP_200_OK)

        # The token is tied to the old password hash; after a successful
        # reset it can never be used again.
        second = self._reset(uid, token, new_password="AnotherNewPass456!")
        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reset_password_rejects_invalid_uid(self):
        _, token = self._uid_and_token()
        response = self._reset("!!!not-base64!!!", token)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reset_password_rejects_uid_of_unknown_user(self):
        _, token = self._uid_and_token()
        unknown_uid = urlsafe_base64_encode(force_bytes(99999))
        response = self._reset(unknown_uid, token)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reset_password_rejects_mismatched_confirmation(self):
        uid, token = self._uid_and_token()
        response = self._reset(uid, token, confirm="DifferentPass123!")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("confirm_password", response.data)

        user = User.objects.get(email="reset@example.com")
        self.assertTrue(user.check_password(self.OLD_PASSWORD))

    def test_reset_password_rejects_weak_password(self):
        uid, token = self._uid_and_token()
        response = self._reset(uid, token, new_password="123", confirm="123")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        user = User.objects.get(email="reset@example.com")
        self.assertTrue(user.check_password(self.OLD_PASSWORD))

    def test_reset_password_invalidates_existing_refresh_tokens(self):
        login = self.client.post(
            self.LOGIN_URL,
            {"email": "reset@example.com", "password": self.OLD_PASSWORD},
            format="json",
        )
        self.assertEqual(login.status_code, status.HTTP_200_OK)
        refresh = login.data["refresh"]

        uid, token = self._uid_and_token()
        self.assertEqual(self._reset(uid, token).status_code, status.HTTP_200_OK)

        # Sessions opened before the reset cannot survive it.
        response = self.client.post(
            self.REFRESH_URL, {"refresh": refresh}, format="json"
        )
        self.assertIn(
            response.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_400_BAD_REQUEST),
        )


class CustomerProfileAPITests(APITestCase):
    """Tests for GET/PATCH /api/accounts/customer-profile/."""

    def _register_and_login(self, role=Role.CUSTOMER, email="cust@example.com"):
        """Register through the public API, log in, and attach the JWT."""
        payload = {
            "name": "Test Customer",
            "email": email,
            "password": "StrongPass123!",
            "confirm_password": "StrongPass123!",
            "role": role,
        }
        register = self.client.post(REGISTER_URL, payload, format="json")
        self.assertEqual(register.status_code, status.HTTP_201_CREATED, register.data)
        login = self.client.post(
            LOGIN_URL, {"email": email, "password": "StrongPass123!"}, format="json"
        )
        self.assertEqual(login.status_code, status.HTTP_200_OK, login.data)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
        return User.objects.get(email=email)

    def test_profile_auto_created_on_customer_registration(self):
        user = self._register_and_login()
        self.assertTrue(CustomerProfile.objects.filter(user=user).exists())

    def test_organizer_does_not_get_a_profile(self):
        self._register_and_login(role=Role.ORGANIZER, email="org@example.com")
        self.assertFalse(
            CustomerProfile.objects.filter(user__email="org@example.com").exists()
        )

    def test_customer_can_get_own_profile(self):
        user = self._register_and_login()
        response = self.client.get(CUSTOMER_PROFILE_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], user.email)
        self.assertEqual(response.data["role"], Role.CUSTOMER)
        self.assertEqual(response.data["name"], user.name)
        for field in (
            "phone",
            "date_of_birth",
            "gender",
            "address",
            "city",
            "state",
            "pincode",
            "profile_picture",
        ):
            self.assertIn(field, response.data)

    def test_customer_can_update_own_profile(self):
        self._register_and_login()
        response = self.client.patch(
            CUSTOMER_PROFILE_URL,
            {
                "phone": "+919876543210",
                "date_of_birth": "1995-04-12",
                "gender": "MALE",
                "address": "221B Baker Street",
                "city": "Pune",
                "state": "Maharashtra",
                "pincode": "411001",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        profile = CustomerProfile.objects.get(user__email="cust@example.com")
        self.assertEqual(profile.phone, "+919876543210")
        self.assertEqual(str(profile.date_of_birth), "1995-04-12")
        self.assertEqual(profile.gender, "MALE")
        self.assertEqual(profile.address, "221B Baker Street")
        self.assertEqual(profile.city, "Pune")
        self.assertEqual(profile.state, "Maharashtra")
        self.assertEqual(profile.pincode, "411001")

    def test_customer_cannot_change_email_or_role_via_profile(self):
        user = self._register_and_login()
        response = self.client.patch(
            CUSTOMER_PROFILE_URL,
            {"email": "hacker@example.com", "role": Role.ORGANIZER, "city": "Goa"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertEqual(user.email, "cust@example.com")
        self.assertEqual(user.role, Role.CUSTOMER)

    def test_organizer_cannot_access_customer_profile(self):
        self._register_and_login(role=Role.ORGANIZER, email="org@example.com")
        response = self.client.get(CUSTOMER_PROFILE_URL)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_cannot_access_customer_profile(self):
        admin = User.objects.create_superuser(
            email="admin@example.com", password="StrongPass123!", name="Admin"
        )
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {AccessToken.for_user(admin)}"
        )
        response = self.client.get(CUSTOMER_PROFILE_URL)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_anonymous_cannot_access_customer_profile(self):
        response = self.client.get(CUSTOMER_PROFILE_URL)
        self.assertIn(
            response.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )

    def test_missing_profile_is_created_safely_on_first_access(self):
        user = self._register_and_login()
        # Simulate a customer whose profile is missing (e.g. legacy data).
        CustomerProfile.objects.filter(user=user).delete()
        response = self.client.get(CUSTOMER_PROFILE_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(CustomerProfile.objects.filter(user=user).exists())

    def test_only_customers_can_have_a_profile(self):
        organizer = User.objects.create_user(
            email="org2@example.com",
            password="StrongPass123!",
            name="Organizer",
            role=Role.ORGANIZER,
        )
        with self.assertRaises(ValueError):
            CustomerProfile.objects.create(user=organizer)

    def test_future_date_of_birth_rejected(self):
        self._register_and_login()
        response = self.client.patch(
            CUSTOMER_PROFILE_URL, {"date_of_birth": "2999-01-01"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("date_of_birth", response.data)

    def test_invalid_phone_rejected(self):
        self._register_and_login()
        response = self.client.patch(
            CUSTOMER_PROFILE_URL, {"phone": "not-a-phone"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("phone", response.data)

    def test_invalid_pincode_rejected(self):
        self._register_and_login()
        response = self.client.patch(
            CUSTOMER_PROFILE_URL, {"pincode": "AB12"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("pincode", response.data)

    def test_profile_picture_upload(self):
        self._register_and_login()
        with tempfile.TemporaryDirectory() as media_root:
            with override_settings(MEDIA_ROOT=media_root):
                upload = SimpleUploadedFile(
                    "avatar.png", TINY_PNG, content_type="image/png"
                )
                response = self.client.patch(
                    CUSTOMER_PROFILE_URL,
                    {"profile_picture": upload},
                    format="multipart",
                )
                self.assertEqual(response.status_code, status.HTTP_200_OK)
                profile = CustomerProfile.objects.get(user__email="cust@example.com")
                self.assertTrue(
                    profile.profile_picture.name.startswith("customer_profiles/")
                )
                self.assertTrue(os.path.exists(profile.profile_picture.path))
    # --- Phase 3 Step 3: strengthened validation/security ----------------

    def test_phone_too_short_rejected(self):
        self._register_and_login()
        response = self.client.patch(
            CUSTOMER_PROFILE_URL, {"phone": "98765"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("phone", response.data)

    def test_phone_too_long_rejected(self):
        self._register_and_login()
        response = self.client.patch(
            CUSTOMER_PROFILE_URL, {"phone": "+91987654321098765"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("phone", response.data)

    def test_pincode_must_be_valid_indian_pincode(self):
        self._register_and_login()
        for bad in ("000000", "12345", "1234567", "56000A"):
            response = self.client.patch(
                CUSTOMER_PROFILE_URL, {"pincode": bad}, format="json"
            )
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn("pincode", response.data)
        response = self.client.patch(
            CUSTOMER_PROFILE_URL, {"pincode": "560001"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_profile_picture_rejects_wrong_extension(self):
        self._register_and_login()
        with tempfile.TemporaryDirectory() as media_root:
            with override_settings(MEDIA_ROOT=media_root):
                upload = SimpleUploadedFile(
                    "avatar.gif", TINY_PNG, content_type="image/gif"
                )
                response = self.client.patch(
                    CUSTOMER_PROFILE_URL,
                    {"profile_picture": upload},
                    format="multipart",
                )
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertIn("profile_picture", response.data)

    def test_profile_picture_rejects_spoofed_content(self):
        self._register_and_login()
        with tempfile.TemporaryDirectory() as media_root:
            with override_settings(MEDIA_ROOT=media_root):
                upload = SimpleUploadedFile(
                    "malware.png",
                    b"MZ\x90\x00not-really-an-image",
                    content_type="application/octet-stream",
                )
                response = self.client.patch(
                    CUSTOMER_PROFILE_URL,
                    {"profile_picture": upload},
                    format="multipart",
                )
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertIn("profile_picture", response.data)

    def test_profile_picture_rejects_oversized_file(self):
        self._register_and_login()
        with tempfile.TemporaryDirectory() as media_root:
            with override_settings(
                MEDIA_ROOT=media_root,
                DATA_UPLOAD_MAX_MEMORY_SIZE=10 * 1024 * 1024,
            ):
                big = SimpleUploadedFile(
                    "big.png",
                    TINY_PNG + b"\x00" * (6 * 1024 * 1024),
                    content_type="image/png",
                )
                response = self.client.patch(
                    CUSTOMER_PROFILE_URL,
                    {"profile_picture": big},
                    format="multipart",
                )
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertIn("profile_picture", response.data)


class OrganizerProfileAPITests(APITestCase):
    """Phase 3 Step 2: organizer profile get/update, permissions and guards."""

    def _register_organizer(self):
        payload = {
            "name": "Org User",
            "email": "org@example.com",
            "password": "StrongPass123",
            "confirm_password": "StrongPass123",
            "role": "ORGANIZER",
        }
        response = self.client.post(REGISTER_URL, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        tokens = self.client.post(
            LOGIN_URL,
            {"email": "org@example.com", "password": "StrongPass123"},
            format="json",
        )
        self.assertEqual(tokens.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION="Bearer " + tokens.data["access"])

    def _register_customer(self):
        payload = {
            "name": "Cust User",
            "email": "cust@example.com",
            "password": "StrongPass123",
            "confirm_password": "StrongPass123",
            "role": "CUSTOMER",
        }
        response = self.client.post(REGISTER_URL, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        tokens = self.client.post(
            LOGIN_URL,
            {"email": "cust@example.com", "password": "StrongPass123"},
            format="json",
        )
        self.assertEqual(tokens.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION="Bearer " + tokens.data["access"])

    def _create_admin(self):
        User.objects.create_superuser(
            email="admin@example.com", name="Admin User", password="StrongPass123"
        )
        tokens = self.client.post(
            LOGIN_URL,
            {"email": "admin@example.com", "password": "StrongPass123"},
            format="json",
        )
        self.assertEqual(tokens.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION="Bearer " + tokens.data["access"])

    def test_profile_auto_created_on_organizer_registration(self):
        self._register_organizer()
        organizer = User.objects.get(email="org@example.com")
        self.assertTrue(OrganizerProfile.objects.filter(user=organizer).exists())

    def test_customer_registration_does_not_create_organizer_profile(self):
        self._register_customer()
        customer = User.objects.get(email="cust@example.com")
        self.assertFalse(OrganizerProfile.objects.filter(user=customer).exists())

    def test_organizer_can_get_own_profile(self):
        self._register_organizer()
        response = self.client.get(ORGANIZER_PROFILE_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "org@example.com")
        self.assertEqual(response.data["role"], "ORGANIZER")
        self.assertEqual(response.data["organization_name"], "")
    def test_organizer_can_update_own_profile(self):
        self._register_organizer()
        response = self.client.patch(
            ORGANIZER_PROFILE_URL,
            {
                "phone": "+919876543210",
                "organization_name": "Live Shows Pvt Ltd",
                "organization_description": "Concert promotion",
                "address": "12 MG Road",
                "city": "Bengaluru",
                "state": "Karnataka",
                "pincode": "560001",
                "website": "https://liveshows.example.com",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        organizer = User.objects.get(email="org@example.com")
        profile = OrganizerProfile.objects.get(user=organizer)
        self.assertEqual(profile.phone, "+919876543210")
        self.assertEqual(profile.organization_name, "Live Shows Pvt Ltd")
        self.assertEqual(profile.website, "https://liveshows.example.com")
        self.assertEqual(profile.city, "Bengaluru")

    def test_customer_cannot_access_organizer_profile(self):
        self._register_customer()
        response = self.client.get(ORGANIZER_PROFILE_URL)
        self.assertIn(
            response.status_code,
            (status.HTTP_403_FORBIDDEN, status.HTTP_401_UNAUTHORIZED),
        )

    def test_admin_cannot_access_organizer_profile(self):
        self._create_admin()
        response = self.client.get(ORGANIZER_PROFILE_URL)
        self.assertIn(
            response.status_code,
            (status.HTTP_403_FORBIDDEN, status.HTTP_401_UNAUTHORIZED),
        )

    def test_anonymous_cannot_access_organizer_profile(self):
        response = self.client.get(ORGANIZER_PROFILE_URL)
        self.assertIn(
            response.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )

    def test_email_cannot_be_changed_via_profile(self):
        self._register_organizer()
        response = self.client.patch(
            ORGANIZER_PROFILE_URL, {"email": "evil@example.com"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        organizer = User.objects.get(email="org@example.com")
        self.assertEqual(organizer.email, "org@example.com")
        self.assertFalse(User.objects.filter(email="evil@example.com").exists())

    def test_role_cannot_be_changed_via_profile(self):
        self._register_organizer()
        response = self.client.patch(
            ORGANIZER_PROFILE_URL, {"role": "CUSTOMER"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        organizer = User.objects.get(email="org@example.com")
        self.assertEqual(organizer.role, Role.ORGANIZER)

    def test_missing_profile_created_safely_on_first_access(self):
        self._register_organizer()
        OrganizerProfile.objects.get(user__email="org@example.com").delete()
        response = self.client.get(ORGANIZER_PROFILE_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(
            OrganizerProfile.objects.filter(user__email="org@example.com").exists()
        )

    def test_non_organizer_model_save_raises(self):
        self._register_customer()
        customer = User.objects.get(email="cust@example.com")
        with self.assertRaises(ValueError):
            OrganizerProfile.objects.create(user=customer)

    def test_invalid_website_rejected(self):
        self._register_organizer()
        response = self.client.patch(
            ORGANIZER_PROFILE_URL, {"website": "not-a-url"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("website", response.data)

    def test_invalid_phone_rejected(self):
        self._register_organizer()
        response = self.client.patch(
            ORGANIZER_PROFILE_URL, {"phone": "12AB34"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("phone", response.data)

    def test_invalid_pincode_rejected(self):
        self._register_organizer()
        response = self.client.patch(
            ORGANIZER_PROFILE_URL, {"pincode": "5600XY"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("pincode", response.data)

    # --- Phase 3 Step 3: strengthened validation/security ----------------

    def test_phone_too_short_rejected(self):
        self._register_organizer()
        response = self.client.patch(
            ORGANIZER_PROFILE_URL, {"phone": "98765"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("phone", response.data)

    def test_pincode_must_be_valid_indian_pincode(self):
        self._register_organizer()
        for bad in ("000000", "12345", "56000A"):
            response = self.client.patch(
                ORGANIZER_PROFILE_URL, {"pincode": bad}, format="json"
            )
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn("pincode", response.data)
        response = self.client.patch(
            ORGANIZER_PROFILE_URL, {"pincode": "560001"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_website_must_be_http_or_https(self):
        self._register_organizer()
        for bad in ("ftp://files.example.com", "javascript:alert(1)"):
            response = self.client.patch(
                ORGANIZER_PROFILE_URL, {"website": bad}, format="json"
            )
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn("website", response.data)
        response = self.client.patch(
            ORGANIZER_PROFILE_URL,
            {"website": "https://liveshows.example.com"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_profile_picture_rejects_spoofed_content(self):
        self._register_organizer()
        with tempfile.TemporaryDirectory() as media_root:
            with override_settings(MEDIA_ROOT=media_root):
                upload = SimpleUploadedFile(
                    "malware.png",
                    b"MZ\x90\x00not-really-an-image",
                    content_type="application/octet-stream",
                )
                response = self.client.patch(
                    ORGANIZER_PROFILE_URL,
                    {"profile_picture": upload},
                    format="multipart",
                )
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertIn("profile_picture", response.data)

    def test_profile_picture_rejects_oversized_file(self):
        self._register_organizer()
        with tempfile.TemporaryDirectory() as media_root:
            with override_settings(
                MEDIA_ROOT=media_root,
                DATA_UPLOAD_MAX_MEMORY_SIZE=10 * 1024 * 1024,
            ):
                big = SimpleUploadedFile(
                    "big.png",
                    TINY_PNG + b"\x00" * (6 * 1024 * 1024),
                    content_type="image/png",
                )
                response = self.client.patch(
                    ORGANIZER_PROFILE_URL,
                    {"profile_picture": big},
                    format="multipart",
                )
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertIn("profile_picture", response.data)

    def test_profile_picture_upload(self):
        self._register_organizer()
        with tempfile.TemporaryDirectory() as media_root:
            with override_settings(MEDIA_ROOT=media_root):
                upload = SimpleUploadedFile(
                    "org.png", TINY_PNG, content_type="image/png"
                )
                response = self.client.patch(
                    ORGANIZER_PROFILE_URL,
                    {"profile_picture": upload},
                    format="multipart",
                )
                self.assertEqual(response.status_code, status.HTTP_200_OK)
                profile = OrganizerProfile.objects.get(user__email="org@example.com")
                self.assertTrue(
                    profile.profile_picture.name.startswith("organizer_profiles/")
                )
                self.assertTrue(os.path.exists(profile.profile_picture.path))