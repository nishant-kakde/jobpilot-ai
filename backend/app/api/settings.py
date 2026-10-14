import datetime
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import User, Profile, UserPreference, Application, ResumeVersion, CoverLetter, Interview, MasterResume
from app.schemas.schemas import UserPreferenceOut, UserPreferenceUpdate

router = APIRouter(prefix="/settings", tags=["Settings & Security"])

@router.get("/preferences", response_model=UserPreferenceOut)
async def get_preferences(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(UserPreference).where(UserPreference.user_id == current_user.id)
    res = await db.execute(query)
    pref = res.scalar_one_or_none()
    if not pref:
        pref = UserPreference(user_id=current_user.id)
        db.add(pref)
        await db.commit()
        await db.refresh(pref)
    return pref

@router.put("/preferences", response_model=UserPreferenceOut)
async def update_preferences(
    pref_in: UserPreferenceUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(UserPreference).where(UserPreference.user_id == current_user.id)
    res = await db.execute(query)
    pref = res.scalar_one_or_none()
    if not pref:
        pref = UserPreference(user_id=current_user.id)
        db.add(pref)

    up_data = pref_in.dict(exclude_unset=True)
    for k, v in up_data.items():
        setattr(pref, k, v)
    pref.updated_at = datetime.datetime.utcnow()

    await db.commit()
    await db.refresh(pref)
    return pref

@router.get("/export-data")
async def export_user_data(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Exports complete personal data bundle (GDPR/CCPA compliance).
    """
    prof_q = select(Profile).where(Profile.user_id == current_user.id).options(
        selectinload(Profile.educations),
        selectinload(Profile.experiences),
        selectinload(Profile.skills),
        selectinload(Profile.projects),
        selectinload(Profile.certifications)
    )
    prof_res = await db.execute(prof_q)
    profile = prof_res.scalar_one_or_none()

    apps_q = select(Application).where(Application.user_id == current_user.id).options(selectinload(Application.job))
    apps_res = await db.execute(apps_q)
    apps = apps_res.scalars().all()

    letters_q = select(CoverLetter).where(CoverLetter.user_id == current_user.id)
    letters_res = await db.execute(letters_q)
    letters = letters_res.scalars().all()

    resumes_q = select(ResumeVersion).where(ResumeVersion.user_id == current_user.id)
    resumes_res = await db.execute(resumes_q)
    resumes = resumes_res.scalars().all()

    export_bundle = {
        "export_metadata": {
            "exported_at": datetime.datetime.utcnow().isoformat(),
            "user_id": current_user.id,
            "email": current_user.email,
            "full_name": current_user.full_name
        },
        "profile": {
            "phone": profile.phone if profile else "",
            "current_city": profile.current_city if profile else "",
            "summary": profile.summary if profile else "",
            "years_of_experience": profile.years_of_experience if profile else 0,
            "skills": [s.name for s in profile.skills] if profile else [],
            "experiences": [
                {"company": e.company, "position": e.position, "start_date": e.start_date, "end_date": e.end_date}
                for e in profile.experiences
            ] if profile else [],
            "educations": [
                {"institution": ed.institution, "degree": ed.degree}
                for ed in profile.educations
            ] if profile else []
        },
        "applications": [
            {
                "company": a.job.company if a.job else "",
                "position": a.job.title if a.job else "",
                "status": a.status,
                "applied_date": a.applied_date.isoformat() if a.applied_date else None,
                "notes": a.notes
            } for a in apps
        ],
        "cover_letters": [
            {"company": l.company, "position": l.position, "letter_text": l.letter_text}
            for l in letters
        ],
        "tailored_resumes": [
            {"title": r.title, "target_company": r.target_company, "target_job_title": r.target_job_title, "summary": r.summary}
            for r in resumes
        ]
    }
    return export_bundle

@router.delete("/account")
async def delete_account(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Deletes user account and permanently purges all linked records.
    """
    user_q = select(User).where(User.id == current_user.id)
    user_res = await db.execute(user_q)
    user = user_res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User account not found.")

    await db.delete(user)
    await db.commit()
    return {"status": "account_permanently_deleted"}
