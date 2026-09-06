from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework.test import APIClient


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class PasswordRecoveryTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="existing_farmer",
            email="farmer@example.cn",
            password="BeforeReset-2026!",
        )

    def test_forgot_password_does_not_reveal_whether_email_exists(self):
        known = self.client.post(
            "/api/auth/forgot-password/",
            {"email": "farmer@example.cn"},
            format="json",
        )
        unknown = self.client.post(
            "/api/auth/forgot-password/",
            {"email": "missing@example.cn"},
            format="json",
        )

        self.assertEqual(known.status_code, 200)
        self.assertEqual(unknown.status_code, 200)
        self.assertEqual(known.json(), unknown.json())

    def test_invalid_reset_token_does_not_change_password(self):
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))

        response = self.client.post(
            "/api/auth/reset-password/",
            {"uid": uid, "token": "invalid-token", "new_password": "AfterReset-2026!"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("BeforeReset-2026!"))

    def test_reset_rejects_password_disallowed_by_django_validators(self):
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        from django.contrib.auth.tokens import default_token_generator

        token = default_token_generator.make_token(self.user)
        response = self.client.post(
            "/api/auth/reset-password/",
            {"uid": uid, "token": token, "new_password": "12345678"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("BeforeReset-2026!"))

# Create your tests here.
