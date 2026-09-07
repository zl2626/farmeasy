from django.contrib.auth.models import User
from django.test import TestCase, TransactionTestCase
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from rest_framework.test import APIClient

from .models import Crop, Doubt, Feedback


class EducationRegressionTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="crop-admin", is_staff=True)
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.crop = Crop.objects.create(
            crop_id="audit-crop", name="TestCrop", season="spring", soil=["loam"],
            duration="90 days", sowing_time="spring", climate="warm", rainfall="500 mm",
            fertilizer="compost", irrigation="weekly", yield_info="100", steps=[],
            common_mistakes=[], image="crops/test.jpg",
        )

    def test_existing_crop_details_return_model_data(self):
        response = self.client.get("/api/education/crops/scrape/TestCrop/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["soil"], ["loam"])
        self.assertEqual(response.data["irrigation"], "weekly")

    def test_edit_preserves_existing_image_url(self):
        payload = self.client.get("/api/education/admin/crops/").data[0]
        payload["name"] = "RenamedCrop"
        response = self.client.put(f"/api/education/admin/crops/{self.crop.pk}/", payload, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.crop.refresh_from_db()
        self.assertEqual(self.crop.name, "RenamedCrop")
        self.assertEqual(self.crop.image.name, "crops/test.jpg")

    def test_arbitrary_image_url_is_not_accepted(self):
        response = self.client.patch(f"/api/education/admin/crops/{self.crop.pk}/", {
            "image": "https://example.org/unrelated.jpg",
        }, format="json")
        self.assertEqual(response.status_code, 400)

    def test_image_can_be_cleared(self):
        response = self.client.patch(f"/api/education/admin/crops/{self.crop.pk}/", {"image": None}, format="json")
        self.assertEqual(response.status_code, 200)
        self.crop.refresh_from_db()
        self.assertFalse(self.crop.image)

    def test_migrated_database_supports_doubts_and_feedback(self):
        response = self.client.post("/api/education/doubts/create/", {
            "title": "Irrigation", "description": "How much water?",
        }, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(Doubt.objects.filter(farmer=self.user).exists())
        response = self.client.post("/api/education/feedback/create/", {
            "name": "Test", "email": "test@example.com", "subject": "Feedback", "message": "Message",
        }, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Feedback.objects.count(), 1)


class LegacyMigrationTests(TransactionTestCase):
    def test_existing_tables_are_adopted_without_losing_data(self):
        user = User.objects.create_user(username="legacy-user")
        doubt = Doubt.objects.create(farmer=user, title="Saved question", description="Keep me")
        feedback = Feedback.objects.create(name="Saved", email="test@example.com", subject="Saved", message="Keep me")
        try:
            MigrationExecutor(connection).migrate([("education", "0004_remove_crop_images_crop_image")])
            MigrationExecutor(connection).migrate([("education", "0005_feedback_doubt")])
            self.assertEqual(Doubt.objects.get(pk=doubt.pk).description, "Keep me")
            self.assertEqual(Feedback.objects.get(pk=feedback.pk).message, "Keep me")
        finally:
            MigrationExecutor(connection).migrate([("education", "0005_feedback_doubt")])
