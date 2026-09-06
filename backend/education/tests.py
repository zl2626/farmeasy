from django.core.management import call_command
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase

from .models import Crop, Scheme
from .serializers import DoubtSerializer


class SeedAgricultureDataTests(TestCase):
    def test_seed_command_populates_crops_and_schemes_idempotently(self):
        call_command("seed_agriculture_data", verbosity=0)

        first_counts = (Crop.objects.count(), Scheme.objects.count())
        self.assertGreaterEqual(first_counts[0], 20)
        self.assertGreaterEqual(first_counts[1], 20)
        self.assertFalse(Crop.objects.filter(source="").exists())
        self.assertFalse(Scheme.objects.filter(source="").exists())

        call_command("seed_agriculture_data", verbosity=0)

        self.assertEqual(
            (Crop.objects.count(), Scheme.objects.count()),
            first_counts,
        )
        wheat = Crop.objects.get(name="小麦")
        self.assertIn("黄淮海", wheat.description)
        self.assertEqual(wheat.image_status, Crop.ImageStatus.UNVERIFIED)


class MarketSnapshotTests(TestCase):
    def test_market_endpoint_declares_non_realtime_snapshot_metadata(self):
        response = self.client.get("/api/education/market-prices/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn(payload["meta"]["data_mode"], {"historical_snapshot", "demo_snapshot"})
        self.assertTrue(payload["meta"]["snapshot_date"])
        self.assertTrue(payload["meta"]["source"])
        self.assertFalse(payload["meta"]["is_realtime"])
        self.assertTrue(payload["records"])
        self.assertNotIn("Gujarat", {row.get("province") for row in payload["records"]})

    def test_market_endpoint_filters_by_chinese_region_and_commodity(self):
        response = self.client.get(
            "/api/education/market-prices/",
            {"province": "山东省", "city": "潍坊市", "commodity": "番茄"},
        )

        self.assertEqual(response.status_code, 200)
        records = response.json()["records"]
        self.assertTrue(records)
        self.assertTrue(
            all(
                row["province"] == "山东省"
                and row["city"] == "潍坊市"
                and row["commodity"] == "番茄"
                for row in records
            )
        )


class DoubtUploadValidationTests(TestCase):
    def test_doubt_serializer_rejects_fake_image_content(self):
        serializer = DoubtSerializer(
            data={
                "title": "叶片发黄",
                "description": "请帮助判断原因",
                "image": SimpleUploadedFile(
                    "field.jpg",
                    b"not-a-real-image",
                    content_type="image/jpeg",
                ),
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("image", serializer.errors)

# Create your tests here.
