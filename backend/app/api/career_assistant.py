from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import desc
from typing import List, Optional
import datetime

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import (
    User, Profile, Job, JobMatch, Conversation, ConversationMessage
)
from app.schemas.schemas import (
    CareerChatRequest, CareerChatResponse,
    ConversationCreate, ConversationOut,
    ConversationMessageCreate, ConversationMessageOut
)
from app.ai.ai_orchestrator import ai_orchestrator
from app.services.ai_service import ai_service

router = APIRouter(prefix="/assistant", tags=["AI Career Assistant"])

# ----------------- 1. Multi-turn Persistent Conversations -----------------

@router.get("/conversations", response_model=List[ConversationOut])
async def list_conversations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns all career advisor conversations for the authenticated candidate.
    """
    q = (
        select(Conversation)
        .where(Conversation.user_id == current_user.id)
        .order_by(desc(Conversation.updated_at))
        .options(selectinload(Conversation.messages))
    )
    res = await db.execute(q)
    return res.scalars().all()

@router.post("/conversations", response_model=ConversationOut)
async def create_conversation(
    req: ConversationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Creates a new multi-turn career advisor conversation session.
    """
    conv = Conversation(
        user_id=current_user.id,
        job_id=req.job_id,
        title=req.title or "Career Advisory Chat",
    )
    db.add(conv)
    await db.commit()
    await db.refresh(conv)

    # Initial assistant greeting
    initial_msg = ConversationMessage(
        conversation_id=conv.id,
        role="assistant",
        content=f"Hello {current_user.full_name}! I am your AI Career Copilot. How can I help guide your job search, ATS resume tailoring, or interview preparation today?",
        provider_used="built-in",
        model_name="copilot-advisor",
        tokens_used=40
    )
    db.add(initial_msg)
    await db.commit()
    await db.refresh(conv)
    return conv

@router.get("/conversations/{conversation_id}", response_model=ConversationOut)
async def get_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    q = (
        select(Conversation)
        .where(Conversation.id == conversation_id, Conversation.user_id == current_user.id)
        .options(selectinload(Conversation.messages))
    )
    res = await db.execute(q)
    conv = res.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation session not found")
    return conv

@router.post("/conversations/{conversation_id}/messages", response_model=ConversationMessageOut)
async def send_conversation_message(
    conversation_id: str,
    req: ConversationMessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Appends candidate message, executes AI reasoning with profile and job grounding,
    persists assistant response, and returns assistant message.
    """
    q = select(Conversation).where(Conversation.id == conversation_id, Conversation.user_id == current_user.id).options(selectinload(Conversation.messages))
    res = await db.execute(q)
    conv = res.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation session not found")

    # Save user message
    user_msg = ConversationMessage(
        conversation_id=conv.id,
        role="user",
        content=req.content
    )
    db.add(user_msg)
    await db.flush()

    # Load candidate profile
    prof_q = select(Profile).where(Profile.user_id == current_user.id).options(
        selectinload(Profile.skills),
        selectinload(Profile.experiences),
        selectinload(Profile.educations),
        selectinload(Profile.projects)
    )
    prof_res = await db.execute(prof_q)
    profile = prof_res.scalar_one_or_none()

    profile_dict = {
        "full_name": current_user.full_name,
        "summary": profile.summary if profile else "",
        "years_of_experience": profile.years_of_experience if profile else 2.0,
        "preferred_locations": profile.preferred_locations if profile else [],
        "target_job_titles": profile.target_job_titles if profile else [],
        "work_mode_preference": profile.work_mode_preference if profile else "Remote",
        "skills": [{"name": s.name, "category": s.category, "proficiency_level": s.proficiency_level} for s in profile.skills] if profile else [],
        "experiences": [{"company": e.company, "position": e.position, "description": e.description, "bullet_points": e.bullet_points or []} for e in profile.experiences] if profile else [],
        "educations": [{"institution": ed.institution, "degree": ed.degree, "field_of_study": ed.field_of_study} for ed in profile.educations] if profile else []
    }

    job_dict = None
    if conv.job_id:
        job_q = select(Job).where(Job.id == conv.job_id).options(selectinload(Job.analysis))
        job_res = await db.execute(job_q)
        job = job_res.scalar_one_or_none()
        if job:
            job_dict = {
                "id": job.id,
                "title": job.title,
                "company": job.company,
                "location": job.location,
                "work_mode": job.work_mode,
                "raw_description": job.raw_description
            }

    # History formatting
    history = [{"role": m.role, "content": m.content} for m in conv.messages[-6:]]

    ai_reply = await ai_orchestrator.chat_with_advisor(
        message=req.content,
        profile_dict=profile_dict,
        job_dict=job_dict,
        history=history,
        db=db,
        user_id=current_user.id
    )

    assistant_text = ai_reply.get("response") or ai_reply.get("reply", "I am here to guide your career path.")
    assistant_msg = ConversationMessage(
        conversation_id=conv.id,
        role="assistant",
        content=assistant_text,
        provider_used=ai_reply.get("ai_provider", "built-in"),
        model_name=ai_reply.get("model_used", "copilot-advisor"),
        tokens_used=ai_reply.get("tokens_used", 150)
    )
    db.add(assistant_msg)
    conv.updated_at = datetime.datetime.now(datetime.timezone.utc)
    await db.commit()
    await db.refresh(assistant_msg)

    return assistant_msg

# ----------------- 2. Legacy / Direct Chat Route (Full Backward Compatibility) -----------------

@router.post("/chat", response_model=CareerChatResponse)
async def chat_with_assistant(
    req: CareerChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    prof_q = select(Profile).where(Profile.user_id == current_user.id).options(
        selectinload(Profile.skills),
        selectinload(Profile.experiences),
        selectinload(Profile.educations),
        selectinload(Profile.projects)
    )
    prof_res = await db.execute(prof_q)
    profile = prof_res.scalar_one_or_none()

    profile_dict = {
        "full_name": current_user.full_name,
        "summary": profile.summary if profile else "",
        "years_of_experience": profile.years_of_experience if profile else 2.0,
        "preferred_locations": profile.preferred_locations if profile else [],
        "target_job_titles": profile.target_job_titles if profile else [],
        "work_mode_preference": profile.work_mode_preference if profile else "Remote",
        "skills": [{"name": s.name, "category": s.category, "proficiency_level": s.proficiency_level} for s in profile.skills] if profile else [],
        "experiences": [{"company": e.company, "position": e.position, "description": e.description} for e in profile.experiences] if profile else [],
        "educations": [{"institution": ed.institution, "degree": ed.degree, "field_of_study": ed.field_of_study} for ed in profile.educations] if profile else []
    }

    job_dict = None
    if req.job_id:
        job_q = select(Job).where(Job.id == req.job_id).options(
            selectinload(Job.analysis),
            selectinload(Job.matches)
        )
        job_res = await db.execute(job_q)
        job = job_res.scalar_one_or_none()
        if job:
            user_match = next((m for m in job.matches if m.user_id == current_user.id), None)
            job_dict = {
                "id": job.id,
                "title": job.title,
                "company": job.company,
                "location": job.location,
                "work_mode": job.work_mode,
                "salary": f"${job.salary_min:,.0f} - ${job.salary_max:,.0f}" if job.salary_min and job.salary_max else None,
                "match_score": user_match.overall_score if user_match else None,
                "matched_skills": user_match.matched_skills if user_match else [],
                "missing_skills": user_match.missing_skills if user_match else (job.analysis.required_skills if job.analysis else []),
                "required_skills": job.analysis.required_skills if job.analysis else [],
                "responsibilities": job.analysis.responsibilities if job.analysis else [],
                "raw_description": job.raw_description
            }

    # Fetch top matched jobs for contextual intelligence
    matches_q = (
        select(JobMatch, Job)
        .join(Job, JobMatch.job_id == Job.id)
        .where(JobMatch.user_id == current_user.id)
        .order_by(desc(JobMatch.overall_score))
        .limit(5)
    )
    matches_res = await db.execute(matches_q)
    matched_jobs = []
    for match, j in matches_res.all():
        matched_jobs.append({
            "id": j.id,
            "title": j.title,
            "company": j.company,
            "location": j.location,
            "work_mode": j.work_mode,
            "salary": f"${j.salary_min:,.0f} - ${j.salary_max:,.0f}" if j.salary_min and j.salary_max else None,
            "overall_score": match.overall_score,
            "matched_skills": match.matched_skills or [],
            "missing_skills": match.missing_skills or [],
            "explanation": match.explanation
        })

    if not matched_jobs:
        jobs_q = select(Job).where(Job.is_active == True).order_by(desc(Job.date_posted)).limit(5)
        jobs_res = await db.execute(jobs_q)
        for j in jobs_res.scalars().all():
            matched_jobs.append({
                "id": j.id,
                "title": j.title,
                "company": j.company,
                "location": j.location,
                "work_mode": j.work_mode,
                "salary": f"${j.salary_min:,.0f} - ${j.salary_max:,.0f}" if j.salary_min and j.salary_max else None,
                "overall_score": 85.0,
                "matched_skills": [],
                "missing_skills": [],
                "explanation": "Active high-demand open position in your domain."
            })

    chat_res = await ai_service.career_chat(
        message=req.message,
        profile=profile_dict,
        job=job_dict,
        matched_jobs=matched_jobs,
        history=req.conversation_history
    )

    return CareerChatResponse(
        reply=chat_res["reply"],
        action_suggestions=chat_res.get("action_suggestions", []),
        action_type=chat_res.get("action_type"),
        data=chat_res.get("data")
    )
