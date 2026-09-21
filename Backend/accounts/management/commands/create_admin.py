"""Management command: create the initial ADMIN (superuser) account.

Usage:
    python manage.py create_admin                          # interactive prompts
    python manage.py create_admin --email admin@example.com --password-stdin

Prompts for email, password and password confirmation. Credentials are never
hardcoded; they come from the keyboard (interactive) or are read from stdin
(--password-stdin, one value per line) at runtime.
"""
import getpass
import sys

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.core.validators import validate_email as validate_email_format
from django.db import transaction

from accounts.models import User


class Command(BaseCommand):
    help = "Create the initial ADMIN (superuser) account securely."

    def add_arguments(self, parser):
        parser.add_argument(
            "--email",
            help="Admin email address (skips the interactive email prompt).",
        )
        parser.add_argument(
            "--password-stdin",
            action="store_true",
            help="Read the password and its confirmation from stdin "
            "(one value per line) instead of prompting interactively.",
        )

    def handle(self, *args, **options):
        email = options.get("email") or self.prompt_email()
        if options["password_stdin"]:
            password = self.read_password_stdin()
        else:
            password = self.prompt_password()

        with transaction.atomic():
            if User.objects.filter(email__iexact=email).exists():
                raise CommandError(f"A user with email '{email}' already exists.")

            # create_superuser is the only sanctioned way to create an ADMIN:
            # it sets is_staff/is_superuser and role=ADMIN. Signup can never do this.
            user = User.objects.create_superuser(
                email=email,
                password=password,
                name="Admin",
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Admin account created for {user.email} "
                f"(id={user.id}, role={user.role})."
            )
        )
        self.stdout.write(
            self.style.SUCCESS("You can now log in at http://127.0.0.1:8000/admin/")
        )

    def read_password_stdin(self):
        """Read password + confirmation from stdin (one per line)."""
        password = sys.stdin.readline().rstrip("\n").rstrip("\r")
        confirmation = sys.stdin.readline().rstrip("\n").rstrip("\r")
        if not password:
            raise CommandError("No password provided on stdin.")
        if password != confirmation:
            raise CommandError("Passwords do not match.")
        try:
            validate_password(password)
        except ValidationError as exc:
            for message in exc.messages:
                self.stderr.write(f"- {message}")
            raise CommandError("Password did not pass validation.")
        return password

    def prompt_email(self):
        """Read and validate the admin email address interactively."""
        while True:
            try:
                raw = input("Admin email: ").strip().lower()
            except EOFError:
                raise CommandError("No input received. Aborting.")
            if not raw:
                self.stderr.write("Email cannot be empty.")
                continue
            try:
                validate_email_format(raw)
            except ValidationError:
                self.stderr.write(f"'{raw}' is not a valid email address.")
                continue
            return raw

    def prompt_password(self):
        """Read and validate the admin password interactively (hidden input)."""
        while True:
            try:
                password = getpass.getpass("Admin password: ")
                confirmation = getpass.getpass("Confirm password: ")
            except (KeyboardInterrupt, EOFError):
                raise CommandError("No input received. Aborting.")
            if password != confirmation:
                self.stderr.write("Passwords do not match, try again.")
                continue
            try:
                validate_password(password)
            except ValidationError as exc:
                for message in exc.messages:
                    self.stderr.write(f"- {message}")
                continue
            return password