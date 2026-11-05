import logging
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.provider_manager import provider_manager, AIExecutionResult
from app.ai.token_manager import token_manager
from app.ai.hallucination_guard import hallucination_guard
from app.ai.embeddings import embedding_engine

from app.ai.agents.job_discovery_agent import job_discovery_agent
from app.ai.agents.job_matching_agent import job_matching_agent
from app.ai.agents.resume_agent import resume_agent
from app.ai.agents.cover_letter_agent import cover_letter_agent
from app.ai.agents.interview_agent import interview_agent
from app.ai.agents.career_advisor_agent import career_advisor_agent
from app.ai.agents.application_agent import application_agent

logger = logging.getLogger("jobpilot.ai.orchestrator")

class AIOrchestrator:
    """
    Master coordinator for all AI operations, agents, governance,
    observability, and factual verification.
    """

    def __init__(self):
        self.provider_manager = provider_manager
        self.token_manager = token_manager
        self.hallucination_guard = hallucination_guard
        self.embedding_engine = embedding_engine

        # Agents
        self.job_discovery = job_discovery_agent
        self.job_matching = job_matching_agent
        self.resume = resume_agent
        self.cover_letter = cover_letter_agent
        self.interview = interview_agent
        self.career_advisor = career_advisor_agent
        self.application = application_agent

    # 1. Job Intelligence
    async def analyze_job(
        self,
        raw_text: str,
        title: Optional[str] = None,
        company: Optional[str] = None,
        db: Optional[AsyncSession] = None,
        user_id: Optional[str] = None,
        provider_override: Optional[str] = None
    ) -> Dict[str, Any]:
        result = await self.job_discovery.analyze_job_description(
            raw_text=raw_text,
            title=title,
            company=company,
            provider_override=provider_override
        )
        if db and user_id:
            await self.token_manager.log_generation(
                db=db,
                user_id=user_id,
                prompt_type="job_analysis",
                provider_used=result.get("ai_provider", "built-in"),
                model_name=result.get("model_used"),
                tokens_used=result.get("tokens_used", 100)
            )
        return result

    # 2. Match Scoring
    def calculate_match(
        self,
        profile_dict: Dict[str, Any],
        job_dict: Dict[str, Any],
        analysis_dict: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        return self.job_matching.evaluate_match(
            profile_dict=profile_dict,
            job_dict=job_dict,
            analysis_dict=analysis_dict
        )

    # 3. Resume Tailoring
    async def tailor_resume(
        self,
        profile_dict: Dict[str, Any],
        job_dict: Dict[str, Any],
        analysis_dict: Optional[Dict[str, Any]] = None,
        db: Optional[AsyncSession] = None,
        user_id: Optional[str] = None,
        provider_override: Optional[str] = None
    ) -> Dict[str, Any]:
        result = await self.resume.tailor_resume(
            profile_dict=profile_dict,
            job_dict=job_dict,
            analysis_dict=analysis_dict,
            provider_override=provider_override
        )
        if db and user_id:
            await self.token_manager.log_generation(
                db=db,
                user_id=user_id,
                prompt_type="resume_tailor",
                provider_used=result.get("ai_provider", "built-in"),
                model_name="resume-agent",
                tokens_used=500
            )
        return result

    # 4. Cover Letter
    async def generate_cover_letter(
        self,
        profile_dict: Dict[str, Any],
        job_dict: Dict[str, Any],
        tone: str = "Professional & Impactful",
        db: Optional[AsyncSession] = None,
        user_id: Optional[str] = None,
        provider_override: Optional[str] = None
    ) -> Dict[str, Any]:
        result = await self.cover_letter.generate_cover_letter(
            profile_dict=profile_dict,
            job_dict=job_dict,
            tone=tone,
            provider_override=provider_override
        )
        if db and user_id:
            await self.token_manager.log_generation(
                db=db,
                user_id=user_id,
                prompt_type="cover_letter",
                provider_used=result.get("ai_provider", "built-in"),
                model_name="cover-letter-agent",
                tokens_used=350
            )
        return result

    # 5. Career Advisor Chat
    async def chat_with_advisor(
        self,
        message: str,
        profile_dict: Dict[str, Any],
        job_dict: Optional[Dict[str, Any]] = None,
        analysis_dict: Optional[Dict[str, Any]] = None,
        history: Optional[List[Dict[str, str]]] = None,
        db: Optional[AsyncSession] = None,
        user_id: Optional[str] = None,
        provider_override: Optional[str] = None
    ) -> Dict[str, Any]:
        result = await self.career_advisor.chat(
            message=message,
            profile_dict=profile_dict,
            job_dict=job_dict,
            analysis_dict=analysis_dict,
            history=history,
            provider_override=provider_override
        )
        if db and user_id:
            await self.token_manager.log_generation(
                db=db,
                user_id=user_id,
                prompt_type="career_chat",
                provider_used=result.get("ai_provider", "built-in"),
                model_name=result.get("model_used"),
                tokens_used=result.get("tokens_used", 250)
            )
        return result

    # 6. Interview Questions & Mock Evaluation
    async def generate_interview_questions(
        self,
        job_dict: Dict[str, Any],
        profile_dict: Optional[Dict[str, Any]] = None,
        analysis_dict: Optional[Dict[str, Any]] = None,
        provider_override: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        return await self.interview.generate_interview_questions(
            job_dict=job_dict,
            profile_dict=profile_dict,
            analysis_dict=analysis_dict,
            provider_override=provider_override
        )

    async def evaluate_mock_interview_answer(
        self,
        question: str,
        answer: str,
        job_context: Optional[Dict[str, Any]] = None,
        db: Optional[AsyncSession] = None,
        user_id: Optional[str] = None,
        provider_override: Optional[str] = None
    ) -> Dict[str, Any]:
        result = await self.interview.evaluate_mock_answer(
            question=question,
            answer=answer,
            job_context=job_context,
            provider_override=provider_override
        )
        if db and user_id:
            await self.token_manager.log_generation(
                db=db,
                user_id=user_id,
                prompt_type="interview_prep",
                provider_used=result.get("ai_provider", "built-in"),
                model_name="interview-evaluator",
                tokens_used=300
            )
        return result

    # 7. Application Form Assistant
    def map_application_fields(
        self,
        form_fields: List[Dict[str, Any]],
        profile_dict: Dict[str, Any]
    ) -> Dict[str, Any]:
        return self.application.map_application_fields(
            form_fields=form_fields,
            profile_dict=profile_dict
        )

    def generate_screening_answer(
        self,
        question: str,
        profile_dict: Dict[str, Any]
    ) -> Dict[str, Any]:
        return self.application.generate_screening_answer(
            question=question,
            profile_dict=profile_dict
        )

ai_orchestrator = AIOrchestrator()

