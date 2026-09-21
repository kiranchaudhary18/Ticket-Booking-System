from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    ChangePasswordView,
    CustomerProfileView,
    LoginView,
    LogoutView,
    MeView,
    OrganizerProfileView,
    RegisterView,
    AdminUserListView,
    AdminUserDetailView,
)

app_name = "accounts"

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("change-password/", ChangePasswordView.as_view(), name="change_password"),
    path("me/", MeView.as_view(), name="me"),
    path("customer-profile/", CustomerProfileView.as_view(), name="customer_profile"),
    path(
        "organizer-profile/",
        OrganizerProfileView.as_view(),
        name="organizer_profile",
    ),
    
    # Admin User Management
    path("admin/users/", AdminUserListView.as_view(), name="admin_user_list"),
    path("admin/users/<int:pk>/", AdminUserDetailView.as_view(), name="admin_user_detail"),
]