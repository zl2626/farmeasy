from datetime import date, timedelta
# Extended crop-calendar knowledge: regional and crop-specific windows.
REGION_CALENDAR_RULES = [
    {
        "keywords": ["华南", "广东", "广西", "海南", "福建"],
        "note": "华南光温充足、降雨偏多，重点防涝防渍和稻飞虱、纹枯病。",
        "tasks": [
            ("field", "清沟防渍", "雨后及时排水，降低田间湿度，防止根系缺氧和病害加重。", 1, "high"),
            ("pest", "高温高湿病虫监测", "重点巡查稻飞虱、纹枯病和细菌性条斑病，达到防治指标再处理。", 2, "high"),
        ],
    },
    {
        "keywords": ["长江", "湖北", "湖南", "江西", "安徽", "江苏", "浙江", "四川", "重庆"],
        "note": "长江流域梅雨和伏旱交替，需兼顾排水、蓄水和穗期病害防控。",
        "tasks": [
            ("pest", "梅雨期病害预警", "湿度持续偏高时重点预防纹枯病、稻瘟病、赤霉病等穗期病害。", 1, "high"),
            ("field", "排水与蓄水衔接", "雨后清沟排渍，进入需水关键期前提前蓄水保苗。", 3, "high"),
        ],
    },
    {
        "keywords": ["黄淮", "河南", "山东", "河北", "山西", "陕西"],
        "note": "黄淮海产区需关注干热风、后期倒伏和夏播衔接。",
        "tasks": [
            ("field", "防干热风与倒伏", "结合墒情适时灌溉，避免大风前灌水；旺长田块控制氮肥。", 1, "high"),
            ("pest", "穗期病虫害巡查", "重点巡查蚜虫、赤霉病、锈病和玉米螟，避开扬花授粉时段作业。", 2, "high"),
        ],
    },
    {
        "keywords": ["东北", "黑龙江", "吉林", "辽宁", "内蒙古"],
        "note": "东北生长季短、积温敏感，重点是防低温冷害和适期收获。",
        "tasks": [
            ("field", "积温与低温监测", "关注冷空气和霜冻预报，采取深水护胎或叶面调理等防灾措施。", 1, "high"),
            ("harvest", "适期收获准备", "根据成熟度和含水率安排机械、运输与烘干晾晒。", 5, "medium"),
        ],
    },
    {
        "keywords": ["西北", "新疆", "甘肃", "宁夏", "青海"],
        "note": "西北降水少、光照强，重点是节水灌溉和盐渍化管理。",
        "tasks": [
            ("fertilizer", "水肥一体化检查", "检查滴灌系统堵塞和灌水均匀度，少量多次补肥。", 1, "high"),
            ("field", "盐渍与保墒管理", "关注返盐风险，适时中耕保墒，避免大水漫灌。", 4, "medium"),
        ],
    },
]

CROP_REGION_TASKS = {
    "rice": [
        ("pest", "水稻专项病虫巡查", "结合本地预报巡查螟虫、稻飞虱、稻纵卷叶螟和稻瘟病；优先农业防治和理化诱控。", 1, "high"),
        ("field", "水层管理", "按分蘖、拔节、抽穗、灌浆不同需水特点调整浅水、露田或湿润管理。", 2, "high"),
    ],
    "wheat": [
        ("pest", "小麦“一喷三防”准备", "抽穗至灌浆期统筹防虫、防病、防早衰；用药必须避开扬花和高温时段。", 1, "high"),
        ("field", "防倒伏与干热风", "旺长田控制群体，后期保持适宜墒情，减少干热风损失。", 2, "high"),
    ],
    "corn": [
        ("pest", "玉米螟与草地贪夜蛾监测", "优先理化诱控和生物防治，达到防治指标后再选登记药剂。", 1, "high"),
        ("fertilizer", "大喇叭口期水肥", "根据长势补施关键肥，防止脱肥和后期早衰。", 2, "high"),
    ],
    "soybean": [
        ("pest", "花荚期虫害巡查", "重点巡查蚜虫、食心虫和豆荚螟，关注天敌和防治指标。", 1, "high"),
        ("field", "花荚期水分管理", "干旱影响结荚鼓粒，需提前确认灌溉条件；多雨则排渍。", 2, "high"),
    ],
    "vegetable": [
        ("pest", "设施蔬菜湿度病害管理", "通风降湿，重点预防霜霉病、白粉病和灰霉病；严格执行安全间隔期。", 1, "high"),
        ("field", "轮作与清洁田园", "清理病残体和杂草，避免连作障碍；优先抗病品种和轮作。", 3, "medium"),
    ],
    "fruit": [
        ("field", "疏果与负载控制", "按树势和品种合理留果，避免大小年和果实品质下降。", 1, "high"),
        ("pest", "果实蝇与病害监测", "重点巡查炭疽病、霜霉病和果实蝇，优先诱捕、套袋等绿色防控。", 2, "high"),
    ],
}


def _region_calendar(profile, tasks):
    """Append region-aware tasks and explain why this region matters."""
    from .models import FarmProfile

    location = " ".join(part for part in [profile.province, profile.city] if part)
    crop = dict(FarmProfile.CROP_CHOICES).get(profile.main_crop, profile.main_crop)
    region_hit = next(
        (rule for rule in REGION_CALENDAR_RULES if any(key in location for key in rule["keywords"])),
        None,
    )
    crop_tasks = CROP_REGION_TASKS.get(profile.main_crop, [])
    for task_type, title, description, offset, priority in crop_tasks:
        tasks.append({
            "task_type": task_type,
            "title": f"{crop}·{title}",
            "description": description,
            "suggested_date": date.today() + timedelta(days=offset),
            "priority": priority,
        })
    if region_hit:
        for task_type, title, description, offset, priority in region_hit["tasks"]:
            tasks.append({
                "task_type": task_type,
                "title": f"区域农情·{title}",
                "description": f"{region_hit['note']}{description}",
                "suggested_date": date.today() + timedelta(days=offset),
                "priority": priority,
            })
    else:
        tasks.append({
            "task_type": "field",
            "title": "本地农情确认",
            "description": "未识别到专属区域规则，建议结合县乡农技部门近期预报和田间实测墒情执行。",
            "suggested_date": date.today() + timedelta(days=1),
            "priority": "medium",
        })
    return tasks



