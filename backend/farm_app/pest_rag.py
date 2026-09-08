"""Symptom-first RAG diagnosis pipeline for FarmEasy.

Flow: farmer symptom -> agricultural knowledge retrieval -> DeepSeek draft
-> deterministic safety filter. The model is never allowed to bypass the
final safety gate.
"""
import json
import logging
import os
import re

from django.conf import settings

from .decision import CROP_LABELS, SAFE_REVIEW_TRIGGERS

logger = logging.getLogger(__name__)

# Safety words that must never be returned as an executable pesticide
# recommendation. They are checked in both the user's symptom text and the
# model output after generation.
OUTPUT_SAFETY_TRIGGERS = [
    *SAFE_REVIEW_TRIGGERS,
    "倍数", "毫升", "毫克", "克/", "升/", "浓度", "中毒急救", "误服", "皮肤接触",
]

MIN_RAG_SOURCES = 1
MIN_AI_CONFIDENCE = 0.55


def _clean_text(value, max_length=3000):
    return re.sub(r"\s+", " ", str(value or "")).strip()[:max_length]


def retrieve_pest_evidence(crop, location, symptom, top_k=4):
    """Retrieve local crop knowledge and vector-index evidence for a symptom."""
    from rag.crop_kb import find_crop_context
    from rag.rag_pipeline import _get_vector_store

    crop_label = CROP_LABELS.get(crop, crop)
    query = " ".join(part for part in [crop_label, location, symptom] if part)
    sources = []

    crop_context = find_crop_context(query)
    if crop_context:
        sources.append({
            "source": "智农作物知识库",
            "category": "作物百科",
            "score": 1.0,
            "text": _clean_text(crop_context, 1800),
        })

    try:
        vector_results = _get_vector_store().search(query, k=top_k)
    except Exception as exc:
        logger.warning("Pest RAG vector retrieval failed: %s", exc)
        vector_results = []

    for result in vector_results:
        metadata = result.get("metadata", {})
        sources.append({
            "source": metadata.get("source", "农业知识库"),
            "category": metadata.get("category", ""),
            "score": round(float(result.get("score", 0)), 3),
            "text": _clean_text(result.get("text", ""), 1600),
        })
    return sources


def _format_sources(sources):
    blocks = []
    for index, source in enumerate(sources, 1):
        meta = []
        if source.get("category"):
            meta.append(source["category"])
        meta.append(f"相关度 {source.get('score', 0):.2f}")
        blocks.append(
            f"[资料{index} | {source['source']} | {' | '.join(meta)}]\n{source['text']}"
        )
    return "\n\n".join(blocks)


def _parse_model_json(content):
    """Parse a JSON object from a model response without trusting wrappers."""
    if not content:
        return {}
    text = content.strip()
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text, flags=re.IGNORECASE)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, flags=re.DOTALL)
        if not match:
            return {}
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            return {}


def _normalise_ai_result(data, sources):
    if not isinstance(data, dict):
        return None
    diagnosis = _clean_text(data.get("diagnosis"), 150)
    treatment = data.get("treatment_plan") or data.get("treatment") or []
    if isinstance(treatment, str):
        treatment = [treatment]
    treatment = [_clean_text(item, 500) for item in treatment if _clean_text(item)]
    try:
        confidence = min(1.0, max(0.0, float(data.get("confidence", 0))))
    except (TypeError, ValueError):
        confidence = 0.0
    severity = data.get("severity", "medium")
    if severity not in {"mild", "medium", "severe"}:
        severity = "medium"
    region_note = _clean_text(data.get("region_note"), 800)
    if not diagnosis or confidence <= 0:
        return None
    return {
        "diagnosis": diagnosis,
        "confidence": confidence,
        "severity": severity,
        "treatment_plan": treatment[:6],
        "region_note": region_note,
    }


def generate_ai_diagnosis(crop, location, symptom, sources):
    """Call DeepSeek and return a structured draft diagnosis."""
    from rag.llm import DEEPSEEK_TEXT_MODEL, get_client

    if not sources:
        return None, DEEPSEEK_TEXT_MODEL, "知识库未检索到相关资料，已停止生成。"
    if not os.getenv("DEEPSEEK_API_KEY") and not getattr(settings, "DEEPSEEK_API_KEY", None):
        return None, DEEPSEEK_TEXT_MODEL, "未配置 DeepSeek API Key，已降级到本地规则。"

    crop_label = CROP_LABELS.get(crop, crop)
    system_prompt = (
        "你是中国农作物病虫害诊断助手。只根据给定资料生成判断，不编造。"
        "必须只输出一个 JSON 对象，不要输出 Markdown。字段：diagnosis（30字内），"
        "confidence（0-1），severity（mild/medium/severe），treatment_plan（3-5条），"
        "region_note（结合地区和作物的分析，80字内）。"
        "禁止给出农药配比、稀释倍数、具体用量、混用方案或中毒急救方法。"
    )
    user_prompt = (
        f"作物：{crop_label}\n地区：{location or '未填写'}\n"
        f"症状：{_clean_text(symptom, 1500)}\n\n"
        f"知识库资料：\n{_format_sources(sources)}\n\n"
        "请生成结构化诊断建议。若资料不足，confidence 设为 0.4 以下。"
    )
    try:
        response = get_client().chat.completions.create(
            model=DEEPSEEK_TEXT_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.1,
            max_tokens=1200,
            response_format={"type": "json_object"},
        )
    except Exception as exc:
        logger.warning("DeepSeek pest diagnosis failed: %s", exc)
        return None, DEEPSEEK_TEXT_MODEL, f"DeepSeek 调用失败，已降级到本地规则：{exc}"

    data = _parse_model_json(response.choices[0].message.content)
    result = _normalise_ai_result(data, sources)
    if not result:
        return None, DEEPSEEK_TEXT_MODEL, "DeepSeek 返回结构不完整，已降级到本地规则。"
    return result, DEEPSEEK_TEXT_MODEL, ""


def apply_safety_filter(user_symptom, result, sources):
    """Deterministic post-generation gate: model output never bypasses it."""
    symptom_text = (user_symptom or "").casefold()
    joined_plan = " ".join(result.get("treatment_plan", []))
    triggered_word = next(
        (word for word in OUTPUT_SAFETY_TRIGGERS if word.casefold() in symptom_text or word.casefold() in joined_plan),
        None,
    )

    reasons = []
    if len(sources) < MIN_RAG_SOURCES:
        reasons.append("知识库未检索到足够依据，为避免误诊先转人工复核。")
    if result.get("confidence", 0) < MIN_AI_CONFIDENCE:
        reasons.append(f"模型置信度低于 {MIN_AI_CONFIDENCE:.0%}，需人工确认。")
    if result.get("severity") == "severe":
        reasons.append("判断为重度发生，防治风险较高，需人工复核。")
    if triggered_word:
        reasons.append(f"涉及安全关键词“{triggered_word}”，AI 不直接给出执行方案。")

    filtered = {**result}
    if reasons:
        filtered.update({
            "treatment_plan": [],
            "needs_human_review": True,
            "review_reason": "；".join(reasons),
            "status": "pending_review",
        })
    else:
        filtered.update({
            "needs_human_review": False,
            "review_reason": "",
            "status": "draft",
            "safety_filter": "通过：未检出配比、用量、混用或中毒风险关键词。",
        })
    filtered["safety_boundary"] = (
        "AI 不提供农药配比、混用和中毒急救建议；此类内容必须由持证技术人员或人工专家确认。"
    )
    return filtered


def diagnose_pest_with_rag(crop, symptom, location=""):
    """Full symptom -> RAG -> DeepSeek -> safety-filter pipeline."""
    from .decision import diagnose_pest

    symptom = _clean_text(symptom)
    sources = retrieve_pest_evidence(crop, location, symptom)
    ai_result, model_name, degradation_reason = generate_ai_diagnosis(
        crop, location, symptom, sources
    )

    if ai_result:
        result = apply_safety_filter(symptom, ai_result, sources)
        result.update({
            "rag_sources": sources,
            "diagnosis_engine": "rag_deepseek_safety_filter",
            "model_name": model_name,
        })
        return result

    fallback = diagnose_pest(crop, symptom)
    fallback.update({
        "rag_sources": sources,
        "diagnosis_engine": "rag_safety_filter_fallback",
        "model_name": model_name,
        "degradation_reason": degradation_reason,
        "region_note": "",
        "safety_filter": "DeepSeek 未生成可用结果，已使用本地规则并保留人工复核。",
    })
    if sources:
        # A rule fallback is evidence-informed, but still not a direct model
        # diagnosis. Keep it conservative when evidence is thin.
        if len(sources) < MIN_RAG_SOURCES or fallback.get("confidence", 0) < MIN_AI_CONFIDENCE:
            fallback.update({
                "treatment_plan": [],
                "needs_human_review": True,
                "status": "pending_review",
                "review_reason": fallback.get("review_reason") or "本地规则置信度不足，需人工复核。",
            })
    return fallback
