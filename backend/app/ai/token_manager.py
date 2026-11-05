import logging
import datetime
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import AIGenerationLog

logger = logging.getLogger("jobpilot.ai.token_manager")

# Cost per 1k tokens in USD (Input / Output blended estimate)
MODEL_PRICING: Dict[str, float] = {
    "gpt-4o": 0.0050,
    "gpt-4o-mini": 0.0003,
    "gemini-1.5-flash": 0.00015,
    "gemini-1.5-pro": 0.0025,
    "gemini-2.0-flash": 0.0002,
    "claude-3-5-sonnet-20241022": 0.0060,
    "claude-3-5-haiku-20241022": 0.0010,
    "built-in": 0.0,
}

class TokenManager:
    """
    Tracks and estimates token consumption, costs, and records AI telemetry.
    """

    @staticmethod
    def estimate_tokens(text: str) -> int:
        if not text:
            return 0
        # Average English token length is ~4 characters
        return max(1, len(text) // 4)

    @staticmethod
    def estimate_cost(tokens: int, model_name: str) -> float:
        rate = MODEL_PRICING.get(model_name.lower(), 0.0005)
        return round((tokens / 1000.0) * rate, 6)

    @staticmethod
    async def log_generation(
        db: Optional[AsyncSession],
        user_id: Optional[str],
        prompt_type: str,
        provider_used: str,
        model_name: Optional[str],
        tokens_used: int,
    ) -> Optional[AIGenerationLog]:
        if not db or not user_id:
            return None
        try:
            log_entry = AIGenerationLog(
                user_id=user_id,
                prompt_type=prompt_type,
                provider_used=provider_used,
                model_name=model_name or provider_used,
                tokens_used=tokens_used,
                created_at=datetime.datetime.now(datetime.timezone.utc),
            )
            db.add(log_entry)
            await db.flush()
            return log_entry
        except Exception as e:
            logger.warning(f"Could not persist AIGenerationLog: {e}")
            return None

token_manager = TokenManager()

