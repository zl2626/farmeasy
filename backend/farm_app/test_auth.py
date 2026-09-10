from unittest.mock import patch

from django.contrib.auth.models import User
from django.db import IntegrityError
from rest_framework.test import APITestCase

from .serializers import RegisterSerializer


class AuthRegressionTests(APITestCase):
    payload = {
        'username': 'auth-regression', 'email': 'auth@example.com',
        'password': 'SafePass123!', 'mobile_number': '13800138000',
    }

    def test_register_login_profile_refresh(self):
        response = self.client.post('/api/auth/register/', self.payload, format='json')
        self.assertEqual(response.status_code, 201)
        login = self.client.post('/api/auth/login/', {
            'username': self.payload['username'], 'password': self.payload['password'],
        }, format='json')
        self.assertEqual(login.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
        profile = self.client.get('/api/education/profile/')
        self.assertEqual(profile.status_code, 200)
        self.assertEqual(profile.data['username'], self.payload['username'])
        self.client.credentials()
        refresh = self.client.post('/api/auth/refresh/', {'refresh': login.data['refresh']}, format='json')
        self.assertEqual(refresh.status_code, 200)

    def test_profile_failure_does_not_leave_an_unusable_account(self):
        serializer = RegisterSerializer(data=self.payload)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        with patch('farm_app.serializers.Profile.objects.create', side_effect=IntegrityError):
            with self.assertRaises(IntegrityError):
                serializer.save()
        self.assertFalse(User.objects.filter(username=self.payload['username']).exists())

    def test_wrong_password_and_duplicate_registration(self):
        self.client.post('/api/auth/register/', self.payload, format='json')
        duplicate = self.client.post('/api/auth/register/', self.payload, format='json')
        self.assertEqual(duplicate.status_code, 400)
        self.assertIn('mobile_number', duplicate.data)
        bad_login = self.client.post('/api/auth/login/', {
            'username': self.payload['username'], 'password': 'wrong-password',
        }, format='json')
        self.assertEqual(bad_login.status_code, 401)
