# 从必应图片搜索抓取各作物真实照片，下载到 public/crops/
# 优先选用来自 wikimedia.org 的结果（开源授权），其余为网络搜索结果（演示用途）
import html
import io
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

BASE = "C:/Users/31586/Desktop/farmeasy/farmeasy-frontend"
OUT_DIR = os.path.join(BASE, "public", "crops")
MAP_PATH = os.path.join(BASE, "src", "data", "cropImages.json")
SEARCH = "https://cn.bing.com/images/search?q={q}&form=HDRSC2&first=1"
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0 Safari/537.36")

os.makedirs(OUT_DIR, exist_ok=True)

CROPS = {
    "小麦": ("小麦 农田 麦田", "wheat"),
    "水稻": ("水稻 稻田", "rice"),
    "玉米": ("玉米 果穗", "corn"),
    "大豆": ("大豆 豆荚", "soybean"),
    "花生": ("花生 果实", "peanut"),
    "马铃薯": ("马铃薯 土豆", "potato"),
    "甘薯": ("红薯 红薯地", "sweet-potato"),
    "油菜": ("油菜花 田", "rapeseed"),
    "番茄": ("番茄 果实", "tomato"),
    "黄瓜": ("黄瓜 果实", "cucumber"),
    "辣椒": ("辣椒 果实", "chili"),
    "大白菜": ("大白菜 蔬菜", "napa-cabbage"),
    "苹果": ("苹果 果园", "apple"),
    "柑橘": ("柑橘 果实", "mandarin"),
    "谷子": ("谷子 穗", "millet"),
    "高粱": ("高粱 穗", "sorghum"),
    "大麦": ("大麦 麦穗", "barley"),
    "绿豆": ("绿豆 豆粒", "mung-bean"),
    "燕麦": ("燕麦 麦田", "oats"),
    "荞麦": ("荞麦 花田", "buckwheat"),
    "红小豆": ("红小豆 豆粒", "adzuki-bean"),
    "蚕豆": ("蚕豆 豆荚", "broad-bean"),
    "向日葵": ("向日葵 花田", "sunflower"),
    "芝麻": ("芝麻 植株", "sesame"),
    "胡麻": ("胡麻 亚麻花", "flax"),
    "油茶": ("油茶 果实", "oil-tea"),
    "棉花": ("棉花 棉田", "cotton"),
    "甘蔗": ("甘蔗 田", "sugarcane"),
    "茶树": ("茶园 茶山", "tea"),
    "甜菜": ("甜菜 块根", "sugar-beet"),
    "萝卜": ("白萝卜 萝卜", "radish"),
    "胡萝卜": ("胡萝卜", "carrot"),
    "茄子": ("茄子 果实", "eggplant"),
    "豇豆": ("豇豆 豆角", "cowpea"),
    "芹菜": ("芹菜 蔬菜", "celery"),
    "大蒜": ("大蒜 蒜头", "garlic"),
    "大葱": ("大葱 葱", "green-onion"),
    "洋葱": ("洋葱", "onion"),
    "生姜": ("生姜 姜块", "ginger"),
    "南瓜": ("南瓜 果实", "pumpkin"),
    "山药": ("山药", "yam"),
    "芋头": ("芋头", "taro"),
    "莲藕": ("莲藕", "lotus-root"),
    "空心菜": ("空心菜 蔬菜", "water-spinach"),
    "菠菜": ("菠菜 蔬菜", "spinach"),
    "生菜": ("生菜 蔬菜", "lettuce"),
    "油麦菜": ("油麦菜 蔬菜", "leaf-lettuce"),
    "西兰花": ("西兰花", "broccoli"),
    "花椰菜": ("花椰菜 菜花", "cauliflower"),
    "韭菜": ("韭菜", "chives"),
    "香菜": ("香菜 蔬菜", "coriander"),
    "丝瓜": ("丝瓜", "luffa"),
    "苦瓜": ("苦瓜", "bitter-melon"),
    "冬瓜": ("冬瓜", "winter-melon"),
    "四季豆": ("四季豆 豆角", "green-beans"),
    "秋葵": ("秋葵", "okra"),
    "茼蒿": ("茼蒿 蔬菜", "chrysanthemum-greens"),
    "芥菜": ("芥菜 蔬菜", "mustard-greens"),
    "苋菜": ("苋菜 蔬菜", "amaranth"),
    "芦笋": ("芦笋", "asparagus"),
    "毛豆": ("毛豆 豆荚", "edamame"),
    "荷兰豆": ("荷兰豆", "snow-peas"),
    "芥兰": ("芥兰 芥蓝", "chinese-kale"),
    "娃娃菜": ("娃娃菜", "baby-cabbage"),
    "紫苏": ("紫苏 叶", "perilla"),
    "薄荷": ("薄荷 叶", "mint"),
    "荸荠": ("荸荠 马蹄", "water-chestnut"),
    "金针菜": ("黄花菜 金针菜", "daylily"),
    "西瓜": ("西瓜 瓜田", "watermelon"),
    "葡萄": ("葡萄 果园", "grape"),
    "桃": ("桃子 果实", "peach"),
    "梨": ("梨子 果实", "pear"),
    "草莓": ("草莓", "strawberry"),
    "枣": ("枣 红枣", "jujube"),
    "柿子": ("柿子 果实", "persimmon"),
    "板栗": ("板栗 栗子", "chestnut"),
    "核桃": ("核桃", "walnut"),
    "猕猴桃": ("猕猴桃 果实", "kiwifruit"),
    "荔枝": ("荔枝 果实", "lychee"),
    "龙眼": ("龙眼 桂圆", "longan"),
    "香蕉": ("香蕉", "banana"),
    "芒果": ("芒果 果实", "mango"),
    "樱桃": ("樱桃 果实", "cherry"),
    "杏": ("杏子 果实", "apricot"),
    "石榴": ("石榴 果实", "pomegranate"),
    "甜瓜": ("甜瓜 香瓜", "melon"),
    "杨梅": ("杨梅 果实", "bayberry"),
    "枇杷": ("枇杷 果实", "loquat"),
    "柚子": ("柚子 果实", "pomelo"),
    "橙子": ("橙子 果实", "orange"),
    "柠檬": ("柠檬 果实", "lemon"),
    "百香果": ("百香果", "passion-fruit"),
    "火龙果": ("火龙果", "dragon-fruit"),
    "椰子": ("椰子", "coconut"),
    "蓝莓": ("蓝莓", "blueberry"),
    "香菇": ("香菇", "shiitake"),
    "平菇": ("平菇", "oyster-mushroom"),
    "黑木耳": ("黑木耳", "wood-ear"),
    "青稞": ("青稞 麦穗", "highland-barley"),
    "薏米": ("薏米 薏仁", "coix-seed"),
}


def fetch_search_urls(term):
    """抓取必应图片搜索页，返回候选原图 URL 列表（wikimedia 优先）。"""
    q = urllib.parse.quote(term)
    url = SEARCH.format(q=q)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=20) as r:
        page = r.read().decode("utf-8", "ignore")
    murls = re.findall(r'murl&quot;:&quot;(.*?)&quot;', page)
    urls = [html.unescape(u) for u in murls]
    urls = [u for u in urls if re.match(r"^https?://", u)]
    wikimedia = [u for u in urls if "wikimedia" in u.lower()]
    upload_wm = [u for u in wikimedia if "upload.wikimedia.org" in u]
    return upload_wm + [u for u in wikimedia if u not in upload_wm] + [u for u in urls if u not in wikimedia]


def download(url, path, max_bytes=8 * 1024 * 1024):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Referer": "https://cn.bing.com/"})
    with urllib.request.urlopen(req, timeout=25) as r:
        data = r.read(max_bytes + 1)
    if len(data) < 5000 or len(data) > max_bytes:
        return False
    if not (data[:3] == b"\xff\xd8\xff" or data[:8] == b"\x89PNG\r\n\x1a\n"):
        return False
    with open(path, "wb") as f:
        f.write(data)
    return True


image_map = {}
ok, failed = 0, []
items = list(CROPS.items())
for i, (name, (term, slug)) in enumerate(items, 1):
    out_path = os.path.join(OUT_DIR, slug + ".jpg")
    if os.path.exists(out_path) and os.path.getsize(out_path) > 5000:
        image_map[name] = "/crops/" + slug + ".jpg"
        print(f"[{i}/{len(items)}] {name}: 已存在，跳过", flush=True)
        continue
    try:
        candidates = fetch_search_urls(term)[:6]
        got = False
        for u in candidates:
            try:
                if download(u, out_path):
                    image_map[name] = "/crops/" + slug + ".jpg"
                    got = True
                    ok += 1
                    print(f"[{i}/{len(items)}] {name}: OK  {u[:70]}", flush=True)
                    break
            except Exception:
                continue
        if not got:
            failed.append(name)
            print(f"[{i}/{len(items)}] {name}: FAILED", flush=True)
    except Exception as e:
        failed.append(name)
        print(f"[{i}/{len(items)}] {name}: 搜索失败 ({e})", flush=True)
    time.sleep(0.5)

with open(MAP_PATH, "w", encoding="utf-8") as f:
    json.dump(image_map, f, ensure_ascii=False, indent=1)
print(f"\n完成: 成功 {ok}, 失败 {len(failed)} {failed}", flush=True)
