import datetime
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import User, Profile, Job, Application, ResumeVersion, CoverLetter, ApplicationEvent
from app.schemas.schemas import PrepareAutofillRequest, AutofillActionRequest, AutofillStatusResponse
from app.services.autofill_service import autofill_service

router = APIRouter(prefix="/autofill", tags=["Browser-Assisted Autofill"])

@router.post("/prepare")
async def prepare_autofill(
    req: PrepareAutofillRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    app_q = select(Application).where(
        (Application.id == req.application_id) & (Application.user_id == current_user.id)
    ).options(
        selectinload(Application.job),
        selectinload(Application.resume_version),
        selectinload(Application.cover_letter)
    )
    app_res = await db.execute(app_q)
    application = app_res.scalar_one_or_none()
    if not application:
        raise HTTPException(status_code=404, detail="Application record not found.")

    prof_q = select(Profile).where(Profile.user_id == current_user.id)
    prof_res = await db.execute(prof_q)
    profile = prof_res.scalar_one_or_none()

    user_profile = {
        "full_name": current_user.full_name,
        "email": current_user.email,
        "phone": profile.phone if profile else "",
        "current_city": profile.current_city if profile else "",
        "linkedin_url": profile.linkedin_url if profile else "",
        "github_url": profile.github_url if profile else "",
        "portfolio_url": profile.portfolio_url if profile else "",
        "years_of_experience": profile.years_of_experience if profile else 2.0,
        "notice_period_days": profile.notice_period_days if profile else 30
    }

    resume_dict = {"pdf_path": application.resume_version.pdf_path} if application.resume_version else None
    cover_dict = {"letter_text": application.cover_letter.letter_text} if application.cover_letter else None

    mapped_fields = autofill_service.prepare_field_mappings(
        user_profile=user_profile,
        resume_version=resume_dict,
        cover_letter=cover_dict
    )

    application.autofill_status = "ready_for_review"
    application.autofill_details = mapped_fields
    await db.commit()

    return {
        "application_id": application.id,
        "job_title": application.job.title if application.job else "",
        "company": application.job.company if application.job else "",
        "job_url": application.job.original_url if application.job else "",
        "mapped_fields": mapped_fields,
        "requires_user_approval": True,
        "instructions": (
            "Review your prepared application fields below. JobPilot will safely assist with form population. "
            "In compliance with security standards, no application is submitted without your explicit approval."
        )
    }

@router.post("/execute", response_model=AutofillStatusResponse)
async def execute_autofill_step(
    req: AutofillActionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    app_q = select(Application).where(
        (Application.id == req.application_id) & (Application.user_id == current_user.id)
    ).options(selectinload(Application.job))
    app_res = await db.execute(app_q)
    application = app_res.scalar_one_or_none()
    if not application:
        raise HTTPException(status_code=404, detail="Application record not found.")

    form_data = req.form_data or application.autofill_details or {}
    job_url = application.job.original_url if application.job else ""

    result = await autofill_service.run_autofill_step(
        job_url=job_url,
        form_data=form_data,
        action=req.action
    )

    if req.action == "submit_approved":
        prev_status = application.status
        application.status = "Applied"
        application.applied_date = datetime.datetime.utcnow()
        application.submission_verified = True
        application.submission_confirmation_code = f"JP-VERIFIED-{application.id[:8].upper()}"
        application.autofill_status = "submitted_verified"

        # Record timeline event
        event = ApplicationEvent(
            application_id=application.id,
            event_type="status_change",
            previous_status=prev_status,
            new_status="Applied",
            description=f"Verified application submitted with explicit user consent (Confirmation code: {application.submission_confirmation_code})."
        )
        db.add(event)

    await db.commit()
    await db.refresh(application)

    return AutofillStatusResponse(
        application_id=application.id,
        status=result["status"],
        current_step=result["current_step"],
        filled_fields=result["filled_fields"],
        unsupported_fields=result["unsupported_fields"],
        requires_user_approval=result["requires_user_approval"],
        notes=result.get("notes")
    )
