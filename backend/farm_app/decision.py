"""Rule engines for FarmEasy closed-loop agriculture services."""
from datetime import date, timedelta

from .models import FarmProfile

CROP_LABELS = dict(FarmProfile.CROP_CHOICES)
GROWTH_LABELS = dict(FarmProfile.GROWTH_STAGE_CHOICES)


def build_farm_tasks(profile, days=15):
    """Generate proactive crop-calendar tasks for the next N days."""
    tasks = []
    crop = CROP_LABELS.get(profile.main_crop, profile.main_crop)
    stage = GROWTH_LABELS.get(profile.growth_stage, profile.growth_stage)

    base_rules = {
        "seedling": [
            ("field", "查苗补苗，保持湿润", "检查出苗率，缺苗处及时补种；避免大水漫灌。", 1, "high"),
            ("pest", "苗期病虫害预防", "重点关注立枯病、猝倒病和地下害虫，优先采用农业防治和物理防治。", 2, "medium"),
            ("fertilizer", "轻施提苗肥", "苗期不宜重肥，建议结合土壤检测按需少量追肥。", 4, "medium"),
        ],
        "vegetative": [
            ("fertilizer", "追施分蘖/拔节肥", "根据苗情和叶色判断，避免过量氮肥造成旺长或倒伏。", 1, "high"),
            ("pest", "田间病虫巡查", "重点巡查螟虫、蚜虫、飞虱和纹枯病，发现中心病株及时处理。", 2, "high"),
            ("field", "中耕除草与水分管理", "适时中耕，保持田间通风透光，雨后注意排水。", 5, "medium"),
        ],
        "flowering": [
            ("pest", "穗期病虫防治窗口", "重点防治螟虫、赤霉病、锈病等；用药需避开扬花期和授粉时段。", 1, "high"),
            ("fertilizer", "巧施穗肥", "结合叶色和长势补施穗肥，缺钾田块优先补钾。", 3, "medium"),
            ("field", "保持水源稳定", "避免干旱或长期淹水影响结实。", 4, "medium"),
        ],
        "grain_filling": [
            ("fertilizer", "叶面补钾防早衰", "可评估叶面肥需求，重点维持叶片功能期。", 2, "medium"),
            ("pest", "灌浆期防虫防病", "重点防控蚜虫、飞虱和后期病害；严格确认安全间隔期。", 3, "high"),
            ("field", "防倒伏与防渍害", "雨后清沟排水，避免田间长期积水。", 4, "medium"),
        ],
        "harvest": [
            ("harvest", "准备收获机械", "提前确认收割机械、运输和晾晒/烘干场地。", 1, "high"),
            ("harvest", "确认适期收获", "根据含水率和成熟度确定收获时间，减少落粒损失。", 3, "high"),
            ("field", "秸秆处理与田块清理", "优先秸秆还田或离田利用，清除草籽和病虫残体。", 5, "medium"),
        ],
    }

    crop_adjustments = {
        "rice": ("保持浅水层，关注稻飞虱和稻瘟病。", 6),
        "wheat": ("重点防范赤霉病和后期干热风。", 6),
        "corn": ("关注玉米螟、草地贪夜蛾和茎腐病。", 6),
        "soybean": ("花荚期保持供水，关注蚜虫和食心虫。", 5),
        "vegetable": ("关注霜霉病、白粉病和菜青虫，严格执行安全间隔期。", 4),
        "fruit": ("疏果定果，关注炭疽病、霜霉病和果实蝇。", 5),
    }

    for task_type, title, description, offset, priority in base_rules.get(profile.growth_stage, []):
        tasks.append({
            "task_type": task_type,
            "title": f"{crop}·{title}",
            "description": description,
            "suggested_date": date.today() + timedelta(days=offset),
            "priority": priority,
        })

    adjust, adjust_offset = crop_adjustments.get(profile.main_crop, ("结合田间巡查调整管理措施。", 7))
    tasks.append({
        "task_type": "field",
        "title": f"{crop}·阶段性农事提醒",
        "description": f"当前生育期为{stage}。{adjust}",
        "suggested_date": date.today() + timedelta(days=adjust_offset),
        "priority": "medium",
    })
    return tasks[:days]


# Simplified evidence-based diagnosis rules for an MVP.
DIAGNOSIS_RULES = [
    {
        "keywords": ["黄", "萎蔫", "枯", "茎基腐烂"],
        "diagnosis": "疑似立枯病/猝倒病",
        "confidence": 0.72,
        "severity": "medium",
        "treatment_plan": [
            "及时排水降湿，拔除明显病株并带出田间",
            "选用登记药剂防治，严格按标签剂量和安全间隔期使用",
            "避免密植和偏施氮肥",
        ],
    },
    {
        "keywords": ["斑点", "病斑", "白粉", "锈", "粉层"],
        "diagnosis": "疑似真菌性叶部病害",
        "confidence": 0.68,
        "severity": "medium",
        "treatment_plan": [
            "摘除下部老病叶，增加通风透光",
            "发病初期可选用对应作物登记杀菌剂，按标签使用",
            "雨后及时排水，避免叶面长期结露",
        ],
    },
    {
        "keywords": ["虫", "蚜", "螟", "食叶", "孔洞", "缺刻"],
        "diagnosis": "疑似虫害危害",
        "confidence": 0.75,
        "severity": "medium",
        "treatment_plan": [
            "先确认虫口密度和天敌数量，低于防治指标优先观察",
            "优先物理防治或生物防治；确需用药时选择登记药剂",
            "避免花期用药，严格遵守安全间隔期",
        ],
    },
]

SAFE_REVIEW_TRIGGERS = ["配比", "倍液", "稀释", "用量", "混合", "中毒", "重度"]


def diagnose_pest(crop, symptom):
    """Return a conservative diagnosis and safety boundary."""
    text = (symptom or "").casefold()
    matched = max(
        DIAGNOSIS_RULES,
        key=lambda rule: sum(1 for word in rule["keywords"] if word.casefold() in text),
        default=None,
    )
    keyword_hits = matched and sum(1 for word in matched["keywords"] if word.casefold() in text)

    if not matched or not keyword_hits:
        result = {
            "diagnosis": "需要人工复核",
            "confidence": 0.0,
            "severity": "mild",
            "treatment_plan": [],
            "needs_human_review": True,
            "review_reason": "症状信息不足或超出本地规则库能力，为避免误诊先转人工复核。",
            "status": "pending_review",
        }
    else:
        result = {
            **{k: matched[k] for k in ("diagnosis", "confidence", "severity", "treatment_plan")},
            "needs_human_review": matched["severity"] == "severe" or any(word in text for word in SAFE_REVIEW_TRIGGERS),
            "review_reason": "",
            "status": "draft",
        }
        if result["needs_human_review"]:
            result["review_reason"] = "涉及严重危害、农药用量/配比或安全风险，AI 不直接给药，转人工专家复核。"
            result["treatment_plan"] = []
            result["status"] = "pending_review"

    result["safety_boundary"] = "AI 不提供农药配比、混用和中毒急救建议；此类内容必须由持证技术人员或人工专家确认。"
    return result


SUBSIDY_RULES = [
    {
        "id": "farmland_fertility",
        "name": "耕地地力保护补贴",
        "crops": ["rice", "wheat", "corn", "soybean", "vegetable", "fruit"],
        "min_area": 0,
        "amount": [60, 150],
        "documents": ["身份证", "农村土地承包经营权证", "惠民惠农财政补贴资金“一卡通”账户"],
        "steps": ["村（组）登记造册并公示补贴面积", "乡镇审核", "县级农业农村部门核定", "财政部门发放"],
        "condition": "拥有耕地承包权并实际种地",
    },
    {
        "id": "grain_one_time",
        "name": "实际种粮农民一次性补贴",
        "crops": ["rice", "wheat", "corn", "soybean"],
        "min_area": 0,
        "amount": [10, 50],
        "documents": ["身份证", "土地流转合同（如流转）", "“一卡通”账户"],
        "steps": ["村组申报种粮面积并公示", "乡镇审核", "县级核定后发放"],
        "condition": "实际承担农资成本的种粮主体",
    },
    {
        "id": "soybean_corn",
        "name": "大豆玉米带状复合种植补贴",
        "crops": ["soybean", "corn"],
        "min_area": 5,
        "amount": [150, 300],
        "documents": ["种植面积申报表", "身份证或经营主体证明", "地块位置信息"],
        "steps": ["向村委会或乡镇申报", "按规范播种", "实地核验", "公示后发放"],
        "condition": "在试点县按复合种植模式承担任务",
    },
    {
        "id": "green_control",
        "name": "病虫害统防统治与绿色防控补助",
        "crops": ["rice", "wheat", "corn", "soybean", "vegetable", "fruit"],
        "min_area": 30,
        "amount": [20, 80],
        "documents": ["服务作业合同", "作业面积与用药记录", "服务组织资质证明"],
        "steps": ["向县级农业农村部门备案", "签订服务合同", "实施统防统治", "核验面积后拨付"],
        "condition": "由专业化服务组织统防统治或建设绿色防控基地",
    },
    {
        "id": "machine",
        "name": "农机购置与应用补贴",
        "crops": [],
        "min_area": 0,
        "amount": [500, 5000],
        "documents": ["购机发票", "机具铭牌及合格证照片", "身份证或营业执照", "银行账户信息"],
        "steps": ["购机后提交申请", "农机部门核验机具", "公示", "资金打卡"],
        "condition": "需提供农机购置计划",
    },
]


def match_subsidies(crop, area, needs_machine=False, contracted_land=False):
    matched = []
    for rule in SUBSIDY_RULES:
        crop_ok = not rule["crops"] or crop in rule["crops"]
        area_ok = area >= rule["min_area"]
        machine_ok = rule["id"] != "machine" or needs_machine
        if crop_ok and area_ok and machine_ok:
            low, high = rule["amount"]
            matched.append({
                **{k: rule[k] for k in ("id", "name", "documents", "steps", "condition")},
                "estimated_amount": [round(area * low, 2), round(area * high, 2)],
                "area": area,
                "note": "估算结果仅供申报准备参考，最终以当地当年政策为准。",
            })
    return matched

