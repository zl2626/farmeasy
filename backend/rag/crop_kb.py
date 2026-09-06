"""
智农作物知识库关键词检索层。

中文问题走向量检索时命中率不佳（嵌入模型对中文/英文混排语料的跨语言
语义匹配偏弱），因此在这里加一层精确关键词匹配：问题中出现作物名或
别名时，直接返回该作物的完整中文知识文本，注入到提示词上下文中，
保证 AI 助手对站点内收录作物的回答准确可靠。
"""
import json
import os

from django.conf import settings

KB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "zhinong_crops.json")

_crops = None


def _load_crops():
    """Lazy-load the crop knowledge index."""
    global _crops
    if _crops is None:
        try:
            with open(KB_PATH, "r", encoding="utf-8") as f:
                _crops = json.load(f)
        except (OSError, json.JSONDecodeError):
            _crops = []
    return _crops


def find_crop_context(question, max_crops=2):
    """
    Return the full knowledge text of crops whose name/alias appears in the
    question, or "" if none match. At most `max_crops` entries are returned.
    """
    if not question:
        return ""
    q = question.strip()
    matches = []
    for crop in _load_crops():
        names = [crop.get("name", "")] + list(crop.get("aliases", []))
        if any(n and n in q for n in names):
            matches.append(crop["text"])
        if len(matches) >= max_crops:
            break
    return "\n\n".join(matches)
