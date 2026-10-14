import os
import uuid
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import User, Profile, Job, JobAnalysis, MasterResume, ResumeVersion, Skill, Experience, Education
from app.schemas.schemas import MasterResumeOut, ResumeVersionOut, ResumeVersionUpdate, TailorResumeRequest
from app.services.resume_parser import resume_parser
from app.services.resume_generator import resume_generator, sanitize_filename
from app.services.ai_service import ai_service

router = APIRouter(prefix="/resumes", tags=["Resumes & Tailoring"])

@router.post("/upload", response_model=MasterResumeOut)
async def upload_resume(
    file: UploadFile = File(...),
    set_as_default: bool = Form(True),
    sync_to_profile: bool = Form(True),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Validate extension
    ext = file.filename.split(".")[-1].lower()
    if ext not in ["pdf", "docx", "doc", "txt"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. Please upload PDF, DOCX, or TXT."
        )

    # Save file
    file_bytes = await file.read()
    if len(file_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds maximum limit of 10MB.")

    saved_filename = f"{current_user.id}_{uuid.uuid4().hex[:8]}_{sanitize_filename(file.filename)}"
    saved_path = os.path.join(settings.UPLOAD_DIR, saved_filename)
    
    with open(saved_path, "wb") as f:
        f.write(file_bytes)

    # Extract text & parse
    raw_text, parsed_data = await resume_parser.parse_file(file.filename, file_bytes)

    # Reset prior default if this is default
    if set_as_default:
        existing_res_q = select(MasterResume).where(MasterResume.user_id == current_user.id)
        existing_res = await db.execute(existing_res_q)
        for r in existing_res.scalars().all():
            r.is_default = False

    # Get version count
    count_q = select(MasterResume).where(MasterResume.user_id == current_user.id)
    count_res = await db.execute(count_q)
    version_num = len(count_res.scalars().all()) + 1

    master_res = MasterResume(
        user_id=current_user.id,
        file_name=file.filename,
        file_path=saved_path,
        file_type=ext,
        raw_text=raw_text,
        parsed_data=parsed_data,
        is_default=set_as_default,
        version=version_num
    )
    db.add(master_res)

    # Sync parsed elements to user profile if requested
    if sync_to_profile:
        prof_q = select(Profile).where(Profile.user_id == current_user.id).options(
            selectinload(Profile.skills),
            selectinload(Profile.experiences),
            selectinload(Profile.educations)
        )
        prof_res = await db.execute(prof_q)
        profile = prof_res.scalar_one_or_none()
        if profile:
            if not profile.summary and parsed_data.get("summary"):
                profile.summary = parsed_data["summary"]
            if not profile.phone and parsed_data.get("phone"):
                profile.phone = parsed_data["phone"]
            if not profile.linkedin_url and parsed_data.get("linkedin_url"):
                profile.linkedin_url = parsed_data["linkedin_url"]
            if not profile.github_url and parsed_data.get("github_url"):
                profile.github_url = parsed_data["github_url"]

            # Add skills that do not exist yet
            existing_skill_names = [s.name.lower() for s in profile.skills]
            for sk in parsed_data.get("skills", []):
                if sk.lower() not in existing_skill_names:
                    db.add(Skill(profile_id=profile.id, name=sk, category="Technical"))

            # Add experience if profile has none
            if not profile.experiences and parsed_data.get("experiences"):
                for exp in parsed_data["experiences"]:
                    db.add(Experience(
                        profile_id=profile.id,
                        company=exp.get("company", "Company"),
                        position=exp.get("position", "Role"),
                        description=exp.get("description", ""),
                        bullet_points=exp.get("bullet_points", []),
                        technologies=exp.get("technologies", [])
                    ))

            # Add education if profile has none
            if not profile.educations and parsed_data.get("educations"):
                for edu in parsed_data["educations"]:
                    db.add(Education(
                        profile_id=profile.id,
                        institution=edu.get("institution", "University"),
                        degree=edu.get("degree", "Degree"),
                        field_of_study=edu.get("field_of_study", "")
                    ))

    await db.commit()
    await db.refresh(master_res)
    return master_res

@router.get("", response_model=List[MasterResumeOut])
async def list_master_resumes(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    query = select(MasterResume).where(MasterResume.user_id == current_user.id).order_by(MasterResume.created_at.desc())
    res = await db.execute(query)
    return res.scalars().all()

@router.get("/versions", response_model=List[ResumeVersionOut])
async def list_tailored_versions(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    query = select(ResumeVersion).where(ResumeVersion.user_id == current_user.id).order_by(ResumeVersion.created_at.desc())
    res = await db.execute(query)
    return res.scalars().all()

@router.get("/versions/{version_id}", response_model=ResumeVersionOut)
async def get_tailored_version(version_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    query = select(ResumeVersion).where((ResumeVersion.id == version_id) & (ResumeVersion.user_id == current_user.id))
    res = await db.execute(query)
    version = res.scalar_one_or_none()
    if not version:
        raise HTTPException(status_code=404, detail="Tailored resume version not found.")
    return version

@router.put("/versions/{version_id}", response_model=ResumeVersionOut)
async def update_tailored_version(
    version_id: str,
    update_in: ResumeVersionUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(ResumeVersion).where((ResumeVersion.id == version_id) & (ResumeVersion.user_id == current_user.id))
    res = await db.execute(query)
    version = res.scalar_one_or_none()
    if not version:
        raise HTTPException(status_code=404, detail="Tailored resume version not found.")

    up_data = update_in.dict(exclude_unset=True)
    for k, v in up_data.items():
        setattr(version, k, v)

    # Re-generate PDF and DOCX
    prof_q = select(Profile).where(Profile.user_id == current_user.id)
    prof_res = await db.execute(prof_q)
    prof = prof_res.scalar_one_or_none()
    user_prof = {
        "full_name": current_user.full_name,
        "email": current_user.email,
        "phone": prof.phone if prof else "",
        "current_city": prof.current_city if prof else "",
        "linkedin_url": prof.linkedin_url if prof else "",
        "github_url": prof.github_url if prof else ""
    }

    base_fname = f"{sanitize_filename(version.target_job_title or 'Resume')}_{sanitize_filename(version.target_company or 'Company')}"
    pdf_filename = f"{base_fname}_{version.id[:8]}.pdf"
    docx_filename = f"{base_fname}_{version.id[:8]}.docx"

    resume_dict = {
        "summary": version.summary,
        "skills_section": version.skills_section,
        "experience_section": version.experience_section,
        "education_section": version.education_section,
        "projects_section": version.projects_section,
        "certifications_section": version.certifications_section
    }

    pdf_path = resume_generator.generate_pdf(resume_dict, user_prof, pdf_filename)
    docx_path = resume_generator.generate_docx(resume_dict, user_prof, docx_filename)

    version.pdf_path = pdf_path
    version.docx_path = docx_path
    version.updated_at = datetime.datetime.utcnow()

    await db.commit()
    await db.refresh(version)
    return version

@router.post("/tailor", response_model=ResumeVersionOut)
async def tailor_resume_for_job(
    req: TailorResumeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Fetch job
    job_q = select(Job).where(Job.id == req.job_id).options(selectinload(Job.analysis))
    job_res = await db.execute(job_q)
    job = job_res.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Selected job posting not found.")

    # Ensure job has analysis
    if not job.analysis:
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
        job_analysis = job.analysis

    # Fetch User Profile
    prof_q = select(Profile).where(Profile.user_id == current_user.id).options(
        selectinload(Profile.skills),
        selectinload(Profile.experiences),
        selectinload(Profile.educations),
        selectinload(Profile.projects),
        selectinload(Profile.certifications)
    )
    prof_res = await db.execute(prof_q)
    profile = prof_res.scalar_one_or_none()

    # Form master profile dictionary
    master_profile_dict = {
        "full_name": current_user.full_name,
        "email": current_user.email,
        "phone": profile.phone if profile else "",
        "current_city": profile.current_city if profile else "",
        "linkedin_url": profile.linkedin_url if profile else "",
        "github_url": profile.github_url if profile else "",
        "years_of_experience": profile.years_of_experience if profile else 2.0,
        "summary": profile.summary if profile else "",
        "skills": [{"name": s.name, "category": s.category} for s in profile.skills] if profile else [],
        "experiences": [
            {
                "company": e.company,
                "position": e.position,
                "location": e.location,
                "start_date": e.start_date,
                "end_date": e.end_date,
                "is_current": e.is_current,
                "description": e.description,
                "bullet_points": e.bullet_points,
                "technologies": e.technologies
            } for e in profile.experiences
        ] if profile else [],
        "educations": [
            {
                "institution": ed.institution,
                "degree": ed.degree,
                "field_of_study": ed.field_of_study,
                "start_date": ed.start_date,
                "end_date": ed.end_date
            } for ed in profile.educations
        ] if profile else [],
        "projects": [
            {
                "title": p.title,
                "description": p.description,
                "technologies": p.technologies,
                "key_achievements": p.key_achievements
            } for p in profile.projects
        ] if profile else [],
        "certifications": [
            {
                "name": c.name,
                "issuing_organization": c.issuing_organization,
                "issue_date": c.issue_date
            } for c in profile.certifications
        ] if profile else []
    }

    # Execute Tailoring
    tailored_result = await ai_service.tailor_resume(
        master_profile=master_profile_dict,
        job_data={"title": job.title, "company": job.company},
        job_analysis=job_analysis.raw_analysis_json or {},
        target_emphasis=req.target_emphasis
    )

    version_id = uuid.uuid4().hex[:8]
    base_fname = f"{sanitize_filename(job.title)}_{sanitize_filename(job.company)}_Resume"
    pdf_filename = f"{base_fname}_{version_id}.pdf"
    docx_filename = f"{base_fname}_{version_id}.docx"

    pdf_path = resume_generator.generate_pdf(tailored_result, master_profile_dict, pdf_filename)
    docx_path = resume_generator.generate_docx(tailored_result, master_profile_dict, docx_filename)

    resume_version = ResumeVersion(
        user_id=current_user.id,
        job_id=job.id,
        master_resume_id=req.master_resume_id,
        title=tailored_result["title"],
        target_job_title=job.title,
        target_company=job.company,
        summary=tailored_result["summary"],
        skills_section=tailored_result["skills_section"],
        experience_section=tailored_result["experience_section"],
        education_section=tailored_result["education_section"],
        projects_section=tailored_result["projects_section"],
        certifications_section=tailored_result["certifications_section"],
        match_score=tailored_result["match_score"],
        ats_score=tailored_result["ats_score"],
        ats_breakdown=tailored_result["ats_breakdown"],
        matched_keywords=tailored_result["matched_keywords"],
        missing_keywords=tailored_result["missing_keywords"],
        pdf_path=pdf_path,
        docx_path=docx_path,
        is_tailored=True
    )
    db.add(resume_version)
    await db.commit()
    await db.refresh(resume_version)
    return resume_version

@router.get("/versions/{version_id}/download")
async def download_resume_version(
    version_id: str,
    format: str = Query("pdf", pattern="^(pdf|docx)$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(ResumeVersion).where((ResumeVersion.id == version_id) & (ResumeVersion.user_id == current_user.id))
    res = await db.execute(query)
    version = res.scalar_one_or_none()
    if not version:
        raise HTTPException(status_code=404, detail="Resume version not found.")

    target_path = version.pdf_path if format == "pdf" else version.docx_path
    if not target_path or not os.path.exists(target_path):
        raise HTTPException(status_code=404, detail=f"Generated {format.upper()} document file not found on disk.")

    download_name = f"{sanitize_filename(version.target_job_title or 'Job')}_{sanitize_filename(version.target_company or 'Company')}_Resume.{format}"
    media_type = "application/pdf" if format == "pdf" else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    
    return FileResponse(
        path=target_path,
        filename=download_name,
        media_type=media_type
    )

@router.delete("/{resume_id}")
async def delete_master_resume(
    resume_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(MasterResume).where((MasterResume.id == resume_id) & (MasterResume.user_id == current_user.id))
    res = await db.execute(query)
    master_res = res.scalar_one_or_none()
    if not master_res:
        raise HTTPException(status_code=404, detail="Master resume not found.")

    if master_res.file_path and os.path.exists(master_res.file_path):
        try:
            os.remove(master_res.file_path)
        except Exception:
            pass

    await db.delete(master_res)
    await db.commit()
    return {"status": "success"}
