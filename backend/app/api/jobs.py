import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import or_, desc, asc

from app.core.database import get_db
from app.core.security import get_current_user, get_current_user_optional
from app.models.models import User, Profile, Job, JobAnalysis, JobMatch, SavedJob
from app.schemas.schemas import JobOut, JobAnalysisOut, JobMatchOut, JobImportRequest
from app.integrations.job_sources import get_all_adapters, adapters
from app.integrations.job_sources.manual_import import ManualImportAdapter
from app.services.ai_service import ai_service
from app.services.job_matcher import job_matcher

router = APIRouter(prefix="/jobs", tags=["Jobs & Search"])

@router.get("/sources/adapters")
async def list_source_adapters():
    return get_all_adapters()

@router.get("", response_model=List[JobOut])
async def list_jobs(
    keywords: Optional[str] = None,
    company: Optional[str] = None,
    location: Optional[str] = None,
    work_mode: Optional[str] = None,
    job_type: Optional[str] = None,
    job_source: Optional[str] = None,
    min_match_score: Optional[float] = None,
    sort_by: str = Query("newest", pattern="^(newest|match_score|salary)$"),
    page: int = 1,
    page_size: int = 30,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    query = select(Job).options(
        selectinload(Job.analysis),
        selectinload(Job.matches),
        selectinload(Job.saved_entries)
    ).where(Job.is_active == True)

    # Filtering
    if keywords:
        kw = f"%{keywords}%"
        query = query.where(or_(Job.title.ilike(kw), Job.raw_description.ilike(kw), Job.company.ilike(kw)))
    if company:
        query = query.where(Job.company.ilike(f"%{company}%"))
    if location:
        query = query.where(Job.location.ilike(f"%{location}%"))
    if work_mode and work_mode.lower() != "all":
        query = query.where(Job.work_mode.ilike(work_mode))
    if job_type and job_type.lower() != "all":
        query = query.where(Job.job_type.ilike(job_type))
    if job_source and job_source.lower() != "all":
        query = query.where(Job.job_source == job_source)

    if sort_by == "salary":
        query = query.order_by(desc(Job.salary_max), desc(Job.date_posted))
    else:
        query = query.order_by(desc(Job.date_posted))

    res = await db.execute(query)
    jobs = res.scalars().all()

    # Format output with user-specific match and saved state
    results = []
    user_id = current_user.id if current_user else None

    for j in jobs:
        user_match = next((m for m in j.matches if m.user_id == user_id), None) if user_id else None
        is_saved = any(s.user_id == user_id for s in j.saved_entries) if user_id else False
        
        match_score = user_match.overall_score if user_match else 0.0
        if min_match_score and match_score < min_match_score:
            continue

        job_dict = {
            "id": j.id,
            "title": j.title,
            "company": j.company,
            "location": j.location,
            "work_mode": j.work_mode,
            "job_type": j.job_type,
            "salary_min": j.salary_min,
            "salary_max": j.salary_max,
            "salary_currency": j.salary_currency,
            "raw_description": j.raw_description,
            "original_url": j.original_url,
            "job_source": j.job_source,
            "external_id": j.external_id,
            "is_active": j.is_active,
            "date_posted": j.date_posted,
            "created_at": j.created_at,
            "is_saved": is_saved,
            "match": user_match,
            "analysis": j.analysis
        }
        results.append(job_dict)

    if sort_by == "match_score":
        results.sort(key=lambda x: x["match"].overall_score if x["match"] else 0.0, reverse=True)

    start = (page - 1) * page_size
    return results[start:start + page_size]

@router.get("/{job_id}", response_model=JobOut)
async def get_job_by_id(
    job_id: str,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    query = select(Job).where(Job.id == job_id).options(
        selectinload(Job.analysis),
        selectinload(Job.matches),
        selectinload(Job.saved_entries)
    )
    res = await db.execute(query)
    job = res.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    user_id = current_user.id if current_user else None
    user_match = next((m for m in job.matches if m.user_id == user_id), None) if user_id else None
    is_saved = any(s.user_id == user_id for s in job.saved_entries) if user_id else False

    return {
        "id": job.id,
        "title": job.title,
        "company": job.company,
        "location": job.location,
        "work_mode": job.work_mode,
        "job_type": job.job_type,
        "salary_min": job.salary_min,
        "salary_max": job.salary_max,
        "salary_currency": job.salary_currency,
        "raw_description": job.raw_description,
        "original_url": job.original_url,
        "job_source": job.job_source,
        "external_id": job.external_id,
        "is_active": job.is_active,
        "date_posted": job.date_posted,
        "created_at": job.created_at,
        "is_saved": is_saved,
        "match": user_match,
        "analysis": job.analysis
    }

@router.post("/import", response_model=JobOut)
async def import_job(
    job_in: JobImportRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    parsed = ManualImportAdapter.parse_pasted_job(
        raw_description=job_in.raw_description,
        title=job_in.title,
        company=job_in.company,
        location=job_in.location,
        url=job_in.url,
        salary_min=job_in.salary_min,
        salary_max=job_in.salary_max
    )

    # Check deduplication
    check_q = select(Job).where((Job.title == parsed["title"]) & (Job.company == parsed["company"]))
    check_res = await db.execute(check_q)
    job = check_res.scalar_one_or_none()

    if not job:
        job = Job(
            title=parsed["title"],
            company=parsed["company"],
            location=parsed["location"],
            work_mode=job_in.work_mode or parsed["work_mode"],
            job_type=job_in.job_type or parsed["job_type"],
            salary_min=parsed["salary_min"],
            salary_max=parsed["salary_max"],
            salary_currency=parsed["salary_currency"],
            raw_description=parsed["raw_description"],
            original_url=parsed["original_url"],
            job_source=job_in.job_source or "Manual Import"
        )
        db.add(job)
        await db.flush()

        # Run AI Job Description Analysis
        analysis_data = await ai_service.analyze_job_description(job.raw_description, job.title, job.company)
        job_analysis = JobAnalysis(
            job_id=job.id,
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
        analysis_q = select(JobAnalysis).where(JobAnalysis.job_id == job.id)
        analysis_res = await db.execute(analysis_q)
        job_analysis = analysis_res.scalar_one_or_none()

    # Calculate match with user's profile
    prof_q = select(Profile).where(Profile.user_id == current_user.id).options(
        selectinload(Profile.skills),
        selectinload(Profile.experiences),
        selectinload(Profile.educations)
    )
    prof_res = await db.execute(prof_q)
    profile = prof_res.scalar_one_or_none()

    user_match = None
    if profile:
        profile_dict = {
            "years_of_experience": profile.years_of_experience,
            "work_mode_preference": profile.work_mode_preference,
            "preferred_locations": profile.preferred_locations,
            "current_city": profile.current_city,
            "skills": [{"name": s.name, "category": s.category} for s in profile.skills],
            "experiences": [{"company": e.company, "position": e.position} for e in profile.experiences],
            "educations": [{"degree": ed.degree} for ed in profile.educations]
        }
        match_res = job_matcher.calculate_match(
            profile_dict=profile_dict,
            job_dict={"work_mode": job.work_mode, "location": job.location, "salary_min": job.salary_min, "salary_max": job.salary_max},
            analysis_dict=job_analysis.raw_analysis_json if job_analysis else {}
        )
        user_match = JobMatch(
            user_id=current_user.id,
            job_id=job.id,
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
        db.add(user_match)

    await db.commit()
    await db.refresh(job)

    return {
        "id": job.id,
        "title": job.title,
        "company": job.company,
        "location": job.location,
        "work_mode": job.work_mode,
        "job_type": job.job_type,
        "salary_min": job.salary_min,
        "salary_max": job.salary_max,
        "salary_currency": job.salary_currency,
        "raw_description": job.raw_description,
        "original_url": job.original_url,
        "job_source": job.job_source,
        "external_id": job.external_id,
        "is_active": job.is_active,
        "date_posted": job.date_posted,
        "created_at": job.created_at,
        "is_saved": False,
        "match": user_match,
        "analysis": job_analysis
    }

@router.post("/{job_id}/save")
async def save_job(
    job_id: str,
    notes: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    check_q = select(SavedJob).where((SavedJob.user_id == current_user.id) & (SavedJob.job_id == job_id))
    check_res = await db.execute(check_q)
    saved = check_res.scalar_one_or_none()
    if not saved:
        saved = SavedJob(user_id=current_user.id, job_id=job_id, notes=notes)
        db.add(saved)
        await db.commit()
    return {"status": "saved", "job_id": job_id}

@router.delete("/{job_id}/save")
async def unsave_job(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    check_q = select(SavedJob).where((SavedJob.user_id == current_user.id) & (SavedJob.job_id == job_id))
    check_res = await db.execute(check_q)
    saved = check_res.scalar_one_or_none()
    if saved:
        await db.delete(saved)
        await db.commit()
    return {"status": "unsaved", "job_id": job_id}

@router.post("/{job_id}/analyze", response_model=JobAnalysisOut)
async def analyze_job(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    job_q = select(Job).where(Job.id == job_id)
    job_res = await db.execute(job_q)
    job = job_res.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    analysis_data = await ai_service.analyze_job_description(job.raw_description, job.title, job.company)
    
    existing_q = select(JobAnalysis).where(JobAnalysis.job_id == job.id)
    existing_res = await db.execute(existing_q)
    analysis = existing_res.scalar_one_or_none()

    if not analysis:
        analysis = JobAnalysis(job_id=job.id)
        db.add(analysis)

    analysis.extracted_title = analysis_data.get("extracted_title")
    analysis.extracted_company = analysis_data.get("extracted_company")
    analysis.extracted_location = analysis_data.get("extracted_location")
    analysis.required_skills = analysis_data.get("required_skills", [])
    analysis.preferred_skills = analysis_data.get("preferred_skills", [])
    analysis.technical_keywords = analysis_data.get("technical_keywords", [])
    analysis.soft_skills = analysis_data.get("soft_skills", [])
    analysis.responsibilities = analysis_data.get("responsibilities", [])
    analysis.education_requirements = analysis_data.get("education_requirements", [])
    analysis.experience_years_min = analysis_data.get("experience_years_min", 2.0)
    analysis.work_mode = analysis_data.get("work_mode")
    analysis.key_takeaways = analysis_data.get("key_takeaways", [])
    analysis.raw_analysis_json = analysis_data

    await db.commit()
    await db.refresh(analysis)
    return analysis

@router.post("/{job_id}/match", response_model=JobMatchOut)
async def match_job_for_user(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    job_q = select(Job).where(Job.id == job_id).options(selectinload(Job.analysis))
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
    if not profile:
        raise HTTPException(status_code=400, detail="Please complete your profile before generating match scores.")

    profile_dict = {
        "years_of_experience": profile.years_of_experience,
        "work_mode_preference": profile.work_mode_preference,
        "preferred_locations": profile.preferred_locations,
        "current_city": profile.current_city,
        "skills": [{"name": s.name, "category": s.category} for s in profile.skills],
        "experiences": [{"company": e.company, "position": e.position} for e in profile.experiences],
        "educations": [{"degree": ed.degree} for ed in profile.educations]
    }

    match_res = job_matcher.calculate_match(
        profile_dict=profile_dict,
        job_dict={"work_mode": job.work_mode, "location": job.location, "salary_min": job.salary_min, "salary_max": job.salary_max},
        analysis_dict=job.analysis.raw_analysis_json if job.analysis else {}
    )

    existing_q = select(JobMatch).where((JobMatch.user_id == current_user.id) & (JobMatch.job_id == job.id))
    existing_res = await db.execute(existing_q)
    match_rec = existing_res.scalar_one_or_none()

    if not match_rec:
        match_rec = JobMatch(user_id=current_user.id, job_id=job.id)
        db.add(match_rec)

    match_rec.overall_score = match_res["overall_score"]
    match_rec.skills_score = match_res["skills_score"]
    match_rec.experience_score = match_res["experience_score"]
    match_rec.education_score = match_res["education_score"]
    match_rec.location_score = match_res["location_score"]
    match_rec.preferences_score = match_res["preferences_score"]
    match_rec.matched_skills = match_res["matched_skills"]
    match_rec.missing_skills = match_res["missing_skills"]
    match_rec.explanation = match_res["explanation"]
    match_rec.recommendations = match_res["recommendations"]

    await db.commit()
    await db.refresh(match_rec)
    return match_rec
