from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from .models import ChatMessage, ChatSession


class ChatHistoryTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="chat-test")
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.session = ChatSession.objects.create(user=self.user, session_id="old-chat", title="Old chat")

    def test_new_message_moves_session_to_top(self):
        ChatSession.objects.filter(pk=self.session.pk).update(updated_at=timezone.now() - timedelta(days=1))
        ChatSession.objects.create(user=self.user, session_id="new-chat", title="Newer chat")
        with patch("rag.views.get_answer", return_value=("Answer", [], "LOW", False)):
            response = self.client.post("/api/chat/", {
                "question": "Water needs?", "session_id": "old-chat",
            }, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.client.get("/api/chat/sessions/").data[0]["session_id"], "old-chat")

    def test_attachment_pair_updates_session_time(self):
        from .views import _save_messages
        before = self.session.updated_at
        _save_messages(self.session, "upload", "analysis")
        self.session.refresh_from_db()
        self.assertGreater(self.session.updated_at, before)

    def test_malformed_attachment_prefix_remains_plain_text(self):
        for text in ["[PDF \u6587\u4ef6\uff1abroken", "[\u56fe\u7247\u4e0a\u4f20\uff1abroken"]:
            with self.subTest(text=text):
                self.session.messages.all().delete()
                ChatMessage.objects.create(session=self.session, role="user", input_text=text)
                response = self.client.get("/api/chat/sessions/old-chat/")
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.data["messages"][0]["content"], text)

    def test_real_attachment_history_keeps_metadata(self):
        ChatMessage.objects.create(session=self.session, role="user",
            input_text="[\u56fe\u7247\u4e0a\u4f20\uff1aleaf.png]\nAnalyze", attachment_url="/media/leaf.png")
        message = self.client.get("/api/chat/sessions/old-chat/").data["messages"][0]
        self.assertEqual(message["imageName"], "leaf.png")
        self.assertEqual(message["content"], "Analyze")
        self.assertEqual(message["imagePreviewUrl"], "/media/leaf.png")
