# 修复目检发现的错误图片：用拉丁学名/精确词从 Commons 重抓
import io
import json
import os
import subprocess
import sys
import time
import urllib.parse

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

BASE = "C:/Users/31586/Desktop/farmeasy/farmeasy-frontend"
OUT_DIR = os.path.join(BASE, "public", "crops")
MAP_PATH = os.path.join(BASE, "src", "data", "cropImages.json")
API = "https://commons.wikimedia.org/w/api.php"
UA = "ZhinongCropDemo/1.0 (educational demo; contact: local)"

# 作物名 -> 精确搜索词（拉丁学名优先）
FIX = {
    "苋菜": "Amaranthus tricolor",
    "bamboo占位": "bamboo forest",
    "_bamboo_": "bamboo forest",
    "芹菜": "Apium graveolens",
    "板栗": "Castanea mollissima",
    "茼蒿": "Glebionis coronaria",
    "椰子": "Cocos nucifera",
    "豇豆": "Vigna unguiculata seeds",
    "黄瓜": "Cucumis sativus fruits",
    "茄子": "Solanum melongena fruit",
    "青稞": "highland barley Tibet",
    "枇杷": "Eriobotrya japonica fruit",
    "柑橘": "Citrus unshiu mandarin",
    "谷子": "Setaria italica",
    "燕麦": "Avena sativa",
    "油茶": "Camellia oleifera",
    "平菇": "Pleurotus ostreatus",
    "梨": "Pyrus bretschneideri",
    "石榴": "Punica granatum fruit",
    "马铃薯": "Solanum tuberosum",
    "萝卜": "Raphanus sativus white",
    "草莓": "strawberries fruit market",
    "甜菜": "Beta vulgaris sugar beet",
    "核桃": "Juglans regia",
    "山药": "Dioscorea polystachya",
}


def curl_bytes(url, timeout=25):
    last = None
    for attempt in range(10):
        try:
            r = subprocess.run(
                ["curl", "-s", "-m", str(timeout), "-L", "-A", UA, "--compressed", url],
                capture_output=True, timeout=timeout + 10,
            )
            if r.returncode == 0 and r.stdout:
                return r.stdout
            last_err = RuntimeError(f"exit {r.returncode}")
            last = last_err
        except Exception as e:
            last = e
        time.sleep(1.0 + attempt * 0.6)
    raise last


def api_thumbs(term):
    params = {
        "action": "query", "format": "json", "generator": "search",
        "gsrsearch": term + " filetype:bitmap", "gsrnamespace": "6",
        "gsrlimit": "10", "prop": "imageinfo", "iiprop": "url|mime|size",
        "iiurlwidth": "640",
    }
    url = API + "?" + urllib.parse.urlencode(params)
    data = json.loads(curl_bytes(url).decode("utf-8", "ignore"))
    pages = data.get("query", {}).get("pages", {})
    out = []
    for page in pages.values():
        ii = (page.get("imageinfo") or [{}])[0]
        if ii.get("mime") not in ("image/jpeg", "image/png"):
            continue
        w, h = ii.get("width", 0), ii.get("height", 0)
        if w < 400 or h < 260:
            continue
        thumb = ii.get("thumburl") or ii.get("url")
        if thumb:
            out.append(thumb)
    return out


image_map = {}
if os.path.exists(MAP_PATH):
    with open(MAP_PATH, "r", encoding="utf-8") as f:
        image_map = json.load(f)

# bamboo 缺失：slug 用 bamboo
tasks = [(name, FIX.get(name, name), slug) for name, (term, slug) in [
    ("苋菜", FIX["苋菜"]), ("芹菜", FIX["芹菜"]), ("板栗", FIX["板栗"]),
    ("茼蒿", FIX["茼蒿"]), ("椰子", FIX["椰子"]), ("豇豆", FIX["豇豆"]),
    ("黄瓜", FIX["黄瓜"]), ("茄子", FIX["茄子"]), ("青稞", FIX["青稞"]),
    ("枇杷", FIX["枇杷"]), ("柑橘", FIX["柑橘"]), ("谷子", FIX["谷子"]),
    ("燕麦", FIX["燕麦"]), ("油茶", FIX["油茶"]), ("平菇", FIX["平菇"]),
    ("梨", FIX["梨"]), ("石榴", FIX["石榴"]), ("马铃薯", FIX["马铃薯"]),
    ("萝卜", FIX["萝卜"]), ("草莓", FIX["草莓"]), ("甜菜", FIX["甜菜"]),
    ("核桃", FIX["核桃"]), ("山药", FIX["山药"]),
]]
# bamboo 特殊处理
tasks.insert(1, ("竹", FIX["_bamboo_"], "bamboo"))

ok, failed = 0, []
for i, (name, term, slug) in enumerate(tasks, 1):
    out_path = os.path.join(OUT_DIR, slug + ".jpg")
    try:
        urls = api_thumbs(term)
        got = False
        for u in urls[:5]:
            try:
                data = curl_bytes(u, timeout=40)
                if len(data) < 4000:
                    continue
                with open(out_path, "wb") as f:
                    f.write(data)
                image_map[name] = "/crops/" + slug + ".jpg"
                got = True
                ok += 1
                print(f"[{i}/{len(tasks)}] {name}: OK", flush=True)
                break
            except Exception:
                continue
        if not got:
            failed.append(name)
            print(f"[{i}/{len(tasks)}] {name}: FAILED", flush=True)
    except Exception:
        failed.append(name)
        print(f"[{i}/{len(tasks)}] {name}: 搜索失败", flush=True)
    time.sleep(0.3)

# bamboo 的映射键名与其他作物一致（按中文名）
image_map["竹"] = "/crops/bamboo.jpg"
# 修正：bamboo 对应的作物名是“竹”（前端知识库里没有“竹”作物，无需映射），保持 map 干净
image_map.pop("竹", None)

with open(MAP_PATH, "w", encoding="utf-8") as f:
    json.dump(image_map, f, ensure_ascii=False, indent=1)
print(f"\n完成: 成功 {ok}, 失败 {len(failed)} {failed}", flush=True)
