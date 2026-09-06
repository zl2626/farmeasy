"""
Text embedding utilities using SentenceTransformer.

Uses batch encoding with progress reporting for large corpora.
Model is lazy-loaded on first use to avoid slow server startup.
"""
from sentence_transformers import SentenceTransformer
import numpy as np
import os

# 默认使用多语言嵌入模型，同时支持中文和英文语料的语义检索
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "paraphrase-multilingual-MiniLM-L12-v2")

_model = None


def _get_model():
    """Load the SentenceTransformer model on first use (lazy singleton)."""
    global _model
    if _model is None:
        _model = SentenceTransformer(EMBEDDING_MODEL)
    return _model


def embed_text(texts, batch_size=256, show_progress=False):
    """
    Encode a list of texts into embeddings.

    Args:
        texts: list of strings to embed
        batch_size: number of texts to encode at once (reduces peak memory)
        show_progress: if True, show a progress bar

    Returns:
        numpy array of shape (len(texts), embedding_dim)
    """
    return _get_model().encode(
        texts,
        convert_to_numpy=True,
        batch_size=batch_size,
        show_progress_bar=show_progress,
    )