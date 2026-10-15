import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import User, Profile, Job, Application, Interview
from app.schemas.schemas import InterviewOut, InterviewCreate, InterviewUpdate
from app.services.ai_service import ai_service

router = APIRouter(prefix="/interviews", tags=["Interviews"])

@router.get("", response_model=List[InterviewOut])
async def list_interviews(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Interview).where(Interview.user_id == current_user.id).options(
        selectinload(Interview.application).selectinload(Application.job).selectinload(Job.analysis),
        selectinload(Interview.application).selectinload(Application.job).selectinload(Job.matches),
        selectinload(Interview.application).selectinload(Application.job).selectinload(Job.saved_entries),
        selectinload(Interview.application).selectinload(Application.events)
    ).order_by(Interview.scheduled_at.asc())
    res = await db.execute(query)
    return res.scalars().all()

@router.post("", response_model=InterviewOut)
async def create_interview(
    interview_in: InterviewCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    app_q = select(Application).where(
        (Application.id == interview_in.application_id) & (Application.user_id == current_user.id)
    ).options(selectinload(Application.job))
    app_res = await db.execute(app_q)
    application = app_res.scalar_one_or_none()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found.")

    # Automatically generate initial checklist & questions
    prof_q = select(Profile).where(Profile.user_id == current_user.id).options(
        selectinload(Profile.skills),
        selectinload(Profile.experiences)
    )
    prof_res = await db.execute(prof_q)
    profile = prof_res.scalar_one_or_none()

    profile_dict = {
        "full_name": current_user.full_name,
        "years_of_experience": profile.years_of_experience if profile else 2.0,
        "skills": [{"name": s.name} for s in profile.skills] if profile else []
    }
    job_dict = {
        "title": application.job.title if application.job else "Role",
        "company": application.job.company if application.job else "Company"
    }

    prep_data = await ai_service.generate_interview_prep(profile_dict, job_dict)

    interview = Interview(
        user_id=current_user.id,
        application_id=application.id,
        round_name=interview_in.round_name,
        scheduled_at=interview_in.scheduled_at,
        interviewer_names=interview_in.interviewer_names,
        meeting_url=interview_in.meeting_url,
        notes=interview_in.notes,
        preparation_checklist=prep_data["checklist"],
        generated_questions=prep_data["questions"]
    )
    db.add(interview)

    # Update application status if it was in earlier stage
    if application.status in ["Saved", "Interested", "Preparing", "Ready to Apply", "Applied", "Assessment"]:
        application.status = "Interview"

    await db.commit()
    
    # Reload with relationships
    reload_q = select(Interview).where(Interview.id == interview.id).options(
        selectinload(Interview.application).selectinload(Application.job).selectinload(Job.analysis),
        selectinload(Interview.application).selectinload(Application.job).selectinload(Job.matches),
        selectinload(Interview.application).selectinload(Application.job).selectinload(Job.saved_entries),
        selectinload(Interview.application).selectinload(Application.events)
    )
    reload_res = await db.execute(reload_q)
    return reload_res.scalar_one()

@router.get("/{id}", response_model=InterviewOut)
async def get_interview(
    id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Interview).where(
        (Interview.id == id) & (Interview.user_id == current_user.id)
    ).options(
        selectinload(Interview.application).selectinload(Application.job).selectinload(Job.analysis),
        selectinload(Interview.application).selectinload(Application.job).selectinload(Job.matches),
        selectinload(Interview.application).selectinload(Application.job).selectinload(Job.saved_entries),
        selectinload(Interview.application).selectinload(Application.events)
    )
    res = await db.execute(query)
    interview = res.scalar_one_or_none()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found.")
    return interview

@router.put("/{id}", response_model=InterviewOut)
async def update_interview(
    id: str,
    update_in: InterviewUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Interview).where(
        (Interview.id == id) & (Interview.user_id == current_user.id)
    ).options(
        selectinload(Interview.application).selectinload(Application.job)
    )
    res = await db.execute(query)
    interview = res.scalar_one_or_none()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found.")

    up_data = update_in.dict(exclude_unset=True)
    for k, v in up_data.items():
        setattr(interview, k, v)
    interview.updated_at = datetime.datetime.utcnow()

    await db.commit()
    
    reload_q = select(Interview).where(Interview.id == interview.id).options(
        selectinload(Interview.application).selectinload(Application.job).selectinload(Job.analysis),
        selectinload(Interview.application).selectinload(Application.job).selectinload(Job.matches),
        selectinload(Interview.application).selectinload(Application.job).selectinload(Job.saved_entries),
        selectinload(Interview.application).selectinload(Application.events)
    )
    reload_res = await db.execute(reload_q)
    return reload_res.scalar_one()

@router.post("/{id}/generate-prep", response_model=InterviewOut)
async def regenerate_interview_prep(
    id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Interview).where(
        (Interview.id == id) & (Interview.user_id == current_user.id)
    ).options(
        selectinload(Interview.application).selectinload(Application.job)
    )
    res = await db.execute(query)
    interview = res.scalar_one_or_none()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found.")

    prof_q = select(Profile).where(Profile.user_id == current_user.id).options(
        selectinload(Profile.skills),
        selectinload(Profile.experiences)
    )
    prof_res = await db.execute(prof_q)
    profile = prof_res.scalar_one_or_none()

    profile_dict = {
        "full_name": current_user.full_name,
        "years_of_experience": profile.years_of_experience if profile else 2.0,
        "skills": [{"name": s.name} for s in profile.skills] if profile else []
    }
    job_dict = {
        "title": interview.application.job.title if interview.application and interview.application.job else "Role",
        "company": interview.application.job.company if interview.application and interview.application.job else "Company"
    }

    prep_data = await ai_service.generate_interview_prep(profile_dict, job_dict)
    interview.preparation_checklist = prep_data["checklist"]
    interview.generated_questions = prep_data["questions"]
    interview.updated_at = datetime.datetime.utcnow()

    await db.commit()
    
    reload_q = select(Interview).where(Interview.id == interview.id).options(
        selectinload(Interview.application).selectinload(Application.job).selectinload(Job.analysis),
        selectinload(Interview.application).selectinload(Application.job).selectinload(Job.matches),
        selectinload(Interview.application).selectinload(Application.job).selectinload(Job.saved_entries),
        selectinload(Interview.application).selectinload(Application.events)
    )
    reload_res = await db.execute(reload_q)
    return reload_res.scalar_one()

@router.delete("/{id}")
async def delete_interview(
    id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Interview).where((Interview.id == id) & (Interview.user_id == current_user.id))
    res = await db.execute(query)
    interview = res.scalar_one_or_none()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found.")
    await db.delete(interview)
    await db.commit()
    return {"status": "success"}
