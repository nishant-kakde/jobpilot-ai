import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import User, Profile, Job, ApplicationAnswer
from app.schemas.schemas import ApplicationAnswerOut, ApplicationAnswerUpdate, GenerateAnswersRequest
from app.services.ai_service import ai_service

router = APIRouter(prefix="/applications/questions", tags=["Application Question Assistant"])

@router.post("/generate", response_model=List[ApplicationAnswerOut])
async def generate_answers(
    req: GenerateAnswersRequest,
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

    job_dict = {"title": "the position", "company": "the employer"}
    if req.job_id:
        job_q = select(Job).where(Job.id == req.job_id)
        job_res = await db.execute(job_q)
        job = job_res.scalar_one_or_none()
        if job:
            job_dict = {"title": job.title, "company": job.company}

    profile_dict = {
        "full_name": current_user.full_name,
        "years_of_experience": profile.years_of_experience if profile else 2.0,
        "notice_period_days": profile.notice_period_days if profile else 30,
        "work_mode_preference": profile.work_mode_preference if profile else "Remote",
        "expected_salary_min": profile.expected_salary_min if profile else None,
        "salary_currency": profile.salary_currency if profile else "USD",
        "skills": [{"name": s.name} for s in profile.skills] if profile else []
    }

    generated_list = await ai_service.generate_application_answers(
        profile=profile_dict,
        job=job_dict,
        questions=req.questions
    )

    created_records = []
    for item in generated_list:
        ans_record = ApplicationAnswer(
            user_id=current_user.id,
            job_id=req.job_id,
            question_text=item["question_text"],
            suggested_answer=item["suggested_answer"],
            category=item["category"],
            confidence_level=item["confidence_level"],
            requires_manual_review=item["requires_manual_review"]
        )
        db.add(ans_record)
        created_records.append(ans_record)

    await db.commit()
    for rec in created_records:
        await db.refresh(rec)
    return created_records

@router.get("", response_model=List[ApplicationAnswerOut])
async def list_answers(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    query = select(ApplicationAnswer).where(ApplicationAnswer.user_id == current_user.id).order_by(ApplicationAnswer.created_at.desc())
    res = await db.execute(query)
    return res.scalars().all()

@router.put("/{id}", response_model=ApplicationAnswerOut)
async def update_answer(
    id: str,
    update_in: ApplicationAnswerUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(ApplicationAnswer).where((ApplicationAnswer.id == id) & (ApplicationAnswer.user_id == current_user.id))
    res = await db.execute(query)
    ans = res.scalar_one_or_none()
    if not ans:
        raise HTTPException(status_code=404, detail="Question answer not found.")

    ans.user_edited_answer = update_in.user_edited_answer
    ans.requires_manual_review = False
    ans.updated_at = datetime.datetime.utcnow()

    await db.commit()
    await db.refresh(ans)
    return ans
