import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"

def load_crops_data():
    file_path= DATA_DIR / "crops.json"
    with open(file_path,"r",encoding="utf-8") as f:
        return json.load(f)["crops"]