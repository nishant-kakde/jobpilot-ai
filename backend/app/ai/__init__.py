"""
JobPilot AI Unified AI Intelligence Engine.
Modular, explainable, multi-provider architecture with strict anti-hallucination guardrails.
"""

from app.ai.ai_orchestrator import AIOrchestrator, ai_orchestrator
from app.ai.provider_manager import ProviderManager, provider_manager
from app.ai.prompt_manager import PromptManager, prompt_manager
from app.ai.context_manager import ContextManager, context_manager
from app.ai.hallucination_guard import HallucinationGuard, hallucination_guard
from app.ai.token_manager import TokenManager, token_manager
from app.ai.embeddings import EmbeddingEngine, embedding_engine

__all__ = [
    "AIOrchestrator",
    "ai_orchestrator",
    "ProviderManager",
    "provider_manager",
    "PromptManager",
    "prompt_manager",
    "ContextManager",
    "context_manager",
    "HallucinationGuard",
    "hallucination_guard",
    "TokenManager",
    "token_manager",
    "EmbeddingEngine",
    "embedding_engine",
]

