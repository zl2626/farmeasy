"""Download crop encyclopedia photos into farmeasy-frontend/public/crops."""
from __future__ import annotations

import io
import json
import subprocess
import time
import urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[2]
FRONTEND = ROOT / "farmeasy-frontend"
OUT_DIR = FRONTEND / "public" / "crops"
MAP_PATH = FRONTEND / "src" / "data" / "cropImages.json"
SELECTION_PATH = Path(__file__).resolve().parent / "crop_image_selection.json"
API = "https://commons.wikimedia.org/w/api.php"
UA = "ZhinongCropDemo/1.0 (educational; local project)"

EXTRA_FILES = {
    "wheat": "File:Wheat close-up.JPG",
    "rice": "File:Rice Paddy in Japan.jpg",
    "corn": "File:Corncobs.jpg",
    "soybean": "File:Soybean.USDA.jpg",
    "peanut": "File:PeanutUSDA.jpg",
    "rapeseed": "File:Rapeseed field.jpg",
    "napa-cabbage": "File:Napa cabbage.jpg",
    "apple": "File:Red Apple.jpg",
    "sorghum": "File:Sorghum bicolor.webp",
    "barley": "File:Hordeum-barley.jpg",
    "mung-bean": "File:Mung beans.jpg",
    "buckwheat": "File:Fagopyrum esculentum.jpg",
    "adzuki-bean": "File:Azuki beans.jpg",
    "sunflower": "File:Sunflowers.jpg",
    "sesame": "File:Sesamum indicum Seeds.jpg",
    "sugarcane": "File:Sugarcane.jpg",
    "tea": "File:Tea plantation.jpg",
    "carrot": "File:Carrots of many colors.jpg",
    "garlic": "File:Garlic.jpg",
    "pumpkin": "File:Pumpkins.jpg",
    "water-spinach": "File:Ipomoea aquatica 1.jpg",
    "lettuce": "File:Iceberg lettuce.jpg",
    "cauliflower": "File:Cauliflower.JPG",
    "coriander": "File:Coriander Leaves.JPG",
    "bitter-melon": "File:Bitter melon.jpg",
    "winter-melon": "File:Winter melon.jpg",
    "green-beans": "File:Green beans.jpg",
    "mustard-greens": "File:Mustard greens.jpg",
    "asparagus": "File:Asparagus officinalis1.jpg",
    "edamame": "File:Edamame by Zesmerelda in Hoboken.jpg",
    "baby-cabbage": "File:Napa cabbage.jpg",
    "mint": "File:Mint leaves.jpg",
    "daylily": "File:Hemerocallis fulva 2.jpg",
    "grape": "File:Table grapes on white.jpg",
    "peach": "File:Peaches.jpg",
    "jujube": "File:Ziziphus jujuba MS 2461.jpg",
    "persimmon": "File:Diospyros kaki fruit.jpg",
    "kiwifruit": "File:Kiwi aka.jpg",
    "lychee": "File:Litchi chinensis fruits.JPG",
    "longan": "File:Longan fruit.jpg",
    "banana": "File:Banana and cross section.jpg",
    "mango": "File:Mangoes with cross section.jpg",
    "cherry": "File:Cherry Stella444.jpg",
    "apricot": "File:Apricots.jpg",
    "melon": "File:Cantaloupe.jpg",
    "pomelo": "File:Pomelo fruit.jpg",
    "orange": "File:Orange fruit.jpg",
    "lemon": "File:Lemon.jpg",
    "passion-fruit": "File:Passion fruit - whole and split.jpg",
    "blueberry": "File:Blueberries.jpg",
    "shiitake": "File:Shiitake mushroom.jpg",
}


def curl(url: str, timeout: int = 25) -> bytes:
    last_error: Exception | None = None
    for attempt in range(4):
        result = subprocess.run(
            [
                "curl", "-fsSL", "-m", str(timeout), "-A", UA,
                "--compressed", url,
            ],
            capture_output=True,
            timeout=timeout + 8,
        )
        if result.returncode == 0 and result.stdout:
            return result.stdout
        last_error = RuntimeError(result.stderr.decode("utf-8", "ignore")[:200] or f"exit {result.returncode}")
        time.sleep(0.6 * (attempt + 1))
    raise last_error or RuntimeError("curl failed")


def api(**params) -> dict:
    url = API + "?" + urllib.parse.urlencode({"format": "json", **params})
    return json.loads(curl(url).decode("utf-8", "ignore"))


def file_thumb(title: str) -> str | None:
    data = api(
        action="query",
        titles=title,
        prop="imageinfo",
        iiprop="url|mime|size",
        iiurlwidth=640,
    )
    pages = data.get("query", {}).get("pages", {})
    for page in pages.values():
        if int(page.get("pageid", 0)) < 0:
            return None
        info = (page.get("imageinfo") or [{}])[0]
        return info.get("thumburl") or info.get("url")
    return None


def search_thumb(term: str) -> str | None:
    data = api(
        action="query",
        generator="search",
        gsrsearch=f"{term} filetype:bitmap",
        gsrnamespace="6",
        gsrlimit="6",
        prop="imageinfo",
        iiprop="url|mime|size",
        iiurlwidth=640,
    )
    pages = data.get("query", {}).get("pages", {})
    for page in pages.values():
        info = (page.get("imageinfo") or [{}])[0]
        if info.get("mime") not in ("image/jpeg", "image/png", "image/webp"):
            continue
        url = info.get("thumburl") or info.get("url")
        if url:
            return url
    return None


def save_jpeg(raw: bytes, dest: Path) -> None:
    with Image.open(io.BytesIO(raw)) as image:
        image = ImageOps.exif_transpose(image).convert("RGB")
        image.thumbnail((720, 540))
        dest.parent.mkdir(parents=True, exist_ok=True)
        image.save(dest, format="JPEG", quality=78, optimize=True)


def download_one(name: str, rel_path: str, preferred_file: str | None) -> tuple[str, bool, str]:
    slug = Path(rel_path).stem
    dest = OUT_DIR / f"{slug}.jpg"
    if dest.exists() and dest.stat().st_size > 4000:
        return name, True, "exists"

    candidates: list[str] = []
    if preferred_file:
        try:
            url = file_thumb(preferred_file)
            if url:
                candidates.append(url)
        except Exception:
            pass
    extra = EXTRA_FILES.get(slug)
    if extra and extra != preferred_file:
        try:
            url = file_thumb(extra)
            if url:
                candidates.append(url)
        except Exception:
            pass
    try:
        url = search_thumb(name)
        if url:
            candidates.append(url)
    except Exception:
        pass

    last_error = "no url"
    for url in candidates:
        try:
            raw = curl(url, timeout=40)
            if len(raw) < 3000:
                continue
            save_jpeg(raw, dest)
            if dest.stat().st_size > 2000:
                return name, True, "ok"
        except Exception as exc:
            last_error = str(exc)[:160]
    return name, False, last_error


def main() -> None:
    mapping = json.loads(MAP_PATH.read_text(encoding="utf-8"))
    selection = {}
    if SELECTION_PATH.exists():
        for item in json.loads(SELECTION_PATH.read_text(encoding="utf-8")):
            selection[item["slug"]] = item["file"]

    jobs = []
    for name, rel_path in mapping.items():
        slug = Path(rel_path).stem
        jobs.append((name, rel_path, selection.get(slug)))

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    ok = 0
    failed: list[str] = []
    with ThreadPoolExecutor(max_workers=6) as pool:
        futures = [pool.submit(download_one, *job) for job in jobs]
        for future in as_completed(futures):
            name, success, detail = future.result()
            status = "OK" if success else "FAIL"
            print(f"{status} {name} ({detail})", flush=True)
            if success:
                ok += 1
            else:
                failed.append(name)
    print(f"\nDone: {ok}/{len(jobs)} saved. Failed: {failed}", flush=True)


if __name__ == "__main__":
    main()
