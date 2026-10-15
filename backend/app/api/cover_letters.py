import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import User, Profile, Job, CoverLetter
from app.schemas.schemas import CoverLetterOut, CoverLetterUpdate, GenerateCoverLetterRequest
from app.services.ai_service import ai_service

router = APIRouter(prefix="/cover-letters", tags=["Cover Letters"])

@router.post("/generate", response_model=CoverLetterOut)
async def generate_cover_letter(
    req: GenerateCoverLetterRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    job_q = select(Job).where(Job.id == req.job_id)
    job_res = await db.execute(job_q)
    job = job_res.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    prof_q = select(Profile).where(Profile.user_id == current_user.id).options(
        selectinload(Profile.skills),
        selectinload(Profile.experiences),
        selectinload(Profile.educations)
    )
    prof_res = await db.execute(prof_q)
    profile = prof_res.scalar_one_or_none()

    profile_dict = {
        "full_name": current_user.full_name,
        "email": current_user.email,
        "years_of_experience": profile.years_of_experience if profile else 2.0,
        "skills": [{"name": s.name} for s in profile.skills] if profile else []
    }

    generated = await ai_service.generate_cover_letter(
        profile=profile_dict,
        job={"title": job.title, "company": job.company},
        tone=req.tone or "Professional & Impactful",
        custom_instructions=req.custom_instructions
    )

    cover_letter = CoverLetter(
        user_id=current_user.id,
        job_id=job.id,
        resume_version_id=req.resume_version_id,
        title=generated["title"],
        company=generated["company"],
        position=generated["position"],
        letter_text=generated["letter_text"],
        tone=generated["tone"],
        key_points_highlighted=generated["key_points_highlighted"]
    )
    db.add(cover_letter)
    await db.commit()
    await db.refresh(cover_letter)
    return cover_letter

@router.get("", response_model=List[CoverLetterOut])
async def list_cover_letters(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    query = select(CoverLetter).where(CoverLetter.user_id == current_user.id).order_by(CoverLetter.created_at.desc())
    res = await db.execute(query)
    return res.scalars().all()

@router.get("/{id}", response_model=CoverLetterOut)
async def get_cover_letter(id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    query = select(CoverLetter).where((CoverLetter.id == id) & (CoverLetter.user_id == current_user.id))
    res = await db.execute(query)
    letter = res.scalar_one_or_none()
    if not letter:
        raise HTTPException(status_code=404, detail="Cover letter not found.")
    return letter

@router.put("/{id}", response_model=CoverLetterOut)
async def update_cover_letter(
    id: str,
    update_in: CoverLetterUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(CoverLetter).where((CoverLetter.id == id) & (CoverLetter.user_id == current_user.id))
    res = await db.execute(query)
    letter = res.scalar_one_or_none()
    if not letter:
        raise HTTPException(status_code=404, detail="Cover letter not found.")

    up_data = update_in.dict(exclude_unset=True)
    for k, v in up_data.items():
        setattr(letter, k, v)
    letter.updated_at = datetime.datetime.utcnow()

    await db.commit()
    await db.refresh(letter)
    return letter

@router.delete("/{id}")
async def delete_cover_letter(id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    query = select(CoverLetter).where((CoverLetter.id == id) & (CoverLetter.user_id == current_user.id))
    res = await db.execute(query)
    letter = res.scalar_one_or_none()
    if not letter:
        raise HTTPException(status_code=404, detail="Cover letter not found.")
    await db.delete(letter)
    await db.commit()
    return {"status": "success"}
