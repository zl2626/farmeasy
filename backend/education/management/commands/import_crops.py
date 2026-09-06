import json
from django.core.management.base import BaseCommand
from education.models import Crop
from pathlib import Path
from django.conf import settings

class Command(BaseCommand):
    help = "Import crops from JSON file"

    def handle(self, *args, **kwargs):
        file_path = Path(settings.BASE_DIR) / "education" / "data" / "crops.json"

        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        crops = data.get("crops", [])

        for crop in crops:
            Crop.objects.update_or_create(
                crop_id=crop["id"],
                defaults={
                    "name": crop["name"],
                    "season": crop["season"],
                    "soil": crop["soil"],
                    "duration": crop["duration"],
                    "sowing_time": crop["sowing_time"],
                    "climate": crop["climate"],
                    "rainfall": crop["rainfall"],
                    "fertilizer": crop["fertilizer"],
                    "irrigation": crop["irrigation"],
                    "yield_info": crop["yield"],
                    "steps": crop["steps"],
                    "common_mistakes": crop["common_mistakes"],
                    "images": crop["images"],
                }
            )

        self.stdout.write(self.style.SUCCESS("Crops imported successfully!"))
