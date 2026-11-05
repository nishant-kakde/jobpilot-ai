import datetime
import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import User, Profile, CareerRoadmap
from app.schemas.schemas import CareerRoadmapCreate, CareerRoadmapOut
from app.ai.ai_orchestrator import ai_orchestrator
from app.ai.prompt_manager import prompt_manager
from app.ai.provider_manager import provider_manager
from app.ai.context_manager import context_manager
from app.ai.structured_output import structured_output_parser

logger = logging.getLogger("jobpilot.api.roadmap")

router = APIRouter(prefix="/roadmap", tags=["AI Career Roadmap"])

@router.get("", response_model=List[CareerRoadmapOut])
async def list_roadmaps(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns all generated career transition and learning roadmaps for the user.
    """
    q = select(CareerRoadmap).where(CareerRoadmap.user_id == current_user.id).order_by(CareerRoadmap.created_at.desc())
    res = await db.execute(q)
    return res.scalars().all()

@router.post("/generate", response_model=CareerRoadmapOut)
async def generate_career_roadmap(
    req: CareerRoadmapCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Synthesizes candidate background and target role into a comprehensive 30/60/90-day learning roadmap.
    """
    prof_q = select(Profile).where(Profile.user_id == current_user.id).options(
        selectinload(Profile.skills),
        selectinload(Profile.experiences),
        selectinload(Profile.educations),
        selectinload(Profile.projects)
    )
    prof_res = await db.execute(prof_q)
    profile = prof_res.scalar_one_or_none()

    profile_dict = {
        "full_name": current_user.full_name,
        "years_of_experience": profile.years_of_experience if profile else 2.0,
        "skills": [{"name": s.name} for s in profile.skills] if profile else [],
        "experiences": [{"position": e.position, "company": e.company} for e in profile.experiences] if profile else [],
        "educations": [{"degree": ed.degree} for ed in profile.educations] if profile else []
    }

    profile_context = context_manager.format_profile_for_ai(profile_dict)
    prompts = prompt_manager.get_career_roadmap_prompt(
        candidate_profile_json=profile_context,
        target_role=req.target_role,
        weekly_hours=req.weekly_hours
    )

    ai_res = await provider_manager.execute_prompt(
        system_prompt=prompts["system_prompt"],
        user_prompt=prompts["user_prompt"],
        temperature=0.3,
        json_mode=True
    )

    roadmap_data = None
    if not ai_res.is_fallback and ai_res.content:
        parsed = structured_output_parser.extract_json(ai_res.content)
        if parsed and "milestones_30_days" in parsed:
            roadmap_data = parsed

    if not roadmap_data:
        roadmap_data = _heuristic_roadmap(profile_dict, req.target_role, req.weekly_hours)

    roadmap = CareerRoadmap(
        user_id=current_user.id,
        target_role=req.target_role,
        readiness_score=roadmap_data.get("readiness_score", 70.0),
        weekly_hours=req.weekly_hours,
        critical_skill_gaps=roadmap_data.get("critical_skill_gaps", []),
        milestones_30_days=roadmap_data.get("milestones_30_days", []),
        milestones_60_days=roadmap_data.get("milestones_60_days", []),
        milestones_90_days=roadmap_data.get("milestones_90_days", []),
        portfolio_projects=roadmap_data.get("portfolio_project_ideas", []),
        interview_readiness_plan=roadmap_data.get("interview_readiness_plan", []),
        progress_percentage=0.0
    )
    db.add(roadmap)
    await db.commit()
    await db.refresh(roadmap)

    # Log generation
    await ai_orchestrator.token_manager.log_generation(
        db=db,
        user_id=current_user.id,
        prompt_type="career_roadmap",
        provider_used=ai_res.provider,
        model_name=ai_res.model,
        tokens_used=ai_res.tokens_used or 400
    )

    return roadmap

@router.get("/{id}", response_model=CareerRoadmapOut)
async def get_roadmap(
    id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    q = select(CareerRoadmap).where(CareerRoadmap.id == id, CareerRoadmap.user_id == current_user.id)
    res = await db.execute(q)
    roadmap = res.scalar_one_or_none()
    if not roadmap:
        raise HTTPException(status_code=404, detail="Career roadmap not found.")
    return roadmap

@router.patch("/{id}/progress", response_model=CareerRoadmapOut)
async def update_roadmap_progress(
    id: str,
    progress_percentage: float,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    q = select(CareerRoadmap).where(CareerRoadmap.id == id, CareerRoadmap.user_id == current_user.id)
    res = await db.execute(q)
    roadmap = res.scalar_one_or_none()
    if not roadmap:
        raise HTTPException(status_code=404, detail="Career roadmap not found.")

    roadmap.progress_percentage = max(0.0, min(100.0, progress_percentage))
    roadmap.updated_at = datetime.datetime.now(datetime.timezone.utc)
    await db.commit()
    await db.refresh(roadmap)
    return roadmap

def _heuristic_roadmap(profile_dict: Dict[str, Any], target_role: str, weekly_hours: int) -> Dict[str, Any]:
    cand_skills = [
        (s.get("name") if isinstance(s, dict) else str(s)).lower()
        for s in profile_dict.get("skills", [])
    ]

    role_key = target_role.lower()
    if "data" in role_key and "analyst" in role_key:
        expected = ["sql", "power bi", "tableau", "python", "pandas", "excel"]
    elif "data scientist" in role_key or "machine learning" in role_key:
        expected = ["python", "machine learning", "scikit-learn", "sql", "pandas", "pytorch"]
    else:
        expected = ["python", "rest apis", "docker", "postgresql", "git", "ci/cd", "system design"]

    gaps = [e.title() for e in expected if not any(cs in e or e in cs for cs in cand_skills)]
    if not gaps:
        gaps = ["Advanced System Architecture", "Cloud Cost Optimization", "Distributed Caching"]

    readiness = max(55.0, round(100.0 - (len(gaps) * 12.0), 1))

    return {
        "target_role": target_role,
        "readiness_score": readiness,
        "critical_skill_gaps": gaps,
        "milestones_30_days": [
            {
                "week": "Weeks 1-2",
                "focus": f"Core Foundations in {gaps[0] if gaps else 'Advanced Architecture'}",
                "deliverables": "Complete hands-on reference implementations and benchmark scripts.",
                "recommended_topics": ["Official Documentation", "Practical Exercises", "Syntax & Idioms"]
            },
            {
                "week": "Weeks 3-4",
                "focus": "Practical Data Modeling & Pipeline Engineering",
                "deliverables": "Build a modular ingestion pipeline with automated verification.",
                "recommended_topics": ["Relational schemas", "Query execution plans", "Indexing"]
            }
        ],
        "milestones_60_days": [
            {
                "week": "Weeks 5-8",
                "focus": "Production Hardening & Cloud Deployments",
                "deliverables": "Containerize pipeline with Docker and deploy to free-tier cloud host.",
                "recommended_topics": ["Docker Compose", "CI/CD GitHub Actions", "Monitoring"]
            }
        ],
        "milestones_90_days": [
            {
                "week": "Weeks 9-12",
                "focus": "Portfolio Capstone & Behavioral Interview Drills",
                "deliverables": "Public GitHub repo with architecture diagram, README, and video walkthrough.",
                "recommended_topics": ["STAR interview framework", "System design mock rounds", "Salary negotiation"]
            }
        ],
        "portfolio_project_ideas": [
            {
                "title": f"Production-Grade {target_role} Benchmark Platform",
                "description": "An end-to-end data pipeline ingesting live metrics and serving an interactive analytical dashboard.",
                "tech_stack": [gaps[0] if gaps else "Python", "SQL", "Docker", "FastAPI"],
                "business_impact": "Demonstrates capability to ship robust production systems independently."
            }
        ],
        "interview_readiness_plan": [
            "Review core CS fundamentals and data structure trade-offs weekly.",
            "Draft 5 STAR stories covering challenging deadlines, outages, and cross-team consensus.",
            "Practice live coding on standard whiteboard platforms 3 times per week."
        ]
    }

