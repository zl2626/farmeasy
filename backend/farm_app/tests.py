from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth.models import User
from django.contrib.auth.tokens import default_token_generator
from django.test import TestCase, override_settings
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework.test import APIClient


class PasswordResetTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="reset-test", email="reset@example.com", password="OriginalPass123!"
        )
        self.client = APIClient()
        self.uid = urlsafe_base64_encode(force_bytes(self.user.pk))

    def reset(self, token, password="ReplacementPass123!"):
        return self.client.post("/api/auth/reset-password/", {
            "uid": self.uid, "token": token, "new_password": password,
        }, format="json")

    def test_invalid_token_cannot_change_password(self):
        self.assertEqual(self.reset("invalid-token").status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("OriginalPass123!"))

    @override_settings(PASSWORD_RESET_TIMEOUT=60)
    def test_expired_token_is_rejected(self):
        earlier = default_token_generator._now() - timedelta(minutes=2)
        with patch.object(default_token_generator, "_now", return_value=earlier):
            token = default_token_generator.make_token(self.user)
        self.assertEqual(self.reset(token).status_code, 400)

    def test_valid_token_works_only_once(self):
        token = default_token_generator.make_token(self.user)
        self.assertEqual(self.reset(token).status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("ReplacementPass123!"))
        self.assertEqual(self.reset(token, "AnotherPass123!").status_code, 400)

    def test_short_password_is_rejected(self):
        self.assertEqual(self.reset(default_token_generator.make_token(self.user), "a").status_code, 400)

    def test_non_string_fields_are_rejected(self):
        self.assertEqual(self.reset(["invalid"]).status_code, 400)

    def test_reset_does_not_print_credentials(self):
        with patch("builtins.print") as output:
            self.reset(default_token_generator.make_token(self.user))
        self.assertFalse(output.called)
