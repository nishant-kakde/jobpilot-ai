from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import User, Profile, Education, Experience, Skill, Project, Certification
from app.schemas.schemas import (
    ProfileOut, ProfileUpdate,
    EducationCreate, EducationOut,
    ExperienceCreate, ExperienceOut,
    SkillCreate, SkillOut,
    ProjectCreate, ProjectOut,
    CertificationCreate, CertificationOut
)

router = APIRouter(prefix="/profile", tags=["Profile"])

@router.get("", response_model=ProfileOut)
async def get_profile(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    query = (
        select(Profile)
        .where(Profile.user_id == current_user.id)
        .options(
            selectinload(Profile.educations),
            selectinload(Profile.experiences),
            selectinload(Profile.skills),
            selectinload(Profile.projects),
            selectinload(Profile.certifications)
        )
    )
    result = await db.execute(query)
    profile = result.scalar_one_or_none()
    if not profile:
        profile = Profile(user_id=current_user.id)
        db.add(profile)
        await db.commit()
        result = await db.execute(query)
        profile = result.scalar_one()
    return profile

@router.put("", response_model=ProfileOut)
async def update_profile(
    profile_in: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Profile).where(Profile.user_id == current_user.id).options(
        selectinload(Profile.educations),
        selectinload(Profile.experiences),
        selectinload(Profile.skills),
        selectinload(Profile.projects),
        selectinload(Profile.certifications)
    )
    result = await db.execute(query)
    profile = result.scalar_one_or_none()
    if not profile:
        profile = Profile(user_id=current_user.id)
        db.add(profile)

    update_data = profile_in.dict(exclude_unset=True)
    for field, val in update_data.items():
        setattr(profile, field, val)

    await db.commit()
    reload_res = await db.execute(query)
    return reload_res.scalar_one()

# ---- Education ----
@router.post("/educations", response_model=EducationOut)
async def add_education(
    edu_in: EducationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    prof_q = select(Profile).where(Profile.user_id == current_user.id)
    prof_res = await db.execute(prof_q)
    profile = prof_res.scalar_one_or_none()
    
    edu = Education(profile_id=profile.id, **edu_in.dict())
    db.add(edu)
    await db.commit()
    await db.refresh(edu)
    return edu

@router.delete("/educations/{edu_id}")
async def delete_education(
    edu_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    edu_q = select(Education).join(Profile).where((Education.id == edu_id) & (Profile.user_id == current_user.id))
    edu_res = await db.execute(edu_q)
    edu = edu_res.scalar_one_or_none()
    if not edu:
        raise HTTPException(status_code=404, detail="Education record not found")
    await db.delete(edu)
    await db.commit()
    return {"status": "success"}

# ---- Experience ----
@router.post("/experiences", response_model=ExperienceOut)
async def add_experience(
    exp_in: ExperienceCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    prof_q = select(Profile).where(Profile.user_id == current_user.id)
    prof_res = await db.execute(prof_q)
    profile = prof_res.scalar_one_or_none()
    
    exp = Experience(profile_id=profile.id, **exp_in.dict())
    db.add(exp)
    await db.commit()
    await db.refresh(exp)
    return exp

@router.delete("/experiences/{exp_id}")
async def delete_experience(
    exp_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    exp_q = select(Experience).join(Profile).where((Experience.id == exp_id) & (Profile.user_id == current_user.id))
    exp_res = await db.execute(exp_q)
    exp = exp_res.scalar_one_or_none()
    if not exp:
        raise HTTPException(status_code=404, detail="Experience record not found")
    await db.delete(exp)
    await db.commit()
    return {"status": "success"}

# ---- Skills ----
@router.post("/skills", response_model=SkillOut)
async def add_skill(
    skill_in: SkillCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    prof_q = select(Profile).where(Profile.user_id == current_user.id)
    prof_res = await db.execute(prof_q)
    profile = prof_res.scalar_one_or_none()
    
    skill = Skill(profile_id=profile.id, **skill_in.dict())
    db.add(skill)
    await db.commit()
    await db.refresh(skill)
    return skill

@router.delete("/skills/{skill_id}")
async def delete_skill(
    skill_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    skill_q = select(Skill).join(Profile).where((Skill.id == skill_id) & (Profile.user_id == current_user.id))
    skill_res = await db.execute(skill_q)
    skill = skill_res.scalar_one_or_none()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill record not found")
    await db.delete(skill)
    await db.commit()
    return {"status": "success"}

# ---- Projects ----
@router.post("/projects", response_model=ProjectOut)
async def add_project(
    proj_in: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    prof_q = select(Profile).where(Profile.user_id == current_user.id)
    prof_res = await db.execute(prof_q)
    profile = prof_res.scalar_one_or_none()
    
    proj = Project(profile_id=profile.id, **proj_in.dict())
    db.add(proj)
    await db.commit()
    await db.refresh(proj)
    return proj

@router.delete("/projects/{proj_id}")
async def delete_project(
    proj_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    proj_q = select(Project).join(Profile).where((Project.id == proj_id) & (Profile.user_id == current_user.id))
    proj_res = await db.execute(proj_q)
    proj = proj_res.scalar_one_or_none()
    if not proj:
        raise HTTPException(status_code=404, detail="Project record not found")
    await db.delete(proj)
    await db.commit()
    return {"status": "success"}

# ---- Certifications ----
@router.post("/certifications", response_model=CertificationOut)
async def add_certification(
    cert_in: CertificationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    prof_q = select(Profile).where(Profile.user_id == current_user.id)
    prof_res = await db.execute(prof_q)
    profile = prof_res.scalar_one_or_none()
    
    cert = Certification(profile_id=profile.id, **cert_in.dict())
    db.add(cert)
    await db.commit()
    await db.refresh(cert)
    return cert

@router.delete("/certifications/{cert_id}")
async def delete_certification(
    cert_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    cert_q = select(Certification).join(Profile).where((Certification.id == cert_id) & (Profile.user_id == current_user.id))
    cert_res = await db.execute(cert_q)
    cert = cert_res.scalar_one_or_none()
    if not cert:
        raise HTTPException(status_code=404, detail="Certification record not found")
    await db.delete(cert)
    await db.commit()
    return {"status": "success"}
