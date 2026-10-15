import datetime
import logging
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.models import User, Profile, Job, JobMatch, JobAnalysis, UserPreference, Interview, Application
from app.integrations.job_sources import adapters
from app.services.ai_service import ai_service
from app.services.job_matcher import job_matcher
from app.services.notification_service import notification_service
from app.schemas.canonical_job import CanonicalJob
from app.services.deduplication_service import deduplication_service

logger = logging.getLogger("jobpilot.scheduler")

class SchedulerService:
    @classmethod
    async def run_daily_job_search(cls, db: AsyncSession, user_id: str) -> Dict[str, Any]:
        """
        Executes daily automated search for a specific user:
        - Searches enabled adapters
        - Deduplicates against stored jobs
        - Evaluates match scores
        - Emits notifications for top matches
        """
        pref_query = select(UserPreference).where(UserPreference.user_id == user_id)
        pref_res = await db.execute(pref_query)
        pref = pref_res.scalar_one_or_none()

        prof_query = select(Profile).where(Profile.user_id == user_id).options(
            selectinload(Profile.skills),
            selectinload(Profile.experiences),
            selectinload(Profile.educations)
        )
        prof_res = await db.execute(prof_query)
        profile = prof_res.scalar_one_or_none()

        if not profile:
            return {"status": "skipped", "reason": "No profile found"}

        target_titles = pref.target_titles if pref and pref.target_titles else ["Data Analyst", "Software Engineer"]
        target_locations = pref.target_locations if pref and pref.target_locations else ["Remote"]
        min_match = pref.min_match_score if pref else 70.0

        # Construct profile dictionary for matching
        profile_dict = {
            "full_name": profile.user.full_name if profile.user else "Candidate",
            "years_of_experience": profile.years_of_experience,
            "work_mode_preference": profile.work_mode_preference,
            "preferred_locations": profile.preferred_locations,
            "current_city": profile.current_city,
            "skills": [{"name": s.name, "category": s.category} for s in profile.skills],
            "experiences": [{"company": e.company, "position": e.position, "bullet_points": e.bullet_points} for e in profile.experiences],
            "educations": [{"institution": ed.institution, "degree": ed.degree} for ed in profile.educations]
        }

        found_jobs_count = 0
        new_matches_count = 0

        for title in target_titles:
            for loc in target_locations[:2]:
                for adapter_name, adapter in adapters.items():
                    if not adapter.is_enabled:
                        continue
                    try:
                        results = await adapter.search_jobs(query=title, location=loc, limit=3)
                        for r in results:
                            found_jobs_count += 1
                            canonical = CanonicalJob(
                                title=r.get("title", ""),
                                company=r.get("company", ""),
                                location=r.get("location"),
                                work_mode=r.get("work_mode", "Remote"),
                                job_type=r.get("job_type", "Full-time"),
                                salary_min=r.get("salary_min"),
                                salary_max=r.get("salary_max"),
                                salary_currency=r.get("salary_currency", "USD"),
                                raw_description=r.get("raw_description", ""),
                                original_url=r.get("original_url"),
                                job_source=r.get("job_source", adapter_name),
                                external_id=r.get("external_id")
                            ).normalize()

                            # Use robust deduplication & ghost-job aware merge
                            job_rec, is_new = await deduplication_service.merge_or_create_job(db, canonical)

                            # Skip matching if marked as ghost job or already matched
                            if job_rec.is_ghost_job:
                                continue

                            if is_new:
                                # Deep analyze job
                                analysis_data = await ai_service.analyze_job_description(
                                    job_rec.raw_description,
                                    job_rec.title,
                                    job_rec.company
                                )
                                job_analysis = JobAnalysis(
                                    job_id=job_rec.id,
                                    extracted_title=analysis_data.get("extracted_title"),
                                    extracted_company=analysis_data.get("extracted_company"),
                                    extracted_location=analysis_data.get("extracted_location"),
                                    required_skills=analysis_data.get("required_skills", []),
                                    preferred_skills=analysis_data.get("preferred_skills", []),
                                    technical_keywords=analysis_data.get("technical_keywords", []),
                                    soft_skills=analysis_data.get("soft_skills", []),
                                    responsibilities=analysis_data.get("responsibilities", []),
                                    education_requirements=analysis_data.get("education_requirements", []),
                                    experience_years_min=analysis_data.get("experience_years_min", 2.0),
                                    work_mode=analysis_data.get("work_mode"),
                                    key_takeaways=analysis_data.get("key_takeaways", []),
                                    raw_analysis_json=analysis_data
                                )
                                db.add(job_analysis)
                                await db.flush()
                            else:
                                analysis_q = select(JobAnalysis).where(JobAnalysis.job_id == job_rec.id)
                                analysis_res = await db.execute(analysis_q)
                                job_analysis = analysis_res.scalar_one_or_none()

                            # Compute Match
                            analysis_dict = job_analysis.raw_analysis_json if job_analysis else {}
                            match_res = job_matcher.calculate_match(
                                profile_dict=profile_dict,
                                job_dict={"work_mode": job_rec.work_mode, "location": job_rec.location, "salary_min": job_rec.salary_min, "salary_max": job_rec.salary_max},
                                analysis_dict=analysis_dict
                            )

                            # Save or update JobMatch
                            existing_match_q = select(JobMatch).where(
                                (JobMatch.user_id == user_id) & (JobMatch.job_id == job_rec.id)
                            )
                            match_check = await db.execute(existing_match_q)
                            match_rec = match_check.scalar_one_or_none()

                            if not match_rec:
                                match_rec = JobMatch(
                                    user_id=user_id,
                                    job_id=job_rec.id,
                                    overall_score=match_res["overall_score"],
                                    skills_score=match_res["skills_score"],
                                    experience_score=match_res["experience_score"],
                                    education_score=match_res["education_score"],
                                    location_score=match_res["location_score"],
                                    preferences_score=match_res["preferences_score"],
                                    matched_skills=match_res["matched_skills"],
                                    missing_skills=match_res["missing_skills"],
                                    explanation=match_res["explanation"],
                                    recommendations=match_res["recommendations"]
                                )
                                db.add(match_rec)
                                if match_res["overall_score"] >= min_match:
                                    new_matches_count += 1
                                    await notification_service.create_in_app_notification(
                                        db=db,
                                        user_id=user_id,
                                        title=f"High Job Match: {job_rec.title} at {job_rec.company}",
                                        message=f"Matched {match_res['overall_score']}% with your profile. {', '.join(match_res['matched_skills'][:3])}.",
                                        notification_type="job_match",
                                        link_url=f"/jobs/{job_rec.id}"
                                    )
                    except Exception as err:
                        logger.error(f"Error searching with adapter {adapter_name}: {err}")

        await db.commit()
        return {
            "status": "completed",
            "found_jobs": found_jobs_count,
            "new_matches": new_matches_count
        }

    @classmethod
    async def check_reminders(cls, db: AsyncSession, user_id: str) -> Dict[str, Any]:
        """
        Checks for upcoming interview rounds and application follow-up milestones.
        """
        now = datetime.datetime.utcnow()
        soon = now + datetime.timedelta(hours=24)

        # 1. Interviews in the next 24 hours
        interview_q = select(Interview).where(
            (Interview.user_id == user_id) &
            (Interview.scheduled_at >= now) &
            (Interview.scheduled_at <= soon) &
            (Interview.outcome == "Scheduled")
        )
        int_res = await db.execute(interview_q)
        interviews = int_res.scalars().all()

        for interview in interviews:
            await notification_service.create_in_app_notification(
                db=db,
                user_id=user_id,
                title=f"Upcoming Interview Reminder: {interview.round_name}",
                message=f"Scheduled for {interview.scheduled_at.strftime('%b %d, %H:%M UTC')}. Review your preparation checklist.",
                notification_type="interview_reminder",
                link_url=f"/interviews"
            )

        # 2. Application Follow-ups
        app_q = select(Application).where(
            (Application.user_id == user_id) &
            (Application.follow_up_date <= now) &
            (Application.status.in_(["Applied", "Assessment"]))
        )
        app_res = await db.execute(app_q)
        apps = app_res.scalars().all()

        for app in apps:
            await notification_service.create_in_app_notification(
                db=db,
                user_id=user_id,
                title=f"Application Follow-up Due",
                message=f"It is time to follow up on your application with {app.job.company if app.job else 'the employer'}.",
                notification_type="follow_up",
                link_url=f"/applications"
            )

        await db.commit()
        return {"interviews_reminded": len(interviews), "follow_ups_reminded": len(apps)}

scheduler_service = SchedulerService()
