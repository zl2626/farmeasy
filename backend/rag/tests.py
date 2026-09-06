import io
from unittest.mock import patch

import fitz
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase, TestCase
from PIL import Image
from rest_framework.test import APIClient

from rag.upload_validation import UploadValidationError, validate_image, validate_pdf
from rag.rag_pipeline import determine_source_status
from rag.web_search import _is_allowed_url


class UploadValidationTests(SimpleTestCase):
    def test_pdf_rejects_file_over_ten_megabytes(self):
        upload = SimpleUploadedFile("large.pdf", b"%PDF-1.4\n" + b"0" * (10 * 1024 * 1024))

        with self.assertRaises(UploadValidationError) as raised:
            validate_pdf(upload)

        self.assertEqual(raised.exception.code, "file_too_large")

    def test_pdf_rejects_spoofed_extension(self):
        upload = SimpleUploadedFile("report.pdf", b"this is not a PDF", content_type="application/pdf")

        with self.assertRaises(UploadValidationError) as raised:
            validate_pdf(upload)

        self.assertEqual(raised.exception.code, "invalid_pdf")

    def test_image_rejects_more_than_twenty_five_megapixels(self):
        image = Image.new("1", (5001, 5000))
        buffer = io.BytesIO()
        image.save(buffer, format="PNG")
        upload = SimpleUploadedFile("field.png", buffer.getvalue(), content_type="image/png")

        with self.assertRaises(UploadValidationError) as raised:
            validate_image(upload)

        self.assertEqual(raised.exception.code, "image_too_large")


class RagSourceStatusTests(SimpleTestCase):
    def test_crop_keyword_match_is_reported_as_local_source_not_high_confidence(self):
        status_value = determine_source_status(
            retrieved=[], crop_context_found=True, web_supplemented=False
        )

        self.assertEqual(status_value, "LOCAL_SOURCES")

    def test_no_sources_is_reported_as_insufficient(self):
        self.assertEqual(
            determine_source_status([], False, False),
            "INSUFFICIENT_SOURCES",
        )

    def test_web_allowlist_rejects_plain_http_and_suffix_attack(self):
        self.assertTrue(_is_allowed_url("https://www.moa.gov.cn/ztzl/"))
        self.assertFalse(_is_allowed_url("http://www.moa.gov.cn/ztzl/"))
        self.assertFalse(_is_allowed_url("https://moa.gov.cn.attacker.example/page"))


class UploadApiErrorTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        user = User.objects.create_user("tester", password="Testing-2026!")
        self.client.force_authenticate(user)

    @patch("rag.views._get_vector_store")
    @patch("rag.views._summarize_text", side_effect=RuntimeError("provider-secret-detail"))
    def test_pdf_ai_failure_returns_stable_json_without_internal_detail(self, summarize, vector_store):
        document = fitz.open()
        page = document.new_page()
        page.insert_text((72, 72), "Agriculture crop soil irrigation wheat farming guidance")
        upload = SimpleUploadedFile(
            "crop-guide.pdf",
            document.tobytes(),
            content_type="application/pdf",
        )
        document.close()
        vector_store.return_value.search.return_value = [
            {"score": 0.8, "text": "crop", "metadata": {"source": "test"}}
        ]

        response = self.client.post(
            "/api/chat/analyze-pdf/",
            {"file": upload, "prompt": "总结种植要点"},
            format="multipart",
        )

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()["code"], "ai_service_unavailable")
        self.assertNotIn("provider-secret-detail", response.content.decode("utf-8"))
