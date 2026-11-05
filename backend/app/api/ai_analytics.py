from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.config import settings
from app.models.models import User, AIProviderSetting, AIGenerationLog
from app.schemas.schemas import AIProviderSettingUpdate, AIProviderSettingOut, AIUsageStatsOut
from app.ai.token_manager import token_manager, MODEL_PRICING

router = APIRouter(prefix="/ai", tags=["AI Configuration & Analytics"])

@router.get("/settings", response_model=AIProviderSettingOut)
async def get_ai_settings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns user's AI provider preferences and encryption status of custom keys.
    """
    q = select(AIProviderSetting).where(AIProviderSetting.user_id == current_user.id)
    res = await db.execute(q)
    setting = res.scalar_one_or_none()

    if not setting:
        return AIProviderSettingOut(
            selected_provider=settings.AI_PROVIDER.lower(),
            openai_model=settings.OPENAI_MODEL,
            gemini_model=settings.GEMINI_MODEL,
            anthropic_model=settings.ANTHROPIC_MODEL,
            has_custom_api_key=False,
            is_active=True
        )

    return AIProviderSettingOut(
        selected_provider=setting.selected_provider,
        openai_model=setting.openai_model,
        gemini_model=setting.gemini_model,
        anthropic_model=setting.anthropic_model,
        has_custom_api_key=bool(setting.custom_api_key_encrypted),
        is_active=True
    )

@router.put("/settings", response_model=AIProviderSettingOut)
async def update_ai_settings(
    req: AIProviderSettingUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Updates preferred AI provider, model overrides, and securely stores custom API keys.
    """
    q = select(AIProviderSetting).where(AIProviderSetting.user_id == current_user.id)
    res = await db.execute(q)
    setting = res.scalar_one_or_none()

    if not setting:
        setting = AIProviderSetting(user_id=current_user.id)
        db.add(setting)

    setting.selected_provider = req.selected_provider.lower()
    if req.openai_model:
        setting.openai_model = req.openai_model
    if req.gemini_model:
        setting.gemini_model = req.gemini_model
    if req.anthropic_model:
        setting.anthropic_model = req.anthropic_model
    if req.custom_api_key:
        setting.custom_api_key_encrypted = req.custom_api_key  # Auto-encrypted by EncryptedString

    await db.commit()
    await db.refresh(setting)

    return AIProviderSettingOut(
        selected_provider=setting.selected_provider,
        openai_model=setting.openai_model,
        gemini_model=setting.gemini_model,
        anthropic_model=setting.anthropic_model,
        has_custom_api_key=bool(setting.custom_api_key_encrypted),
        is_active=True
    )

@router.get("/usage", response_model=AIUsageStatsOut)
async def get_ai_usage_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Aggregates user's token consumption, generation counts, and cost estimates.
    """
    q = select(AIGenerationLog).where(AIGenerationLog.user_id == current_user.id)
    res = await db.execute(q)
    logs = res.scalars().all()

    total_tokens = sum(l.tokens_used for l in logs)
    total_cost = 0.0
    breakdown_by_prompt: Dict[str, int] = {}
    breakdown_by_provider: Dict[str, int] = {}

    for l in logs:
        # Tally prompt types
        ptype = l.prompt_type or "general"
        breakdown_by_prompt[ptype] = breakdown_by_prompt.get(ptype, 0) + 1

        # Tally providers
        prov = l.provider_used or "built-in"
        breakdown_by_provider[prov] = breakdown_by_provider.get(prov, 0) + 1

        # Calculate cost
        cost = token_manager.estimate_cost(l.tokens_used, l.model_name or prov)
        total_cost += cost

    return AIUsageStatsOut(
        total_tokens_consumed=total_tokens,
        total_estimated_cost_usd=round(total_cost, 4),
        active_provider=settings.AI_PROVIDER,
        total_generations_count=len(logs),
        breakdown_by_prompt_type=breakdown_by_prompt,
        breakdown_by_provider=breakdown_by_provider
    )

