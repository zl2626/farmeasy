from datetime import date

from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from .decision import build_farm_tasks, diagnose_pest, match_subsidies
from .models import AgriProduct, AgriStore, FarmProfile, FarmTask


class ClosedLoopFeatureTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="closed-loop", email="closed@example.com", password="SafePass123!"
        )
        self.client.force_authenticate(self.user)

    def test_new_user_can_read_empty_farm_profile(self):
        response = self.client.get("/api/farm/profile/")
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data)

    def test_profile_creates_calendar_tasks(self):
        response = self.client.post("/api/farm/profile/", {
            "province": "湖北省", "city": "武汉市", "main_crop": "rice",
            "growth_stage": "seedling", "planting_area": "10",
        }, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(FarmTask.objects.filter(profile__user=self.user).count(), 4)

    def test_task_calendar_requires_profile(self):
        response = self.client.get("/api/farm/tasks/")
        self.assertEqual(response.status_code, 400)
        self.assertIn("请先完善农事档案", response.data["error"])

    def test_products_are_scoped_to_province_and_city(self):
        store = AgriStore.objects.create(province="湖北省", city="武汉市", name="测试农资店")
        AgriProduct.objects.create(store=store, name="测试药剂", category="pesticide", price="12.5")
        response = self.client.get("/api/farm/products/", {"province": "湖北省", "city": "武汉市"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data[0]["name"], "测试药剂")

    def test_diagnosis_saves_result_and_supports_follow_up(self):
        diagnosis_response = self.client.post("/api/pest/diagnosis/", {
            "crop": "rice", "location": "湖北省", "symptom": "叶片黄褐色斑点",
        }, format="json")
        self.assertEqual(diagnosis_response.status_code, 201)
        self.assertFalse(diagnosis_response.data["needs_human_review"])
        diagnosis_id = diagnosis_response.data["id"]

        follow_up = self.client.post("/api/pest/follow-up/", {
            "diagnosis": diagnosis_id, "treatment_date": date.today(),
            "product_name": "测试药剂", "effect_score": 4, "loss_avoided": "1200",
            "note": "虫口下降",
        }, format="json")
        self.assertEqual(follow_up.status_code, 201)
        self.assertEqual(diagnosis_response.data["status"], "draft")

    def test_unsafe_dosage_question_is_sent_for_human_review(self):
        result = diagnose_pest("rice", "重度发生，需要农药配比")
        self.assertTrue(result["needs_human_review"])
        self.assertEqual(result["treatment_plan"], [])
        self.assertIn("人工", result["review_reason"])

    def test_subsidy_matcher_returns_documents_and_total(self):
        response = self.client.post("/api/subsidy/match/", {
            "crop": "rice", "area": 50, "needs_machine": False, "contracted_land": True,
        }, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(len(response.data["items"]), 2)
        self.assertGreater(response.data["estimated_total"][1], 0)
        self.assertTrue(response.data["items"][0]["documents"])

    def test_decision_engines_are_deterministic(self):
        profile = FarmProfile.objects.create(
            user=self.user, province="湖北省", city="武汉市", main_crop="rice",
            growth_stage="seedling", planting_area=10,
        )
        tasks = build_farm_tasks(profile)
        self.assertEqual(len(tasks), 4)
        self.assertTrue(all(task["suggested_date"] >= date.today() for task in tasks))
        self.assertGreaterEqual(len(match_subsidies("rice", 10)), 2)
