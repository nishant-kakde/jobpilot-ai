import datetime
from typing import Dict, Any, List
from collections import defaultdict
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import User, Job, JobMatch, SavedJob, Application, Interview
from app.schemas.schemas import DashboardStats

router = APIRouter(prefix="/dashboard", tags=["Dashboard & Analytics"])

@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Total jobs
    total_jobs_res = await db.execute(select(func.count(Job.id)))
    total_jobs = total_jobs_res.scalar() or 0

    # Matching jobs (score >= 70)
    matching_q = select(func.count(JobMatch.id)).where(
        (JobMatch.user_id == current_user.id) & (JobMatch.overall_score >= 70.0)
    )
    matching_res = await db.execute(matching_q)
    matching_jobs_count = matching_res.scalar() or 0

    # Saved jobs
    saved_q = select(func.count(SavedJob.id)).where(SavedJob.user_id == current_user.id)
    saved_res = await db.execute(saved_q)
    saved_count = saved_res.scalar() or 0

    # Applications
    app_q = select(Application).where(Application.user_id == current_user.id).options(
        selectinload(Application.job)
    )
    app_res = await db.execute(app_q)
    applications = app_res.scalars().all()

    # Interviews
    int_q = select(func.count(Interview.id)).where(Interview.user_id == current_user.id)
    int_res = await db.execute(int_q)
    interviews_count = int_res.scalar() or 0

    # Aggregations
    applications_prepared = 0
    confirmed_submissions = 0
    offers_count = 0
    rejections_count = 0

    status_counts = defaultdict(int)
    source_counts = defaultdict(int)

    # 11 Statuses initialized to 0
    all_statuses = [
        "Saved", "Interested", "Preparing", "Ready to Apply", "Applied",
        "Assessment", "Interview", "Shortlisted", "Offer", "Rejected", "Withdrawn"
    ]
    for s in all_statuses:
        status_counts[s] = 0

    # Group by week for past 4 weeks
    now = datetime.datetime.utcnow()
    weekly_apps = defaultdict(int)
    for i in range(4):
        start_w = (now - datetime.timedelta(days=(3 - i) * 7)).strftime("Week %U")
        weekly_apps[start_w] = 0

    for a in applications:
        status_counts[a.status] += 1
        
        if a.status in ["Preparing", "Ready to Apply", "Saved", "Interested"]:
            applications_prepared += 1
        if a.submission_verified or a.status in ["Applied", "Assessment", "Interview", "Shortlisted", "Offer"]:
            confirmed_submissions += 1
        if a.status == "Offer":
            offers_count += 1
        if a.status == "Rejected":
            rejections_count += 1

        source = a.job.job_source if a.job else "Other"
        source_counts[source] += 1

        week_key = a.created_at.strftime("Week %U")
        if week_key in weekly_apps:
            weekly_apps[week_key] += 1
        else:
            weekly_apps[week_key] = 1

    # Match score distribution
    match_q = select(JobMatch).where(JobMatch.user_id == current_user.id)
    match_res = await db.execute(match_q)
    matches = match_res.scalars().all()

    score_brackets = {"90-100%": 0, "80-89%": 0, "70-79%": 0, "60-69%": 0, "<60%": 0}
    for m in matches:
        s = m.overall_score
        if s >= 90: score_brackets["90-100%"] += 1
        elif s >= 80: score_brackets["80-89%"] += 1
        elif s >= 70: score_brackets["70-79%"] += 1
        elif s >= 60: score_brackets["60-69%"] += 1
        else: score_brackets["<60%"] += 1

    # Conversion funnel
    funnel = [
        {"stage": "Jobs Found", "count": total_jobs},
        {"stage": "Match > 70%", "count": matching_jobs_count},
        {"stage": "Prepared", "count": applications_prepared + confirmed_submissions},
        {"stage": "Confirmed Applied", "count": confirmed_submissions},
        {"stage": "Interviews", "count": interviews_count},
        {"stage": "Offers", "count": offers_count}
    ]

    return DashboardStats(
        total_jobs_found=total_jobs,
        matching_jobs_count=matching_jobs_count,
        saved_jobs_count=saved_count,
        applications_prepared=applications_prepared,
        confirmed_applications_submitted=confirmed_submissions,
        interviews_count=interviews_count,
        offers_count=offers_count,
        rejections_count=rejections_count,
        applications_by_status=dict(status_counts),
        applications_by_source=dict(source_counts),
        weekly_applications=[{"week": k, "count": v} for k, v in weekly_apps.items()],
        match_score_distribution=[{"bracket": k, "count": v} for k, v in score_brackets.items()],
        funnel_stages=funnel
    )
