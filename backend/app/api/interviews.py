import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import User, Profile, Job, Application, Interview
from app.schemas.schemas import InterviewOut, InterviewCreate, InterviewUpdate
from app.services.ai_service import ai_service

router = APIRouter(prefix="/interviews", tags=["Interviews"])

@router.get("", response_model=List[InterviewOut])
async def list_interviews(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Interview).where(Interview.user_id == current_user.id).options(
        selectinload(Interview.application).selectinload(Application.job).selectinload(Job.analysis),
        selectinload(Interview.application).selectinload(Application.job).selectinload(Job.matches),
        selectinload(Interview.application).selectinload(Application.job).selectinload(Job.saved_entries),
        selectinload(Interview.application).selectinload(Application.events)
    ).order_by(Interview.scheduled_at.asc())
    res = await db.execute(query)
    return res.scalars().all()

@router.post("", response_model=InterviewOut)
async def create_interview(
    interview_in: InterviewCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    app_q = select(Application).where(
        (Application.id == interview_in.application_id) & (Application.user_id == current_user.id)
    ).options(selectinload(Application.job))
    app_res = await db.execute(app_q)
    application = app_res.scalar_one_or_none()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found.")

    # Automatically generate initial checklist & questions
    prof_q = select(Profile).where(Profile.user_id == current_user.id).options(
        selectinload(Profile.skills),
        selectinload(Profile.experiences)
    )
    prof_res = await db.execute(prof_q)
    profile = prof_res.scalar_one_or_none()

    profile_dict = {
        "full_name": current_user.full_name,
        "years_of_experience": profile.years_of_experience if profile else 2.0,
        "skills": [{"name": s.name} for s in profile.skills] if profile else []
    }
    job_dict = {
        "title": application.job.title if application.job else "Role",
        "company": application.job.company if application.job else "Company"
    }

    prep_data = await ai_service.generate_interview_prep(profile_dict, job_dict)

    interview = Interview(
        user_id=current_user.id,
        application_id=application.id,
        round_name=interview_in.round_name,
        scheduled_at=interview_in.scheduled_at,
        interviewer_names=interview_in.interviewer_names,
        meeting_url=interview_in.meeting_url,
        notes=interview_in.notes,
        preparation_checklist=prep_data["checklist"],
        generated_questions=prep_data["questions"]
    )
    db.add(interview)

    # Update application status if it was in earlier stage
    if application.status in ["Saved", "Interested", "Preparing", "Ready to Apply", "Applied", "Assessment"]:
        application.status = "Interview"

    await db.commit()
    
    # Reload with relationships
    reload_q = select(Interview).where(Interview.id == interview.id).options(
        selectinload(Interview.application).selectinload(Application.job).selectinload(Job.analysis),
        selectinload(Interview.application).selectinload(Application.job).selectinload(Job.matches),
        selectinload(Interview.application).selectinload(Application.job).selectinload(Job.saved_entries),
        selectinload(Interview.application).selectinload(Application.events)
    )
    reload_res = await db.execute(reload_q)
    return reload_res.scalar_one()

@router.get("/{id}", response_model=InterviewOut)
async def get_interview(
    id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Interview).where(
        (Interview.id == id) & (Interview.user_id == current_user.id)
    ).options(
        selectinload(Interview.application).selectinload(Application.job).selectinload(Job.analysis),
        selectinload(Interview.application).selectinload(Application.job).selectinload(Job.matches),
        selectinload(Interview.application).selectinload(Application.job).selectinload(Job.saved_entries),
        selectinload(Interview.application).selectinload(Application.events)
    )
    res = await db.execute(query)
    interview = res.scalar_one_or_none()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found.")
    return interview

@router.put("/{id}", response_model=InterviewOut)
async def update_interview(
    id: str,
    update_in: InterviewUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Interview).where(
        (Interview.id == id) & (Interview.user_id == current_user.id)
    ).options(
        selectinload(Interview.application).selectinload(Application.job)
    )
    res = await db.execute(query)
    interview = res.scalar_one_or_none()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found.")

    up_data = update_in.dict(exclude_unset=True)
    for k, v in up_data.items():
        setattr(interview, k, v)
    interview.updated_at = datetime.datetime.utcnow()

    await db.commit()
    
    reload_q = select(Interview).where(Interview.id == interview.id).options(
        selectinload(Interview.application).selectinload(Application.job).selectinload(Job.analysis),
        selectinload(Interview.application).selectinload(Application.job).selectinload(Job.matches),
        selectinload(Interview.application).selectinload(Application.job).selectinload(Job.saved_entries),
        selectinload(Interview.application).selectinload(Application.events)
    )
    reload_res = await db.execute(reload_q)
    return reload_res.scalar_one()

@router.post("/{id}/generate-prep", response_model=InterviewOut)
async def regenerate_interview_prep(
    id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Interview).where(
        (Interview.id == id) & (Interview.user_id == current_user.id)
    ).options(
        selectinload(Interview.application).selectinload(Application.job)
    )
    res = await db.execute(query)
    interview = res.scalar_one_or_none()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found.")

    prof_q = select(Profile).where(Profile.user_id == current_user.id).options(
        selectinload(Profile.skills),
        selectinload(Profile.experiences)
    )
    prof_res = await db.execute(prof_q)
    profile = prof_res.scalar_one_or_none()

    profile_dict = {
        "full_name": current_user.full_name,
        "years_of_experience": profile.years_of_experience if profile else 2.0,
        "skills": [{"name": s.name} for s in profile.skills] if profile else []
    }
    job_dict = {
        "title": interview.application.job.title if interview.application and interview.application.job else "Role",
        "company": interview.application.job.company if interview.application and interview.application.job else "Company"
    }

    prep_data = await ai_service.generate_interview_prep(profile_dict, job_dict)
    interview.preparation_checklist = prep_data["checklist"]
    interview.generated_questions = prep_data["questions"]
    interview.updated_at = datetime.datetime.utcnow()

    await db.commit()
    
    reload_q = select(Interview).where(Interview.id == interview.id).options(
        selectinload(Interview.application).selectinload(Application.job).selectinload(Job.analysis),
        selectinload(Interview.application).selectinload(Application.job).selectinload(Job.matches),
        selectinload(Interview.application).selectinload(Application.job).selectinload(Job.saved_entries),
        selectinload(Interview.application).selectinload(Application.events)
    )
    reload_res = await db.execute(reload_q)
    return reload_res.scalar_one()

@router.delete("/{id}")
async def delete_interview(
    id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Interview).where((Interview.id == id) & (Interview.user_id == current_user.id))
    res = await db.execute(query)
    interview = res.scalar_one_or_none()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found.")
    await db.delete(interview)
    await db.commit()
    return {"status": "success"}

# ----------------- Interactive Mock Interview Studio -----------------

from app.models.models import InterviewSession, MockInterviewAnswer
from app.schemas.schemas import (
    InterviewSessionCreate, InterviewSessionOut,
    MockInterviewAnswerSubmit, MockInterviewAnswerOut
)
from app.ai.ai_orchestrator import ai_orchestrator

@router.get("/sessions/all", response_model=List[InterviewSessionOut])
async def list_mock_interview_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns all interactive mock interview practice sessions.
    """
    q = (
        select(InterviewSession)
        .where(InterviewSession.user_id == current_user.id)
        .order_by(InterviewSession.created_at.desc())
        .options(selectinload(InterviewSession.answers))
    )
    res = await db.execute(q)
    return res.scalars().all()

@router.post("/sessions", response_model=InterviewSessionOut)
async def create_mock_interview_session(
    session_in: InterviewSessionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Creates an interactive mock interview practice session for a role or saved job.
    """
    target_role = session_in.target_role or "Software Engineer"
    job_context = {"title": target_role, "company": "Target Company"}

    if session_in.job_id:
        jq = select(Job).where(Job.id == session_in.job_id).options(selectinload(Job.analysis))
        jres = await db.execute(jq)
        job = jres.scalar_one_or_none()
        if job:
            job_context = {"title": job.title, "company": job.company}
            target_role = job.title

    session = InterviewSession(
        user_id=current_user.id,
        job_id=session_in.job_id,
        application_id=session_in.application_id,
        target_role=target_role,
        title=session_in.title or f"Mock Interview — {target_role}",
        status="in_progress"
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session

@router.get("/sessions/{session_id}", response_model=InterviewSessionOut)
async def get_mock_interview_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    q = (
        select(InterviewSession)
        .where(InterviewSession.id == session_id, InterviewSession.user_id == current_user.id)
        .options(selectinload(InterviewSession.answers))
    )
    res = await db.execute(q)
    session = res.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Mock interview session not found.")
    return session

@router.post("/sessions/{session_id}/evaluate", response_model=MockInterviewAnswerOut)
async def evaluate_mock_answer(
    session_id: str,
    answer_in: MockInterviewAnswerSubmit,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Evaluates candidate's answer using STAR methodology, communication clarity,
    and technical accuracy with AI feedback.
    """
    sq = select(InterviewSession).where(InterviewSession.id == session_id, InterviewSession.user_id == current_user.id)
    sres = await db.execute(sq)
    session = sres.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Mock interview session not found.")

    eval_result = await ai_orchestrator.evaluate_mock_interview_answer(
        question=answer_in.question,
        answer=answer_in.candidate_answer,
        job_context={"title": session.target_role or "Role"},
        db=db,
        user_id=current_user.id
    )

    answer_record = MockInterviewAnswer(
        session_id=session.id,
        question=answer_in.question,
        category=answer_in.category or "Technical",
        candidate_answer=answer_in.candidate_answer,
        overall_score=eval_result.get("overall_score", 80.0),
        technical_accuracy_score=eval_result.get("technical_accuracy_score", 80.0),
        communication_score=eval_result.get("communication_score", 85.0),
        star_framework_score=eval_result.get("star_framework_score", 75.0),
        strengths=eval_result.get("strengths", []),
        areas_for_improvement=eval_result.get("areas_for_improvement", []),
        improved_model_answer=eval_result.get("improved_model_answer"),
        actionable_tip=eval_result.get("actionable_tip")
    )
    db.add(answer_record)
    session.updated_at = datetime.datetime.now(datetime.timezone.utc)
    await db.commit()
    await db.refresh(answer_record)
    return answer_record

@router.post("/sessions/{session_id}/complete", response_model=InterviewSessionOut)
async def complete_mock_interview_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Completes session, aggregates STAR, technical, and communication scores,
    and writes performance report.
    """
    sq = (
        select(InterviewSession)
        .where(InterviewSession.id == session_id, InterviewSession.user_id == current_user.id)
        .options(selectinload(InterviewSession.answers))
    )
    sres = await db.execute(sq)
    session = sres.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Mock interview session not found.")

    if session.answers:
        avg_overall = sum(a.overall_score for a in session.answers) / len(session.answers)
        avg_tech = sum(a.technical_accuracy_score for a in session.answers) / len(session.answers)
        avg_comm = sum(a.communication_score for a in session.answers) / len(session.answers)
        avg_star = sum(a.star_framework_score for a in session.answers) / len(session.answers)

        session.overall_score = round(avg_overall, 1)
        session.technical_score = round(avg_tech, 1)
        session.communication_score = round(avg_comm, 1)
        session.star_score = round(avg_star, 1)
        session.feedback_summary = (
            f"Candidate completed {len(session.answers)} rounds with an overall score of {round(avg_overall, 1)}%. "
            f"STAR framework alignment scored {round(avg_star, 1)}%, and technical depth averaged {round(avg_tech, 1)}%."
        )
    else:
        session.overall_score = 75.0
        session.feedback_summary = "Session completed with baseline evaluation."

    session.status = "completed"
    session.updated_at = datetime.datetime.now(datetime.timezone.utc)
    await db.commit()
    await db.refresh(session)
    return session
