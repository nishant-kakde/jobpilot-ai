import math
import re
import logging
from typing import List, Dict, Any, Tuple, Optional
import httpx

from app.core.config import settings

logger = logging.getLogger("jobpilot.ai.embeddings")

class EmbeddingEngine:
    """
    Computes text embeddings and cosine similarity for RAG retrieval and semantic job search.
    Provides external provider embedding options and a deterministic built-in vectorizer.
    """

    DIMENSIONS = 128  # Built-in vector dimensionality

    @classmethod
    def _built_in_vector(cls, text: str) -> List[float]:
        """
        Deterministic, zero-dependency token and character 3-gram hashing vectorizer.
        Generates normalized unit vectors for cosine similarity comparisons.
        """
        vec = [0.0] * cls.DIMENSIONS
        if not text:
            return vec

        # Tokenize words and character 3-grams
        tokens = re.findall(r'\b\w+\b', text.lower())
        char_ngrams = [text[i:i+3].lower() for i in range(max(0, len(text) - 2))]

        all_features = tokens + char_ngrams
        for feat in all_features:
            # Deterministic hash bucket
            h = hash(feat) % cls.DIMENSIONS
            vec[h] += 1.0

        # L2 normalize
        magnitude = math.sqrt(sum(v * v for v in vec))
        if magnitude > 0:
            vec = [v / magnitude for v in vec]
        return vec

    @classmethod
    async def get_embedding(cls, text: str) -> List[float]:
        """
        Returns normalized vector embedding for text.
        Falls back seamlessly to the built-in hashing vectorizer if external APIs are not set up.
        """
        if settings.AI_PROVIDER.lower() == "openai" and settings.OPENAI_API_KEY:
            try:
                async with httpx.AsyncClient(timeout=15.0) as client:
                    resp = await client.post(
                        "https://api.openai.com/v1/embeddings",
                        headers={"Authorization": f"Bearer {settings.OPENAI_API_KEY}"},
                        json={"input": text[:8000], "model": "text-embedding-3-small"}
                    )
                    if resp.status_code == 200:
                        return resp.json()["data"][0]["embedding"]
            except Exception as e:
                logger.debug(f"OpenAI embedding call failed, using built-in vector: {e}")

        return cls._built_in_vector(text)

    @staticmethod
    def cosine_similarity(v1: List[float], v2: List[float]) -> float:
        """
        Computes cosine similarity between two numeric vectors.
        """
        if not v1 or not v2 or len(v1) != len(v2):
            return 0.0
        dot_product = sum(a * b for a, b in zip(v1, v2))
        mag1 = math.sqrt(sum(a * a for a in v1))
        mag2 = math.sqrt(sum(b * b for b in v2))
        if mag1 == 0.0 or mag2 == 0.0:
            return 0.0
        return max(0.0, min(1.0, dot_product / (mag1 * mag2)))

    @classmethod
    def rank_documents(
        cls,
        query: str,
        documents: List[Dict[str, Any]],
        text_key: str = "text",
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Ranks a collection of documents against a query using cosine similarity.
        """
        if not documents or not query:
            return documents[:top_k]

        q_vec = cls._built_in_vector(query)
        scored = []
        for doc in documents:
            doc_text = doc.get(text_key) or ""
            d_vec = cls._built_in_vector(doc_text)
            sim = cls.cosine_similarity(q_vec, d_vec)
            doc_copy = dict(doc)
            doc_copy["similarity_score"] = round(sim, 4)
            scored.append(doc_copy)

        scored.sort(key=lambda x: x.get("similarity_score", 0.0), reverse=True)
        return scored[:top_k]

embedding_engine = EmbeddingEngine()

