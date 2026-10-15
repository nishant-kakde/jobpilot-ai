from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import User, Profile, Job
from app.schemas.schemas import CareerChatRequest, CareerChatResponse
from app.services.ai_service import ai_service

router = APIRouter(prefix="/assistant", tags=["AI Career Assistant"])

@router.post("/chat", response_model=CareerChatResponse)
async def chat_with_assistant(
    req: CareerChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    prof_q = select(Profile).where(Profile.user_id == current_user.id).options(
        selectinload(Profile.skills),
        selectinload(Profile.experiences),
        selectinload(Profile.educations)
    )
    prof_res = await db.execute(prof_q)
    profile = prof_res.scalar_one_or_none()

    profile_dict = {
        "full_name": current_user.full_name,
        "years_of_experience": profile.years_of_experience if profile else 2.0,
        "skills": [{"name": s.name} for s in profile.skills] if profile else []
    }

    job_dict = None
    if req.job_id:
        job_q = select(Job).where(Job.id == req.job_id)
        job_res = await db.execute(job_q)
        job = job_res.scalar_one_or_none()
        if job:
            job_dict = {"title": job.title, "company": job.company, "location": job.location}

    chat_res = await ai_service.career_chat(
        message=req.message,
        profile=profile_dict,
        job=job_dict,
        history=req.conversation_history
    )

    return CareerChatResponse(
        reply=chat_res["reply"],
        action_suggestions=chat_res.get("action_suggestions", []),
        action_type=chat_res.get("action_type"),
        data=chat_res.get("data")
    )
