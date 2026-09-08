"""
FAISS-based vector store with cosine similarity and metadata support.
"""
import os
import faiss
import numpy as np
import pickle
from pathlib import Path
from rag.embeddings import embed_text

VECTOR_PATH = str(Path(__file__).resolve().parent.parent / "data/processed/faiss.index")
META_PATH = str(Path(__file__).resolve().parent.parent / "data/processed/meta.pkl")

# Minimum cosine similarity score to consider a result relevant
SCORE_THRESHOLD = 0.25


class VectorStore:

    def __init__(self):
        self.index = None
        self.documents = []
        self.metadata = []

    def build(self, docs, metadata=None):
        """Build FAISS index from documents with cosine similarity."""
        os.makedirs(os.path.dirname(VECTOR_PATH), exist_ok=True)
        embeddings = embed_text(docs, show_progress=True)
        dim = embeddings.shape[1]

        # L2-normalise so inner product == cosine similarity
        faiss.normalize_L2(embeddings)

        self.index = faiss.IndexFlatIP(dim)
        self.index.add(embeddings)

        self.documents = docs
        self.metadata = metadata or [{} for _ in docs]

        faiss.write_index(self.index, VECTOR_PATH)

        with open(META_PATH, "wb") as f:
            pickle.dump({
                "documents": self.documents,
                "metadata": self.metadata,
            }, f)

    def load(self):
        """Load a previously built index and metadata from disk."""
        self.index = faiss.read_index(VECTOR_PATH)

        with open(META_PATH, "rb") as f:
            data = pickle.load(f)

        # Backward compatibility: old meta.pkl stored just a list of docs
        if isinstance(data, dict):
            self.documents = data["documents"]
            self.metadata = data.get("metadata", [{} for _ in self.documents])
        else:
            self.documents = data
            self.metadata = [{} for _ in self.documents]

    def search(self, query, k=5, threshold=SCORE_THRESHOLD):
        """
        Search for similar documents.

        Returns list of dicts: {"text", "score", "metadata"}
        sorted by descending similarity.
        """
        q_embedding = embed_text([query])
        faiss.normalize_L2(q_embedding)

        scores, indices = self.index.search(q_embedding, k)

        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx < 0:
                continue
            if score < threshold:
                continue
            results.append({
                "text": self.documents[idx],
                "score": float(score),
                "metadata": self.metadata[idx] if idx < len(self.metadata) else {},
            })

        return results
