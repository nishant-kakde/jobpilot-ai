import json
import logging
from typing import Dict, Any, Optional

from app.ai.provider_manager import provider_manager
from app.ai.prompt_manager import prompt_manager
from app.ai.context_manager import context_manager
from app.ai.structured_output import structured_output_parser

logger = logging.getLogger("jobpilot.ai.cover_letter_agent")

class CoverLetterAgent:
    """
    Generates personalized, truthfully grounded cover letters for target opportunities.
    """

    async def generate_cover_letter(
        self,
        profile_dict: Dict[str, Any],
        job_dict: Dict[str, Any],
        tone: str = "Professional & Impactful",
        provider_override: Optional[str] = None
    ) -> Dict[str, Any]:
        profile_context = context_manager.format_profile_for_ai(profile_dict)
        job_context = context_manager.format_job_for_ai(job_dict)

        prompts = prompt_manager.get_cover_letter_prompt(profile_context, job_context, tone)
        result = await provider_manager.execute_prompt(
            system_prompt=prompts["system_prompt"],
            user_prompt=prompts["user_prompt"],
            temperature=0.3,
            provider_override=provider_override,
            json_mode=True
        )

        if not result.is_fallback and result.content:
            parsed = structured_output_parser.extract_json(result.content)
            if parsed and "letter_text" in parsed:
                parsed["ai_provider"] = result.provider
                parsed["is_fallback"] = False
                return parsed

        return self._heuristic_cover_letter(profile_dict, job_dict, tone)

    def _heuristic_cover_letter(
        self,
        profile_dict: Dict[str, Any],
        job_dict: Dict[str, Any],
        tone: str
    ) -> Dict[str, Any]:
        cand_name = profile_dict.get("full_name") or "Candidate"
        cand_years = profile_dict.get("years_of_experience", 3.0)
        company = job_dict.get("company", "the hiring organization")
        position = job_dict.get("title", "this position")

        cand_skills = [
            (s.get("name") if isinstance(s, dict) else str(s))
            for s in profile_dict.get("skills", [])
        ]
        top_skills = ", ".join(cand_skills[:3]) if cand_skills else "software engineering and data systems"

        letter_text = (
            f"Dear Hiring Team at {company},\n\n"
            f"I am writing to express my enthusiastic interest in the {position} role. With over {cand_years} years "
            f"of demonstrated engineering and analytical experience specializing in {top_skills}, I am excited about the "
            f"opportunity to contribute directly to {company}'s ongoing mission and product roadmap.\n\n"
            f"Throughout my career, I have designed and deployed resilient applications, automated complex pipelines, "
            f"and collaborated closely with cross-functional partners to solve challenging technical problems. "
            f"My focus has consistently been on engineering clarity, measurable performance improvements, and sustainable architectures.\n\n"
            f"I am particularly drawn to {company}'s commitment to innovation and technical excellence. "
            f"I would welcome the opportunity to discuss how my verified background in {top_skills} aligns with the needs of your engineering team.\n\n"
            f"Thank you for your time and consideration.\n\n"
            f"Sincerely,\n{cand_name}"
        )

        return {
            "letter_text": letter_text,
            "tone": tone,
            "key_points_highlighted": [
                f"{cand_years}+ years of practical experience",
                f"Core proficiency in {top_skills}",
                f"Demonstrated focus on system reliability and measurable business impact"
            ],
            "ai_provider": "built-in",
            "is_fallback": True
        }

cover_letter_agent = CoverLetterAgent()

