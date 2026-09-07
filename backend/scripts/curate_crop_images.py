"""Fetch crop photographs from explicit Commons file titles with provenance."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import io
import json
from pathlib import Path
import subprocess
import threading
import time
from urllib.parse import urlencode, unquote

from bs4 import BeautifulSoup
from PIL import Image, ImageOps

API = "https://commons.wikimedia.org/w/api.php"
ROOT = Path(__file__).resolve().parents[2]
_api_lock = threading.Lock()
_last_request = 0.0


def fetch(url):
    last_error = None
    for attempt in range(2):
        result = subprocess.run(
            ["curl.exe", "--fail", "-L", "-sS", "--max-time", "20", "-A", "FarmEasyCropReference/1.0", url],
            capture_output=True,
        )
        if result.returncode == 0 and result.stdout:
            return result.stdout
        last_error = result.stderr.decode(errors="replace")
        time.sleep(5 * (attempt + 1))
    raise RuntimeError(last_error)


def api(**params):
    global _last_request
    with _api_lock:
        time.sleep(max(0, 2.2 - (time.monotonic() - _last_request)))
        _last_request = time.monotonic()
    return json.loads(fetch(API + "?" + urlencode({"format": "json", "maxlag": 5, **params})))


def catalog(page):
    data = api(action="parse", page=page, prop="text", redirects=1)
    if "parse" not in data:
        raise ValueError(data.get("error", {}).get("info", "Page unavailable"))
    soup = BeautifulSoup(data["parse"]["text"]["*"], "html.parser")
    items = []
    for box in soup.select(".gallerybox"):
        link = box.select_one("a.mw-file-description")
        if not link:
            continue
        title = unquote(link.get("href", "").split("/wiki/")[-1]).replace("_", " ")
        heading = box.find_previous(["h2", "h3"])
        caption = box.select_one(".gallerytext")
        items.append({"file": title, "section": heading.get_text(" ", strip=True) if heading else "",
                      "caption": caption.get_text(" ", strip=True) if caption else ""})
    return {"page": page, "images": items}


def download(entry, output):
    details = entry.pop("_imageinfo", None)
    if details is None:
        info = api(action="query", titles=entry["file"], prop="imageinfo",
                   iiprop="url|extmetadata", iiurlwidth=800)
        page = next(iter(info["query"]["pages"].values()))
        details = page["imageinfo"][0]
    url = details.get("thumburl", details["url"]).split("?")[0]
    try:
        raw = fetch(url)
    except RuntimeError:
        url = details["url"].split("?")[0]
        raw = fetch(url)
    with Image.open(io.BytesIO(raw)) as image:
        image = ImageOps.exif_transpose(image).convert("RGB")
        if min(image.size) < 100:
            raise ValueError("Image too small")
        image.thumbnail((1000, 800))
        image.save(output / (entry["slug"] + ".jpg"), quality=90, optimize=True)
    metadata = details.get("extmetadata", {})
    entry.update({"source_url": details["descriptionurl"], "download_url": url})
    for field, key in [("artist", "Artist"), ("license", "LicenseShortName"), ("license_url", "LicenseUrl")]:
        value = metadata.get(key, {}).get("value", "")
        entry[field] = BeautifulSoup(value, "html.parser").get_text(" ", strip=True) if "<" in value else value
    return entry


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=["catalog", "catalog-many", "category", "download"])
    parser.add_argument("input", help="Page title for catalog; JSON manifest for download")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    if args.mode == "catalog":
        print(json.dumps(catalog(args.input), ensure_ascii=True))
        return
    if args.mode == "category":
        print(json.dumps(api(action="query", list="categorymembers", cmtitle="Category:" + args.input,
                             cmtype="file", cmlimit=100), ensure_ascii=True))
        return
    entries = json.loads(Path(args.input).read_text(encoding="utf-8"))
    args.output.mkdir(parents=True, exist_ok=True)
    if args.mode == "catalog-many":
        def inspect(entry):
            cache = args.output / (entry["slug"] + ".json")
            try:
                result = json.loads(cache.read_text()) if cache.exists() else catalog(entry["page"])
                cache.write_text(json.dumps(result, ensure_ascii=True), encoding="utf-8")
                return {"slug": entry["slug"], **result}
            except Exception as exc:
                return {"slug": entry["slug"], "error": str(exc)[:150]}
        with ThreadPoolExecutor(max_workers=4) as pool:
            for result in pool.map(inspect, entries):
                print(result["slug"], result.get("error", str(len(result["images"])) + " images" if "images" in result else ""), flush=True)
        return
    saved = args.output / "sources.json"
    if saved.exists():
        previous = {item["slug"]: item for item in json.loads(saved.read_text(encoding="utf-8"))}
        entries = [previous.get(item["slug"], item) if previous.get(item["slug"], {}).get("file") == item["file"] else item for item in entries]
    pending = [item for item in entries if not item.get("source_url")]
    for start in range(0, len(pending), 15):
        batch = pending[start:start + 15]
        result = api(action="query", titles="|".join(item["file"] for item in batch), prop="imageinfo",
                     iiprop="url|extmetadata", iiurlwidth=800)
        info = {page["title"]: page["imageinfo"][0] for page in result["query"]["pages"].values() if "imageinfo" in page}
        for item in batch:
            item["_imageinfo"] = info.get(item["file"])
    def run(entry):
        try:
            if (args.output / (entry["slug"] + ".jpg")).exists() and entry.get("source_url"):
                return entry
            result = download(entry, args.output)
            print("OK " + entry["slug"], flush=True)
            return result
        except Exception as exc:
            print("FAILED " + entry["slug"] + ": " + str(exc)[:200], flush=True)
            return entry
    with ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(run, entries))
    (args.output / "sources.json").write_text(json.dumps(results, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
