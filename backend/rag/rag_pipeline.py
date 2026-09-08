"""
RAG pipeline: retrieval, re-ranking, and LLM answer generation.

All heavy resources (DeepSeek client, VectorStore) are lazy-loaded
on first use to avoid slow server startup.
"""
from rag.prompts import FARMER_SYSTEM_PROMPT, FARMER_USER_PROMPT, get_season_info
from rag.web_search import web_search
from rag.crop_kb import find_crop_context
from rag.llm import get_client, DEEPSEEK_TEXT_MODEL
import re
import logging
import os
from pathlib import Path

logger = logging.getLogger(__name__)

# Number of candidates to retrieve before re-ranking
RETRIEVE_K = 5
# Maximum number of chunks to include in the final context
TOP_N = 3
# Below this many relevant chunks, flag as low confidence
LOW_CONFIDENCE_THRESHOLD = 2
# Below this average score, trigger web search fallback
WEB_SEARCH_SCORE_THRESHOLD = 0.35
# Number of prior messages to include as conversation history (10 turns)
MAX_HISTORY_MESSAGES = 20

# ── Lazy singletons ──────────────────────────────────────────
_vector_store = None


def _get_vector_store():
    """Return (and cache) the loaded VectorStore."""
    global _vector_store
    if _vector_store is None:
        if os.getenv("VERCEL") or not (Path(__file__).resolve().parent.parent / "data/processed/faiss.index").exists():
            raise FileNotFoundError("Vector index is unavailable in this deployment")
        from rag.vector_store import VectorStore
        store = VectorStore()
        store.load()
        _vector_store = store
    return _vector_store


# ── Helpers ──────────────────────────────────────────────────

def _format_context(results):
    """Format retrieved chunks into a context string with source citations."""
    blocks = []
    for i, r in enumerate(results, 1):
        meta = r.get("metadata", {})
        source = meta.get("source", "Unknown")
        category = meta.get("category", "")
        page = meta.get("page", "")

        header = f"[Chunk {i} | Source: {source}"
        if category:
            header += f" | Category: {category}"
        if page:
            header += f" | Page: {page}"
        header += f" | Relevance: {r['score']:.2f}]"

        blocks.append(f"{header}\n{r['text']}")

    return "\n\n".join(blocks)


def _determine_confidence(results):
    """Determine confidence level based on retrieval quality."""
    if len(results) == 0:
        return "LOW"
    avg_score = sum(r["score"] for r in results) / len(results)
    if len(results) >= LOW_CONFIDENCE_THRESHOLD and avg_score > 0.45:
        return "HIGH"
    if len(results) >= 1 and avg_score > 0.30:
        return "MEDIUM"
    return "LOW"


def _strip_markdown(text):
    """Remove markdown formatting symbols from LLM output."""
    if not text:
        return text
    # Remove all asterisks and hashes completely
    text = text.replace('*', '')
    text = text.replace('#', '')
    # Remove underscore emphasis: ___ , __ (keep single _ for words like moong_dal if any, but replace multiple)
    text = re.sub(r'_{2,}', '', text)
    # Remove inline backticks
    text = text.replace('`', '')
    return text.strip()


def get_answer(question, chat_history=None):
    """
    Full RAG pipeline:
    1. Retrieve k=5 candidates from vector store
    2. Take top 3 by score (already filtered by threshold in vector_store)
    3. Format context with metadata
    4. Generate answer with system + user prompts
    5. Inject conversation history (if any) for follow-up awareness
    6. Return answer, retrieved chunks with metadata, and confidence level
    """
    client = get_client()

    # --- Retrieve & re-rank ---
    try:
        results = _get_vector_store().search(question, k=RETRIEVE_K)
    except (OSError, ImportError, RuntimeError):
        logger.warning("Vector retrieval unavailable; using crop knowledge and web context")
        results = []

    # Take the top-N (already sorted by score from FAISS)
    top_results = results[:TOP_N]

    # --- Determine confidence ---
    confidence = _determine_confidence(top_results)

    # --- Format context ---
    context = _format_context(top_results)

    if not context.strip():
        context = "No relevant information was found in the knowledge base."

    # --- 作物知识库关键词层：问题命中作物名时，注入该作物的完整中文知识 ---
    crop_context = find_crop_context(question)
    if crop_context:
        context = (
            "【智农作物知识库 · 站内权威资料（与问题直接相关，优先采用）】\n"
            "---\n"
            f"{crop_context}\n"
            "---\n\n"
            + context
        )
        # 站内权威资料已命中，置信度直接取高
        confidence = "HIGH"

    # --- Web search fallback for low-confidence answers ---
    web_context = ""
    web_supplemented = False
    if confidence in ("LOW", "MEDIUM"):
        avg_score = (
            sum(r["score"] for r in top_results) / len(top_results)
            if top_results
            else 0.0
        )
        if avg_score < WEB_SEARCH_SCORE_THRESHOLD:
            logger.info(
                f"Low local confidence ({confidence}, avg={avg_score:.2f}), "
                f"fetching web context for: {question[:80]}"
            )
            try:
                web_context = web_search(question)
                if web_context:
                    web_supplemented = True
            except Exception as e:
                logger.warning(f"Web search fallback failed: {e}")
                web_context = ""

    # --- Build web context section for the prompt ---
    if web_context:
        web_context_section = (
            "\nSUPPLEMENTARY WEB CONTEXT (use to enhance your answer):\n"
            "---\n"
            f"{web_context}\n"
            "---\n"
        )
    else:
        web_context_section = ""

    # --- Build prompt ---
    user_prompt = FARMER_USER_PROMPT.format(
        context=context,
        web_context_section=web_context_section,
        question=question,
    )

    # --- Build messages list with optional history ---
    current_date, current_season = get_season_info()
    system_prompt = FARMER_SYSTEM_PROMPT.format(
        current_date=current_date,
        current_season=current_season,
    )
    messages = [{"role": "system", "content": system_prompt}]

    # Insert conversation history (capped at last 20 messages = 10 turns)
    if chat_history:
        messages.extend(chat_history[-MAX_HISTORY_MESSAGES:])

    messages.append({"role": "user", "content": user_prompt})

    # --- Call LLM ---
    response = client.chat.completions.create(
        model=DEEPSEEK_TEXT_MODEL,
        messages=messages,
        temperature=0.15,
        max_tokens=2048,
    )

    answer = response.choices[0].message.content

    # --- Strip markdown formatting from the answer ---
    answer = _strip_markdown(answer)

    # --- Build structured retrieved data ---
    retrieved = [
        {
            "text": r["text"][:300],           # truncated for API response
            "score": round(r["score"], 3),
            "source": r.get("metadata", {}).get("source", "Unknown"),
            "category": r.get("metadata", {}).get("category", ""),
        }
        for r in top_results
    ]

    return answer, retrieved, confidence, web_supplemented
