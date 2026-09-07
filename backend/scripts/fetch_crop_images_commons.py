# 从 Wikimedia Commons 重抓全部作物图片（curl 多重试对抗间歇阻断）
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

os.makedirs(OUT_DIR, exist_ok=True)

CROPS = {
    "小麦": ("wheat field", "wheat"),
    "水稻": ("rice paddy field", "rice"),
    "玉米": ("corn maize cobs", "corn"),
    "大豆": ("soybean field", "soybean"),
    "花生": ("peanut plant", "peanut"),
    "马铃薯": ("potatoes harvest", "potato"),
    "甘薯": ("sweet potatoes", "sweet-potato"),
    "油菜": ("rapeseed field", "rapeseed"),
    "番茄": ("tomato fruits", "tomato"),
    "黄瓜": ("cucumbers", "cucumber"),
    "辣椒": ("chili peppers", "chili"),
    "大白菜": ("napa cabbage", "napa-cabbage"),
    "苹果": ("apples fruit", "apple"),
    "柑橘": ("mandarin oranges", "mandarin"),
    "谷子": ("proso millet", "millet"),
    "高粱": ("sorghum crop", "sorghum"),
    "大麦": ("barley ears", "barley"),
    "绿豆": ("mung beans", "mung-bean"),
    "燕麦": ("oat field", "oats"),
    "荞麦": ("buckwheat flowers", "buckwheat"),
    "红小豆": ("adzuki beans", "adzuki-bean"),
    "蚕豆": ("broad beans", "broad-bean"),
    "向日葵": ("sunflower field", "sunflower"),
    "芝麻": ("sesame plant", "sesame"),
    "胡麻": ("flax field", "flax"),
    "油茶": ("camellia oleifera", "oil-tea"),
    "棉花": ("cotton field", "cotton"),
    "甘蔗": ("sugarcane field", "sugarcane"),
    "茶树": ("tea plantation", "tea"),
    "甜菜": ("sugar beet", "sugar-beet"),
    "萝卜": ("daikon radish", "radish"),
    "胡萝卜": ("carrots", "carrot"),
    "茄子": ("eggplant fruit", "eggplant"),
    "豇豆": ("cowpea pods", "cowpea"),
    "芹菜": ("celery", "celery"),
    "大蒜": ("garlic bulbs", "garlic"),
    "大葱": ("welsh onion", "green-onion"),
    "洋葱": ("onions", "onion"),
    "生姜": ("ginger root", "ginger"),
    "南瓜": ("pumpkins", "pumpkin"),
    "山药": ("chinese yam", "yam"),
    "芋头": ("taro corms", "taro"),
    "莲藕": ("lotus root", "lotus-root"),
    "空心菜": ("water spinach", "water-spinach"),
    "菠菜": ("spinach leaves", "spinach"),
    "生菜": ("lettuce head", "lettuce"),
    "油麦菜": ("lettuce", "leaf-lettuce"),
    "西兰花": ("broccoli", "broccoli"),
    "花椰菜": ("cauliflower", "cauliflower"),
    "韭菜": ("chinese chives", "chives"),
    "香菜": ("coriander leaves", "coriander"),
    "丝瓜": ("luffa", "luffa"),
    "苦瓜": ("bitter melon", "bitter-melon"),
    "冬瓜": ("winter melon", "winter-melon"),
    "四季豆": ("green beans", "green-beans"),
    "秋葵": ("okra", "okra"),
    "茼蒿": ("garland chrysanthemum", "chrysanthemum-greens"),
    "芥菜": ("mustard greens", "mustard-greens"),
    "苋菜": ("amaranth leaves", "amaranth"),
    "芦笋": ("asparagus", "asparagus"),
    "毛豆": ("edamame", "edamame"),
    "荷兰豆": ("snow peas", "snow-peas"),
    "芥兰": ("chinese kale", "chinese-kale"),
    "娃娃菜": ("napa cabbage", "baby-cabbage"),
    "紫苏": ("perilla", "perilla"),
    "薄荷": ("mint leaves", "mint"),
    "荸荠": ("water chestnut", "water-chestnut"),
    "金针菜": ("daylily buds", "daylily"),
    "西瓜": ("watermelons", "watermelon"),
    "葡萄": ("grapes", "grape"),
    "桃": ("peaches", "peach"),
    "梨": ("pears fruit", "pear"),
    "草莓": ("strawberries", "strawberry"),
    "枣": ("jujube fruit", "jujube"),
    "柿子": ("persimmons", "persimmon"),
    "板栗": ("chestnuts", "chestnut"),
    "核桃": ("walnuts", "walnut"),
    "猕猴桃": ("kiwifruit", "kiwifruit"),
    "荔枝": ("lychee fruit", "lychee"),
    "龙眼": ("longan fruit", "longan"),
    "香蕉": ("bananas", "banana"),
    "芒果": ("mangoes", "mango"),
    "樱桃": ("cherries", "cherry"),
    "杏": ("apricots", "apricot"),
    "石榴": ("pomegranate", "pomegranate"),
    "甜瓜": ("melon", "melon"),
    "杨梅": ("chinese bayberry", "bayberry"),
    "枇杷": ("loquat", "loquat"),
    "柚子": ("pomelo", "pomelo"),
    "橙子": ("oranges", "orange"),
    "柠檬": ("lemons", "lemon"),
    "百香果": ("passion fruit", "passion-fruit"),
    "火龙果": ("dragon fruit", "dragon-fruit"),
    "椰子": ("coconuts", "coconut"),
    "蓝莓": ("blueberries", "blueberry"),
    "香菇": ("shiitake mushrooms", "shiitake"),
    "平菇": ("oyster mushrooms", "oyster-mushroom"),
    "黑木耳": ("wood ear mushroom", "wood-ear"),
    "青稞": ("highland barley", "highland-barley"),
    "薏米": ("coix seeds", "coix-seed"),
}


def curl_bytes(url, timeout=25):
    """用 curl 抓取（curl 的 TLS 指纹通过率更高），带重试。返回 bytes 或抛异常。"""
    last_err = None
    for attempt in range(8):
        try:
            r = subprocess.run(
                ["curl", "-s", "-m", str(timeout), "-L",
                 "-A", UA, "--compressed", url],
                capture_output=True, timeout=timeout + 10,
            )
            if r.returncode == 0 and r.stdout:
                return r.stdout
            last_err = RuntimeError(f"curl exit {r.returncode}")
        except Exception as e:
            last_err = e
        time.sleep(1.0 + attempt * 0.5)
    raise last_err


def api_thumbs(term):
    params = {
        "action": "query", "format": "json", "generator": "search",
        "gsrsearch": term + " filetype:bitmap", "gsrnamespace": "6",
        "gsrlimit": "8", "prop": "imageinfo", "iiprop": "url|mime|size",
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

ok, failed = 0, []
items = list(CROPS.items())
for i, (name, (term, slug)) in enumerate(items, 1):
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
                print(f"[{i}/{len(items)}] {name}: OK", flush=True)
                break
            except Exception:
                continue
        if not got:
            failed.append(name)
            print(f"[{i}/{len(items)}] {name}: FAILED", flush=True)
    except Exception as e:
        failed.append(name)
        print(f"[{i}/{len(items)}] {name}: 搜索失败", flush=True)
    time.sleep(0.2)

with open(MAP_PATH, "w", encoding="utf-8") as f:
    json.dump(image_map, f, ensure_ascii=False, indent=1)
print(f"\n完成: 成功 {ok}, 失败 {len(failed)} {failed}", flush=True)
