"""
DeepSeek LLM client (OpenAI-compatible API).

Single shared client for the AI assistant (text + vision).
Models can be overridden via environment variables:
- DEEPSEEK_TEXT_MODEL   (default: deepseek-v4-flash-vision-exp)
- DEEPSEEK_VISION_MODEL (default: same as text model)
- DEEPSEEK_BASE_URL     (default: https://api.deepseek.com)
"""
import os

from openai import OpenAI


class AIConfigurationError(Exception):
    pass

DEEPSEEK_BASE_URL = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
DEEPSEEK_TEXT_MODEL = os.getenv("DEEPSEEK_TEXT_MODEL", "deepseek-v4-flash-vision-exp")
DEEPSEEK_VISION_MODEL = os.getenv("DEEPSEEK_VISION_MODEL", DEEPSEEK_TEXT_MODEL)

_client = None


def get_client():
    """Return (and cache) the DeepSeek (OpenAI-compatible) client."""
    global _client
    if _client is None:
        if not os.getenv("DEEPSEEK_API_KEY", "").strip():
            raise AIConfigurationError("DEEPSEEK_API_KEY is not configured")
        _client = OpenAI(
            api_key=os.getenv("DEEPSEEK_API_KEY", ""),
            base_url=DEEPSEEK_BASE_URL,
            timeout=45.0,
            max_retries=0,
        )
    return _client
