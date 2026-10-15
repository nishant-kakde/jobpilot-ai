import csv
import io
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import desc

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import User, Application, Job, ApplicationEvent, ResumeVersion, CoverLetter
from app.schemas.schemas import ApplicationOut, ApplicationCreate, ApplicationUpdate

router = APIRouter(prefix="/applications", tags=["Application Tracker"])

@router.get("", response_model=List[ApplicationOut])
async def list_applications(
    status_filter: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Application).where(Application.user_id == current_user.id).options(
        selectinload(Application.job).selectinload(Job.analysis),
        selectinload(Application.job).selectinload(Job.matches),
        selectinload(Application.job).selectinload(Job.saved_entries),
        selectinload(Application.events)
    ).order_by(desc(Application.updated_at))

    if status_filter and status_filter.lower() != "all":
        query = query.where(Application.status == status_filter)

    res = await db.execute(query)
    apps = res.scalars().all()

    if search:
        s_lower = search.lower()
        apps = [
            a for a in apps if (
                (a.job and s_lower in a.job.title.lower()) or
                (a.job and s_lower in a.job.company.lower()) or
                (a.notes and s_lower in a.notes.lower())
            )
        ]

    return apps

@router.post("", response_model=ApplicationOut)
async def create_application(
    app_in: ApplicationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify Job
    job_q = select(Job).where(Job.id == app_in.job_id)
    job_res = await db.execute(job_q)
    job = job_res.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    new_app = Application(
        user_id=current_user.id,
        job_id=job.id,
        resume_version_id=app_in.resume_version_id,
        cover_letter_id=app_in.cover_letter_id,
        status=app_in.status,
        applied_date=app_in.applied_date,
        follow_up_date=app_in.follow_up_date,
        notes=app_in.notes
    )
    db.add(new_app)
    await db.flush()

    # Create initial event
    init_event = ApplicationEvent(
        application_id=new_app.id,
        event_type="status_change",
        previous_status=None,
        new_status=app_in.status,
        description=f"Application created in stage: {app_in.status}."
    )
    db.add(init_event)

    await db.commit()
    
    # Reload with relationships
    reload_q = select(Application).where(Application.id == new_app.id).options(
        selectinload(Application.job).selectinload(Job.analysis),
        selectinload(Application.job).selectinload(Job.matches),
        selectinload(Application.job).selectinload(Job.saved_entries),
        selectinload(Application.events)
    )
    reload_res = await db.execute(reload_q)
    return reload_res.scalar_one()

@router.get("/{id}", response_model=ApplicationOut)
async def get_application(
    id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Application).where(
        (Application.id == id) & (Application.user_id == current_user.id)
    ).options(
        selectinload(Application.job).selectinload(Job.analysis),
        selectinload(Application.job).selectinload(Job.matches),
        selectinload(Application.job).selectinload(Job.saved_entries),
        selectinload(Application.events)
    )
    res = await db.execute(query)
    app = res.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")
    return app

@router.put("/{id}", response_model=ApplicationOut)
async def update_application(
    id: str,
    update_in: ApplicationUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Application).where(
        (Application.id == id) & (Application.user_id == current_user.id)
    ).options(
        selectinload(Application.job),
        selectinload(Application.events)
    )
    res = await db.execute(query)
    app = res.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")

    old_status = app.status
    up_dict = update_in.dict(exclude_unset=True)

    status_changed = "status" in up_dict and up_dict["status"] != old_status
    for k, v in up_dict.items():
        setattr(app, k, v)
    app.updated_at = datetime.datetime.utcnow()

    if status_changed:
        event = ApplicationEvent(
            application_id=app.id,
            event_type="status_change",
            previous_status=old_status,
            new_status=app.status,
            description=f"Status transitioned from {old_status} to {app.status}."
        )
        db.add(event)

    await db.commit()
    
    reload_q = select(Application).where(Application.id == app.id).options(
        selectinload(Application.job).selectinload(Job.analysis),
        selectinload(Application.job).selectinload(Job.matches),
        selectinload(Application.job).selectinload(Job.saved_entries),
        selectinload(Application.events)
    )
    reload_res = await db.execute(reload_q)
    return reload_res.scalar_one()

@router.delete("/{id}")
async def delete_application(
    id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Application).where((Application.id == id) & (Application.user_id == current_user.id))
    res = await db.execute(query)
    app = res.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")
    await db.delete(app)
    await db.commit()
    return {"status": "success"}

@router.get("/export/csv")
async def export_applications_csv(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Application).where(Application.user_id == current_user.id).options(
        selectinload(Application.job)
    ).order_by(desc(Application.created_at))
    res = await db.execute(query)
    apps = res.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Application ID", "Company", "Position", "Job Source", "Location",
        "Work Mode", "Status", "Applied Date", "Follow-up Date",
        "Salary Offered", "Verified Submission", "Job URL", "Created Date"
    ])

    for a in apps:
        writer.writerow([
            a.id,
            a.job.company if a.job else "",
            a.job.title if a.job else "",
            a.job.job_source if a.job else "",
            a.job.location if a.job else "",
            a.job.work_mode if a.job else "",
            a.status,
            a.applied_date.strftime("%Y-%m-%d") if a.applied_date else "",
            a.follow_up_date.strftime("%Y-%m-%d") if a.follow_up_date else "",
            a.salary_offered or "",
            "Yes" if a.submission_verified else "No",
            a.job.original_url if a.job else "",
            a.created_at.strftime("%Y-%m-%d %H:%M")
        ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=jobpilot_applications.csv"}
    )
