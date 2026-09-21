from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Category, Venue

User = get_user_model()

CATEGORY_LIST_URL = "/api/events/categories/"
CATEGORY_CREATE_URL = "/api/events/categories/create/"

VALID_PASSWORD = "TestPass@123"


class CategoryListAPITests(APITestCase):
    """Tests for the read-only category list API."""

    def setUp(self):
        self.active_music = Category.objects.create(
            name="Music", description="Concerts and live shows"
        )
        self.active_sports = Category.objects.create(name="Sports")
        self.inactive_festival = Category.objects.create(
            name="Old Festival", is_active=False
        )
        self.customer = User.objects.create_user(
            email="customer@example.com", password=VALID_PASSWORD, name="Customer"
        )
        self.organizer = User.objects.create_user(
            email="organizer@example.com",
            password=VALID_PASSWORD,
            name="Organizer",
            role="ORGANIZER",
        )
        self.admin = User.objects.create_superuser(
            email="admin@example.com", password=VALID_PASSWORD, name="Admin"
        )

    def authenticate(self, user):
        response = self.client.post(
            "/api/accounts/login/",
            {"email": user.email, "password": VALID_PASSWORD},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {response.data['access']}"
        )

    def test_anonymous_user_rejected(self):
        response = self.client.get(CATEGORY_LIST_URL)
        self.assertIn(
            response.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )

    def test_customer_lists_only_active_categories(self):
        self.authenticate(self.customer)
        response = self.client.get(CATEGORY_LIST_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [item["name"] for item in response.data]
        self.assertEqual(names, ["Music", "Sports"])
        self.assertNotIn("Old Festival", names)

    def test_organizer_lists_only_active_categories(self):
        self.authenticate(self.organizer)
        response = self.client.get(CATEGORY_LIST_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [item["name"] for item in response.data]
        self.assertEqual(names, ["Music", "Sports"])
        self.assertNotIn("Old Festival", names)

    def test_admin_sees_all_categories_including_inactive(self):
        self.authenticate(self.admin)
        response = self.client.get(CATEGORY_LIST_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [item["name"] for item in response.data]
        self.assertEqual(names, ["Music", "Old Festival", "Sports"])

    def test_results_are_ordered_by_name(self):
        self.authenticate(self.customer)
        response = self.client.get(CATEGORY_LIST_URL)
        names = [item["name"] for item in response.data]
        self.assertEqual(names, sorted(names))

    def test_response_contains_expected_fields(self):
        self.authenticate(self.customer)
        response = self.client.get(CATEGORY_LIST_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        expected = {
            "id",
            "name",
            "description",
            "is_active",
            "created_at",
            "updated_at",
        }
        for item in response.data:
            self.assertEqual(set(item.keys()), expected)

    def test_create_is_not_allowed(self):
        self.authenticate(self.admin)
        response = self.client.post(
            CATEGORY_LIST_URL, {"name": "Hackers"}, format="json"
        )
        self.assertEqual(
            response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED
        )
        self.assertFalse(Category.objects.filter(name="Hackers").exists())

    def test_update_is_not_allowed(self):
        self.authenticate(self.admin)
        # The collection endpoint refuses write methods.
        response = self.client.patch(
            CATEGORY_LIST_URL, {"name": "Changed"}, format="json"
        )
        self.assertEqual(
            response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED
        )
        # No per-object route exists at all -> 404.
        detail_response = self.client.patch(
            f"{CATEGORY_LIST_URL}{self.active_music.id}/",
            {"name": "Changed"},
            format="json",
        )
        self.assertEqual(detail_response.status_code, status.HTTP_404_NOT_FOUND)
        self.active_music.refresh_from_db()
        self.assertEqual(self.active_music.name, "Music")

    def test_delete_is_not_allowed(self):
        self.authenticate(self.admin)
        # The collection endpoint refuses write methods.
        response = self.client.delete(CATEGORY_LIST_URL)
        self.assertEqual(
            response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED
        )
        # No per-object route exists at all -> 404.
        detail_response = self.client.delete(
            f"{CATEGORY_LIST_URL}{self.active_music.id}/"
        )
        self.assertEqual(detail_response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(
            Category.objects.filter(id=self.active_music.id).exists()
        )


class CategoryCreateAPITests(APITestCase):
    """Tests for the ADMIN-only category creation API."""

    def setUp(self):
        Category.objects.create(name="Music")
        self.customer = User.objects.create_user(
            email="customer@example.com", password=VALID_PASSWORD, name="Customer"
        )
        self.organizer = User.objects.create_user(
            email="organizer@example.com",
            password=VALID_PASSWORD,
            name="Organizer",
            role="ORGANIZER",
        )
        self.admin = User.objects.create_superuser(
            email="admin@example.com", password=VALID_PASSWORD, name="Admin"
        )

    def authenticate(self, user):
        response = self.client.post(
            "/api/accounts/login/",
            {"email": user.email, "password": VALID_PASSWORD},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {response.data['access']}"
        )

    def valid_payload(self, **overrides):
        payload = {
            "name": "Sports",
            "description": "Cricket, football and more",
            "is_active": True,
        }
        payload.update(overrides)
        return payload

    def test_admin_can_create_category(self):
        self.authenticate(self.admin)
        response = self.client.post(
            CATEGORY_CREATE_URL, self.valid_payload(), format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Category.objects.filter(name="Sports").exists())
        self.assertEqual(response.data["name"], "Sports")
        self.assertTrue(response.data["is_active"])
        self.assertIn("id", response.data)
        self.assertIn("created_at", response.data)

    def test_is_active_defaults_to_true_when_omitted(self):
        self.authenticate(self.admin)
        response = self.client.post(
            CATEGORY_CREATE_URL,
            {"name": "Theatre", "description": "Stage plays"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Category.objects.get(name="Theatre").is_active)

    def test_admin_can_create_inactive_category(self):
        self.authenticate(self.admin)
        response = self.client.post(
            CATEGORY_CREATE_URL,
            self.valid_payload(name="Legacy", is_active=False),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertFalse(Category.objects.get(name="Legacy").is_active)

    def test_customer_is_denied(self):
        self.authenticate(self.customer)
        response = self.client.post(
            CATEGORY_CREATE_URL, self.valid_payload(), format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(Category.objects.filter(name="Sports").exists())

    def test_organizer_is_denied(self):
        self.authenticate(self.organizer)
        response = self.client.post(
            CATEGORY_CREATE_URL, self.valid_payload(), format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(Category.objects.filter(name="Sports").exists())

    def test_anonymous_is_denied(self):
        response = self.client.post(
            CATEGORY_CREATE_URL, self.valid_payload(), format="json"
        )
        self.assertIn(
            response.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )
        self.assertFalse(Category.objects.filter(name="Sports").exists())

    def test_duplicate_name_rejected(self):
        self.authenticate(self.admin)
        response = self.client.post(
            CATEGORY_CREATE_URL, self.valid_payload(name="Music"), format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("name", response.data)
        self.assertEqual(Category.objects.filter(name="Music").count(), 1)

    def test_duplicate_name_rejected_case_insensitive(self):
        self.authenticate(self.admin)
        response = self.client.post(
            CATEGORY_CREATE_URL, self.valid_payload(name="MUSIC"), format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("name", response.data)
        self.assertEqual(Category.objects.filter(name__iexact="music").count(), 1)

    def test_missing_name_rejected(self):
        self.authenticate(self.admin)
        response = self.client.post(
            CATEGORY_CREATE_URL,
            {"description": "no name given"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("name", response.data)
        self.assertEqual(Category.objects.count(), 1)

    def test_blank_name_rejected(self):
        self.authenticate(self.admin)
        response = self.client.post(
            CATEGORY_CREATE_URL, self.valid_payload(name="   "), format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("name", response.data)
        self.assertEqual(Category.objects.count(), 1)

    def test_invalid_is_active_rejected(self):
        self.authenticate(self.admin)
        response = self.client.post(
            CATEGORY_CREATE_URL,
            self.valid_payload(is_active="not-a-boolean"),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("is_active", response.data)
        self.assertEqual(Category.objects.count(), 1)

    def test_name_exceeding_max_length_rejected(self):
        self.authenticate(self.admin)
        response = self.client.post(
            CATEGORY_CREATE_URL,
            self.valid_payload(name="x" * 101),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("name", response.data)
        self.assertEqual(Category.objects.count(), 1)

    def test_get_is_not_allowed_on_create_endpoint(self):
        self.authenticate(self.admin)
        response = self.client.get(CATEGORY_CREATE_URL)
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)


def category_update_url(category_id):
    return f"/api/events/categories/{category_id}/update/"


class CategoryUpdateAPITests(APITestCase):
    """Tests for the ADMIN-only category update API."""

    def setUp(self):
        self.music = Category.objects.create(
            name="Music", description="Concerts and live shows"
        )
        self.sports = Category.objects.create(name="Sports")
        self.customer = User.objects.create_user(
            email="customer@example.com", password=VALID_PASSWORD, name="Customer"
        )
        self.organizer = User.objects.create_user(
            email="organizer@example.com",
            password=VALID_PASSWORD,
            name="Organizer",
            role="ORGANIZER",
        )
        self.admin = User.objects.create_superuser(
            email="admin@example.com", password=VALID_PASSWORD, name="Admin"
        )

    def authenticate(self, user):
        response = self.client.post(
            "/api/accounts/login/",
            {"email": user.email, "password": VALID_PASSWORD},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {response.data['access']}"
        )

    def test_admin_can_patch_name(self):
        self.authenticate(self.admin)
        response = self.client.patch(
            category_update_url(self.music.id), {"name": "Live Music"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.music.refresh_from_db()
        self.assertEqual(self.music.name, "Live Music")
        self.assertEqual(response.data["id"], self.music.id)

    def test_admin_can_patch_is_active(self):
        self.authenticate(self.admin)
        response = self.client.patch(
            category_update_url(self.music.id), {"is_active": False}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.music.refresh_from_db()
        self.assertFalse(self.music.is_active)

    def test_admin_can_patch_description(self):
        self.authenticate(self.admin)
        response = self.client.patch(
            category_update_url(self.sports.id),
            {"description": "All sporting events"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.sports.refresh_from_db()
        self.assertEqual(self.sports.description, "All sporting events")

    def test_admin_can_put_full_update(self):
        self.authenticate(self.admin)
        response = self.client.put(
            category_update_url(self.sports.id),
            {"name": "Sports & Fitness", "is_active": False},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.sports.refresh_from_db()
        self.assertEqual(self.sports.name, "Sports & Fitness")
        self.assertFalse(self.sports.is_active)
        self.assertEqual(self.sports.description, "")

    def test_customer_is_denied(self):
        self.authenticate(self.customer)
        response = self.client.patch(
            category_update_url(self.music.id), {"name": "Hacked"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.music.refresh_from_db()
        self.assertEqual(self.music.name, "Music")

    def test_organizer_is_denied(self):
        self.authenticate(self.organizer)
        response = self.client.patch(
            category_update_url(self.music.id), {"name": "Hacked"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.music.refresh_from_db()
        self.assertEqual(self.music.name, "Music")

    def test_anonymous_is_denied(self):
        response = self.client.patch(
            category_update_url(self.music.id), {"name": "Hacked"}, format="json"
        )
        self.assertIn(
            response.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )
        self.music.refresh_from_db()
        self.assertEqual(self.music.name, "Music")

    def test_duplicate_name_rejected(self):
        self.authenticate(self.admin)
        response = self.client.patch(
            category_update_url(self.music.id), {"name": "Sports"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("name", response.data)
        self.music.refresh_from_db()
        self.assertEqual(self.music.name, "Music")

    def test_duplicate_name_rejected_case_insensitive(self):
        self.authenticate(self.admin)
        response = self.client.patch(
            category_update_url(self.music.id), {"name": "SPORTS"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("name", response.data)
        self.music.refresh_from_db()
        self.assertEqual(self.music.name, "Music")

    def test_renaming_to_own_name_is_allowed(self):
        self.authenticate(self.admin)
        response = self.client.patch(
            category_update_url(self.music.id), {"name": "Music"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.music.refresh_from_db()
        self.assertEqual(self.music.name, "Music")

    def test_renaming_to_own_name_different_case_is_allowed(self):
        self.authenticate(self.admin)
        response = self.client.patch(
            category_update_url(self.music.id), {"name": "MUSIC"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.music.refresh_from_db()
        self.assertEqual(self.music.name, "MUSIC")

    def test_missing_name_on_put_rejected(self):
        self.authenticate(self.admin)
        response = self.client.put(
            category_update_url(self.music.id), {"is_active": True}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("name", response.data)

    def test_blank_name_rejected(self):
        self.authenticate(self.admin)
        response = self.client.patch(
            category_update_url(self.music.id), {"name": "   "}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("name", response.data)
        self.music.refresh_from_db()
        self.assertEqual(self.music.name, "Music")

    def test_invalid_is_active_rejected(self):
        self.authenticate(self.admin)
        response = self.client.patch(
            category_update_url(self.music.id),
            {"is_active": "maybe"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("is_active", response.data)

    def test_category_id_cannot_be_changed(self):
        self.authenticate(self.admin)
        original_id = self.music.id
        response = self.client.patch(
            category_update_url(self.music.id),
            {"id": 99999, "name": "Renamed"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], original_id)
        self.assertFalse(Category.objects.filter(id=99999).exists())
        self.assertTrue(Category.objects.filter(id=original_id, name="Renamed").exists())

    def test_unknown_category_returns_404(self):
        self.authenticate(self.admin)
        response = self.client.patch(
            category_update_url(99999), {"name": "Ghost"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(Category.objects.filter(name="Ghost").exists())

    def test_get_is_not_allowed_on_update_endpoint(self):
        self.authenticate(self.admin)
        response = self.client.get(category_update_url(self.music.id))
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_delete_is_not_allowed_on_update_endpoint(self):
        self.authenticate(self.admin)
        response = self.client.delete(category_update_url(self.music.id))
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertTrue(Category.objects.filter(id=self.music.id).exists())


def category_delete_url(category_id):
    return f"/api/events/categories/{category_id}/delete/"


class CategorySoftDeleteAPITests(APITestCase):
    """Tests for the ADMIN-only category soft delete API."""

    def setUp(self):
        self.music = Category.objects.create(name="Music")
        self.customer = User.objects.create_user(
            email="customer@example.com", password=VALID_PASSWORD, name="Customer"
        )
        self.organizer = User.objects.create_user(
            email="organizer@example.com",
            password=VALID_PASSWORD,
            name="Organizer",
            role="ORGANIZER",
        )
        self.admin = User.objects.create_superuser(
            email="admin@example.com", password=VALID_PASSWORD, name="Admin"
        )

    def authenticate(self, user):
        response = self.client.post(
            "/api/accounts/login/",
            {"email": user.email, "password": VALID_PASSWORD},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {response.data['access']}"
        )

    def test_admin_can_soft_delete_category(self):
        self.authenticate(self.admin)
        response = self.client.delete(category_delete_url(self.music.id))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        # Record must still exist (soft delete), just deactivated.
        self.music.refresh_from_db()
        self.assertFalse(self.music.is_active)
        self.assertTrue(Category.objects.filter(id=self.music.id).exists())
        self.assertEqual(Category.objects.count(), 1)

    def test_customer_is_denied(self):
        self.authenticate(self.customer)
        response = self.client.delete(category_delete_url(self.music.id))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.music.refresh_from_db()
        self.assertTrue(self.music.is_active)

    def test_organizer_is_denied(self):
        self.authenticate(self.organizer)
        response = self.client.delete(category_delete_url(self.music.id))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.music.refresh_from_db()
        self.assertTrue(self.music.is_active)

    def test_anonymous_is_denied(self):
        response = self.client.delete(category_delete_url(self.music.id))
        self.assertIn(
            response.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )
        self.music.refresh_from_db()
        self.assertTrue(self.music.is_active)

    def test_deleted_category_disappears_from_customer_list(self):
        self.authenticate(self.admin)
        self.client.delete(category_delete_url(self.music.id))
        self.authenticate(self.customer)
        response = self.client.get(CATEGORY_LIST_URL)
        names = [item["name"] for item in response.data]
        self.assertNotIn("Music", names)
        self.assertEqual(names, [])

    def test_deleted_category_disappears_from_organizer_list(self):
        self.authenticate(self.admin)
        self.client.delete(category_delete_url(self.music.id))
        self.authenticate(self.organizer)
        response = self.client.get(CATEGORY_LIST_URL)
        names = [item["name"] for item in response.data]
        self.assertNotIn("Music", names)

    def test_admin_still_sees_deactivated_category_in_admin_list(self):
        self.authenticate(self.admin)
        self.client.delete(category_delete_url(self.music.id))
        response = self.client.get(CATEGORY_LIST_URL)
        names = [item["name"] for item in response.data]
        self.assertIn("Music", names)
        entry = next(item for item in response.data if item["name"] == "Music")
        self.assertFalse(entry["is_active"])

    def test_unknown_category_returns_404(self):
        self.authenticate(self.admin)
        response = self.client.delete(category_delete_url(99999))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(Category.objects.count(), 1)

    def test_soft_delete_is_idempotent(self):
        self.authenticate(self.admin)
        first = self.client.delete(category_delete_url(self.music.id))
        second = self.client.delete(category_delete_url(self.music.id))
        self.assertEqual(first.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(second.status_code, status.HTTP_204_NO_CONTENT)
        self.music.refresh_from_db()
        self.assertFalse(self.music.is_active)

    def test_deactivated_category_can_be_reactivated_via_update(self):
        self.authenticate(self.admin)
        self.client.delete(category_delete_url(self.music.id))
        response = self.client.patch(
            category_update_url(self.music.id), {"is_active": True}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.music.refresh_from_db()
        self.assertTrue(self.music.is_active)

    def test_get_is_not_allowed_on_delete_endpoint(self):
        self.authenticate(self.admin)
        response = self.client.get(category_delete_url(self.music.id))
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_post_is_not_allowed_on_delete_endpoint(self):
        self.authenticate(self.admin)
        response = self.client.post(category_delete_url(self.music.id), format="json")
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.music.refresh_from_db()
        self.assertTrue(self.music.is_active)


def venue_list_url():
    return "/api/events/venues/"


class VenueListAPITests(APITestCase):
    """Tests for the read-only venue list API (Phase 5 Step 2)."""

    def setUp(self):
        self.organizer = User.objects.create_user(
            email="organizer@example.com",
            password=VALID_PASSWORD,
            name="Organizer",
            role="ORGANIZER",
        )
        self.other_organizer = User.objects.create_user(
            email="other-organizer@example.com",
            password=VALID_PASSWORD,
            name="Other Organizer",
            role="ORGANIZER",
        )
        self.customer = User.objects.create_user(
            email="customer@example.com", password=VALID_PASSWORD, name="Customer"
        )
        self.admin = User.objects.create_superuser(
            email="admin@example.com", password=VALID_PASSWORD, name="Admin"
        )
        self.own_active = Venue.objects.create(
            organizer=self.organizer,
            name="Grand Hall",
            description="A grand hall",
            address="1 MG Road",
            city="Pune",
            state="Maharashtra",
            pincode="411001",
            capacity=500,
            venue_type=Venue.VenueType.INDOOR,
        )
        self.own_inactive = Venue.objects.create(
            organizer=self.organizer,
            name="Old Hall",
            address="2 FC Road",
            city="Pune",
            state="Maharashtra",
            pincode="411002",
            capacity=100,
            is_active=False,
        )
        self.other_active = Venue.objects.create(
            organizer=self.other_organizer,
            name="Other Arena",
            address="3 Station Road",
            city="Mumbai",
            state="Maharashtra",
            pincode="400001",
            capacity=1000,
            venue_type=Venue.VenueType.OUTDOOR,
        )

    def authenticate(self, user):
        response = self.client.post(
            "/api/accounts/login/",
            {"email": user.email, "password": VALID_PASSWORD},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {response.data['access']}"
        )

    def test_anonymous_user_rejected(self):
        response = self.client.get(venue_list_url())
        self.assertIn(
            response.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )

    def test_customer_sees_only_active_venues(self):
        self.authenticate(self.customer)
        response = self.client.get(venue_list_url())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [item["name"] for item in response.data]
        self.assertEqual(names, ["Grand Hall", "Other Arena"])
        self.assertNotIn("Old Hall", names)

    def test_organizer_sees_own_active_venues(self):
        self.authenticate(self.organizer)
        response = self.client.get(venue_list_url())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [item["name"] for item in response.data]
        self.assertIn("Grand Hall", names)
        self.assertNotIn("Old Hall", names)

    def test_admin_sees_all_venues_including_inactive(self):
        self.authenticate(self.admin)
        response = self.client.get(venue_list_url())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [item["name"] for item in response.data]
        self.assertEqual(names, ["Grand Hall", "Old Hall", "Other Arena"])

    def test_response_contains_expected_fields(self):
        self.authenticate(self.customer)
        response = self.client.get(venue_list_url())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        expected = {
            "id",
            "name",
            "description",
            "address",
            "city",
            "state",
            "pincode",
            "capacity",
            "venue_type",
            "organizer",
        }
        for item in response.data:
            self.assertEqual(set(item.keys()), expected)

    def test_response_includes_organizer_id(self):
        self.authenticate(self.customer)
        response = self.client.get(venue_list_url())
        entry = next(
            item for item in response.data if item["name"] == "Grand Hall"
        )
        self.assertEqual(entry["organizer"], self.organizer.id)
        self.assertEqual(entry["capacity"], 500)
        self.assertEqual(entry["venue_type"], "INDOOR")

    def test_results_are_ordered_by_name(self):
        self.authenticate(self.admin)
        response = self.client.get(venue_list_url())
        names = [item["name"] for item in response.data]
        self.assertEqual(names, sorted(names))

    def test_create_is_not_allowed(self):
        self.authenticate(self.admin)
        response = self.client.post(
            venue_list_url(),
            {"name": "Sneaky Hall", "address": "x", "city": "y", "state": "z"},
            format="json",
        )
        self.assertEqual(
            response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED
        )
        self.assertFalse(Venue.objects.filter(name="Sneaky Hall").exists())

    def test_update_is_not_allowed(self):
        self.authenticate(self.admin)
        response = self.client.patch(
            venue_list_url(), {"name": "Changed"}, format="json"
        )
        self.assertEqual(
            response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED
        )
        # No per-object route exists at all -> 404.
        detail_response = self.client.patch(
            f"{venue_list_url()}{self.own_active.id}/",
            {"name": "Changed"},
            format="json",
        )
        self.assertEqual(detail_response.status_code, status.HTTP_404_NOT_FOUND)
        self.own_active.refresh_from_db()
        self.assertEqual(self.own_active.name, "Grand Hall")

    def test_delete_is_not_allowed(self):
        self.authenticate(self.admin)
        response = self.client.delete(venue_list_url())
        self.assertEqual(
            response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED
        )
        detail_response = self.client.delete(
            f"{venue_list_url()}{self.own_active.id}/"
        )
        self.assertEqual(detail_response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(
            Venue.objects.filter(id=self.own_active.id).exists()
        )
    def test_delete_is_not_allowed(self):
        self.authenticate(self.admin)
        response = self.client.delete(venue_list_url())
        self.assertEqual(
            response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED
        )
        detail_response = self.client.delete(
            f"{venue_list_url()}{self.own_active.id}/"
        )
        self.assertEqual(detail_response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(
            Venue.objects.filter(id=self.own_active.id).exists()
        )


def venue_create_url():
    return "/api/events/venues/create/"


class VenueCreateAPITests(APITestCase):
    """Tests for the ORGANIZER-only venue creation API (Phase 5 Step 3)."""

    VALID_VENUE_PAYLOAD = {
        "name": "Grand Hall",
        "description": "A grand hall",
        "address": "1 MG Road",
        "city": "Pune",
        "state": "Maharashtra",
        "pincode": "411001",
        "capacity": 500,
        "venue_type": "INDOOR",
    }

    def setUp(self):
        self.organizer = User.objects.create_user(
            HTTP_AUTHORIZATION=f"Bearer {response.data['access']}"
        )

    def test_organizer_can_create_venue(self):
        self.authenticate(self.organizer)
        response = self.client.post(
            venue_create_url(), self.VALID_VENUE_PAYLOAD, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "Grand Hall")
        self.assertEqual(response.data["city"], "Pune")
        self.assertEqual(response.data["organizer"], self.organizer.id)
        self.assertTrue(Venue.objects.filter(name="Grand Hall").exists())

    def test_organizer_set_automatically_from_request_user(self):
        self.authenticate(self.organizer)
        payload = self.VALID_VENUE_PAYLOAD.copy()
        payload["organizer"] = 999999
        response = self.client.post(
            venue_create_url(), payload, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        venue = Venue.objects.get(name="Grand Hall")
        self.assertEqual(venue.organizer_id, self.organizer.id)

    def test_description_and_venue_type_optional(self):
        self.authenticate(self.organizer)
        payload = {
            "name": "Simple Hall",
            "address": "10 Lane",
            "city": "Mumbai",
            "state": "Maharashtra",
            "pincode": "400001",
            "capacity": 50,
        }
        response = self.client.post(
            venue_create_url(), payload, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        venue = Venue.objects.get(name="Simple Hall")
        self.assertEqual(venue.description, "")
        self.assertEqual(venue.venue_type, "")
        self.assertTrue(venue.is_active)

    def test_customer_cannot_create_venue(self):
        self.authenticate(self.customer)
        response = self.client.post(
            venue_create_url(), self.VALID_VENUE_PAYLOAD, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(Venue.objects.filter(name="Grand Hall").exists())

    def test_admin_cannot_create_venue(self):
        self.authenticate(self.admin)
        response = self.client.post(
            venue_create_url(), self.VALID_VENUE_PAYLOAD, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(Venue.objects.filter(name="Grand Hall").exists())

        self.assertFalse(Venue.objects.filter(name="Grand Hall").exists())

    def test_name_required(self):
        self.authenticate(self.organizer)
        payload = self.VALID_VENUE_PAYLOAD.copy()
        del payload["name"]
        response = self.client.post(
            venue_create_url(), payload, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("name", response.data)

    def test_address_required(self):
        self.authenticate(self.organizer)
        payload = self.VALID_VENUE_PAYLOAD.copy()
        del payload["address"]
        response = self.client.post(
            venue_create_url(), payload, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("address", response.data)

    def test_city_required(self):
        self.authenticate(self.organizer)
        payload = self.VALID_VENUE_PAYLOAD.copy()
        del payload["city"]
        response = self.client.post(
            venue_create_url(), payload, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("city", response.data)

    def test_state_required(self):
        self.authenticate(self.organizer)
        payload = self.VALID_VENUE_PAYLOAD.copy()
        del payload["state"]
        response = self.client.post(
            venue_create_url(), payload, format="json"
        self.assertIn("capacity", response.data)

    def test_blank_name_rejected(self):
        self.authenticate(self.organizer)
        payload = self.VALID_VENUE_PAYLOAD.copy()
        payload["name"] = "   "
        response = self.client.post(
            venue_create_url(), payload, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("name", response.data)

    def test_blank_address_rejected(self):
        self.authenticate(self.organizer)
        payload = self.VALID_VENUE_PAYLOAD.copy()
        payload["address"] = "   "
        response = self.client.post(
            venue_create_url(), payload, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("address", response.data)

    def test_blank_city_rejected(self):
        self.authenticate(self.organizer)
        payload = self.VALID_VENUE_PAYLOAD.copy()
        payload["city"] = "   "
        response = self.client.post(
            venue_create_url(), payload, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("city", response.data)

    def test_blank_state_rejected(self):
        self.authenticate(self.organizer)
        payload = self.VALID_VENUE_PAYLOAD.copy()
        payload["state"] = "   "
        response = self.client.post(
            venue_create_url(), payload, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("state", response.data)

    def test_invalid_pincode_too_short(self):
        self.authenticate(self.organizer)
        payload = self.VALID_VENUE_PAYLOAD.copy()
        payload["pincode"] = "12345"
        response = self.client.post(
            venue_create_url(), payload, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("pincode", response.data)

    def test_invalid_pincode_starts_with_zero(self):
        self.authenticate(self.organizer)
        payload = self.VALID_VENUE_PAYLOAD.copy()
        payload["pincode"] = "012345"
        response = self.client.post(
            venue_create_url(), payload, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("pincode", response.data)

    def test_invalid_pincode_non_numeric(self):
        self.authenticate(self.organizer)
        payload = self.VALID_VENUE_PAYLOAD.copy()
        payload["pincode"] = "abcdef"
        response = self.client.post(
            venue_create_url(), payload, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("pincode", response.data)

    def test_zero_capacity_rejected(self):
        self.authenticate(self.organizer)
        payload = self.VALID_VENUE_PAYLOAD.copy()
        payload["capacity"] = 0
        response = self.client.post(
            venue_create_url(), payload, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("capacity", response.data)

    def test_negative_capacity_rejected(self):
        self.authenticate(self.organizer)
        payload = self.VALID_VENUE_PAYLOAD.copy()
        payload["capacity"] = -10
        response = self.client.post(
            venue_create_url(), payload, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("capacity", response.data)

    def test_invalid_venue_type_rejected(self):
        self.authenticate(self.organizer)
        payload = self.VALID_VENUE_PAYLOAD.copy()
        payload["venue_type"] = "SPACESHIP"
        response = self.client.post(
            venue_create_url(), payload, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("venue_type", response.data)
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("state", response.data)

    def test_pincode_required(self):
        self.authenticate(self.organizer)
        payload = self.VALID_VENUE_PAYLOAD.copy()
        del payload["pincode"]
        response = self.client.post(
            venue_create_url(), payload, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("pincode", response.data)

    def test_capacity_required(self):
        self.authenticate(self.organizer)
        payload = self.VALID_VENUE_PAYLOAD.copy()
        del payload["capacity"]
        response = self.client.post(
            venue_create_url(), payload, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("capacity", response.data)
    def test_anonymous_cannot_create_venue(self):
        response = self.client.post(
            venue_create_url(), self.VALID_VENUE_PAYLOAD, format="json"
        )
        self.assertIn(
            response.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )
        self.assertFalse(Venue.objects.filter(name="Grand Hall").exists())

    def test_anonymous_cannot_create_venue(self):
        response = self.client.post(
            venue_create_url(), self.VALID_VENUE_PAYLOAD, format="json"
        )
        self.assertIn(
            response.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )
        self.assertFalse(Venue.objects.filter(name="Grand Hall").exists())
