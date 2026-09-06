import hashlib
import json
import re
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction

from education.models import Crop, Scheme


LABEL_PATTERN = re.compile(r"^【([^】]+)】(.*)$", re.MULTILINE)


def parse_labels(text):
    return {key.strip(): value.strip() for key, value in LABEL_PATTERN.findall(text)}


def split_list(value, numbered=False):
    if not value:
        return []
    if numbered:
        value = re.sub(r"^\s*1\.\s*", "", value)
        return [part.strip() for part in re.split(r"\s+\d+\.\s*", value) if part.strip()]
    return [part.strip() for part in re.split(r"[；;、]", value) if part.strip()]


def parse_crop_name(value):
    match = re.match(r"^(?P<name>[^（(]+)(?:[（(]别名[:：](?P<aliases>[^）)]+)[）)])?", value)
    if not match:
        return value.strip(), []
    return match.group("name").strip(), split_list(match.group("aliases") or "")


def parse_scheme_name(value):
    match = re.match(r"^(?P<name>[^（(]+)(?:[（(]类型[:：](?P<category>[^）)]+)[）)])?", value)
    if not match:
        return value.strip(), ""
    return match.group("name").strip(), (match.group("category") or "").strip()


class Command(BaseCommand):
    help = "幂等导入项目内置的中文作物知识和惠农政策数据"

    @transaction.atomic
    def handle(self, *args, **options):
        cleaned_dir = Path(settings.BASE_DIR) / "data" / "cleaned"
        crop_count = self._seed_crops(cleaned_dir / "智农作物知识库.json")
        scheme_count = self._seed_schemes(cleaned_dir / "智农惠农政策.json")
        if options.get("verbosity", 1):
            self.stdout.write(
                self.style.SUCCESS(f"农业基础数据已同步：作物 {crop_count} 条，政策 {scheme_count} 条")
            )

    def _load(self, path):
        with path.open("r", encoding="utf-8") as source_file:
            return json.load(source_file)

    def _seed_crops(self, path):
        count = 0
        for record in self._load(path):
            labels = parse_labels(record.get("text", ""))
            name, aliases = parse_crop_name(labels.get("作物名称", ""))
            if not name:
                continue
            crop_id = "cn-" + hashlib.sha1(name.encode("utf-8")).hexdigest()[:16]
            Crop.objects.update_or_create(
                crop_id=crop_id,
                defaults={
                    "name": name,
                    "aliases": aliases,
                    "category": labels.get("类别", ""),
                    "season": labels.get("季节", ""),
                    "soil": split_list(labels.get("适宜土壤", "")),
                    "duration": labels.get("生长周期", ""),
                    "sowing_time": labels.get("播种/定植时间", ""),
                    "climate": labels.get("气候要求", ""),
                    "water": labels.get("水分需求", ""),
                    "fertilizer": labels.get("施肥要点", ""),
                    "irrigation": labels.get("灌溉要点", ""),
                    "yield_info": labels.get("预期产量", ""),
                    "description": labels.get("简介", ""),
                    "steps": split_list(labels.get("种植步骤", ""), numbered=True),
                    "common_mistakes": split_list(labels.get("常见错误", "")),
                    "source": record.get("source") or "智农作物知识库",
                    "image_status": Crop.ImageStatus.UNVERIFIED,
                },
            )
            count += 1
        return count

    def _seed_schemes(self, path):
        count = 0
        for record in self._load(path):
            labels = parse_labels(record.get("text", ""))
            name, category = parse_scheme_name(labels.get("政策名称", ""))
            if not name:
                continue
            Scheme.objects.update_or_create(
                name=name,
                defaults={
                    "category": category,
                    "description": labels.get("政策简介", ""),
                    "eligibility": labels.get("申请条件", ""),
                    "benefits": labels.get("补贴内容", ""),
                    "deadline": labels.get("办理时间", ""),
                    "documents": split_list(labels.get("所需材料", "")),
                    "how_to_apply": split_list(labels.get("申请流程", ""), numbered=True),
                    "applicable_region": "具体范围以当地当年通知为准",
                    "source": record.get("source") or "智农惠农政策库",
                },
            )
            count += 1
        return count
