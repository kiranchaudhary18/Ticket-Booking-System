from django.apps import AppConfig


class AccountsConfig(AppConfig):
    name = "accounts"

    def ready(self):
        # Register the CustomerProfile auto-creation signal.
        from . import signals  # noqa: F401
