import re
import json
import logging
from typing import Dict, Any, List, Optional

from app.ai.provider_manager import provider_manager
from app.ai.prompt_manager import prompt_manager
from app.ai.context_manager import context_manager
from app.ai.structured_output import structured_output_parser

logger = logging.getLogger("jobpilot.ai.career_advisor_agent")

class CareerAdvisorAgent:
    """
    Conversational AI Career Counselor grounded in real-time user profile,
    application history, and active job market telemetry.
    """

    async def chat(
        self,
        message: str,
        profile_dict: Dict[str, Any],
        job_dict: Optional[Dict[str, Any]] = None,
        analysis_dict: Optional[Dict[str, Any]] = None,
        history: Optional[List[Dict[str, str]]] = None,
        provider_override: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Processes conversational career advisory queries with candidate grounding.
        """
        profile_context = context_manager.format_profile_for_ai(profile_dict)
        job_context = context_manager.format_job_for_ai(job_dict or {}) if job_dict else "None"
        formatted_history = context_manager.format_conversation_history(history or [])

        system_prompt = (
            "You are JobPilot AI's Senior AI Career Copilot. "
            "You provide sharp, encouraging, and deeply personalized career guidance.\n"
            "RULES:\n"
            "1. Ground all responses in the candidate's actual profile facts, skills, and target roles.\n"
            "2. Never fabricate degrees, employers, or unrealistic course guarantees.\n"
            "3. If candidate asks about specific gaps, pinpoint their actual missing skills transparently.\n"
            "4. Return a JSON object with:\n"
            "   - response: str (detailed, markdown-formatted response)\n"
            "   - suggested_followups: list of str (2-3 contextual follow-up questions)\n"
            "   - key_insights: list of str (bullet takeaways)\n\n"
            + prompt_manager.ANTI_HALLUCINATION_DIRECTIVE
        )

        history_str = "\n".join([f"{h['role'].title()}: {h['content']}" for h in formatted_history])
        user_prompt = (
            f"Candidate Background:\n{profile_context}\n\n"
            f"Active Job Context:\n{job_context}\n\n"
            f"Conversation History:\n{history_str}\n\n"
            f"Candidate Query: {message}"
        )

        result = await provider_manager.execute_prompt(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=0.4,
            provider_override=provider_override,
            json_mode=True
        )

        if not result.is_fallback and result.content:
            parsed = structured_output_parser.extract_json(result.content)
            if parsed and "response" in parsed:
                parsed["ai_provider"] = result.provider
                parsed["model_used"] = result.model
                parsed["is_fallback"] = False
                parsed["tokens_used"] = result.tokens_used
                return parsed

        # Intelligent Intent-Aware Heuristic Counselor
        return self._heuristic_counselor(message, profile_dict, job_dict, analysis_dict)

    def _heuristic_counselor(
        self,
        query: str,
        profile_dict: Dict[str, Any],
        job_dict: Optional[Dict[str, Any]],
        analysis_dict: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        q_lower = query.lower()
        cand_name = profile_dict.get("full_name") or "there"
        cand_years = profile_dict.get("years_of_experience", 2.0)
        skills = [
            (s.get("name") if isinstance(s, dict) else str(s))
            for s in profile_dict.get("skills", [])
        ]
        target_roles = profile_dict.get("target_job_titles", ["Software Engineer"])

        # Intent 1: Skill Gaps or What to learn
        if any(w in q_lower for w in ["learn", "skill gap", "missing", "improve skill", "data analyst", "data scientist"]):
            if job_dict and analysis_dict:
                missing = analysis_dict.get("required_skills", [])
                response = (
                    f"### Skill Gap Analysis for **{job_dict.get('title', 'Target Role')}**\n\n"
                    f"Comparing your profile ({len(skills)} verified skills) against this position:\n\n"
                    f"- **Verified Strengths**: You already have strong grounding in `{', '.join(skills[:4])}`.\n"
                    f"- **Recommended Priority Skills**: Deepen your hands-on mastery in `{', '.join(missing[:3])}`.\n\n"
                    f"**Next Step**: Tailor your resume project bullet points to showcase how you apply these skills to solve measurable business problems."
                )
            else:
                target = target_roles[0] if target_roles else "your target role"
                response = (
                    f"### Recommended Skill Mastery for **{target}**\n\n"
                    f"Based on your {cand_years} years of experience and background in `{', '.join(skills[:3])}`:\n\n"
                    f"1. **Modern Core Stack**: Ensure complete fluency with end-to-end delivery in `{skills[0] if skills else 'Python'}`.\n"
                    f"2. **Data & Infrastructure**: Deepen advanced SQL query optimization and cloud containerization (Docker, AWS/GCP).\n"
                    f"3. **Production Deployment**: Build a public portfolio project demonstrating REST API architecture and automated regression testing."
                )
            followups = [
                "How do I highlight these skills in my resume?",
                "Can you generate a 30-day study plan?",
                "Analyze my fit for another position."
            ]

        # Intent 2: Why not getting interview calls / ATS
        elif any(w in q_lower for w in ["interview calls", "rejection", "not getting calls", "ats score", "resume feedback"]):
            response = (
                f"### Diagnostic: Enhancing Your Application Conversion Rate\n\n"
                f"Here are the top three strategic factors to elevate your callback rate:\n\n"
                f"1. **ATS Keyword Alignment**: Ensure verified keywords from the specific job description appear verbatim in your top experience bullet points.\n"
                f"2. **Quantified Accomplishments**: Replace descriptive duties with impact-driven metrics (e.g. *'Reduced query execution latency by 35% across 200k daily requests'*).\n"
                f"3. **Targeted Cover Letters**: Submit a role-specific cover letter tailored with JobPilot AI highlighting your specific alignment with the company's tech stack."
            )
            followups = [
                "Review my resume against my active target job.",
                "How can I tailor my bullet points with metrics?",
                "Prepare interview questions for my upcoming rounds."
            ]

        # Intent 3: Salary Expectation
        elif any(w in q_lower for w in ["salary", "compensation", "earn", "expect"]):
            min_sal = profile_dict.get("expected_salary_min", 90000)
            max_sal = profile_dict.get("expected_salary_max", 130000)
            currency = profile_dict.get("salary_currency", "USD")
            response = (
                f"### Market Compensation Guidance\n\n"
                f"With **{cand_years} years of verified experience** in `{', '.join(skills[:3])}` and target role of **{target_roles[0] if target_roles else 'Engineer'}**:\n\n"
                f"- **Market Benchmark**: Realistic range in your target locations is approximately **{min_sal:,.0f} – {max_sal:,.0f} {currency}**.\n"
                f"- **Negotiation Leverage**: Lead negotiations by anchoring to demonstrated delivery milestones, cloud competencies, and multi-system architecture."
            )
            followups = [
                "Which high-demand skills command the highest salary bump?",
                "Help me draft a compensation negotiation talking point.",
                "Find jobs that meet my minimum compensation threshold."
            ]

        # Default General Career Guidance
        else:
            response = (
                f"Hello {cand_name}! I have reviewed your background as a **{target_roles[0] if target_roles else 'Technical Professional'}** "
                f"with {cand_years} years of experience and {len(skills)} verified competencies.\n\n"
                f"I can assist you with:\n"
                f"- **Targeted Job Suitability**: Analyzing your fit for any saved opportunity.\n"
                f"- **ATS Resume Tailoring**: Optimizing your summary and bullet points for maximum keyword relevance.\n"
                f"- **Interactive Mock Interviews**: Practicing role-specific behavioral and technical rounds with STAR scoring.\n"
                f"- **Career Roadmaps**: Formulating actionable 30/60/90-day learning schedules.\n\n"
                f"What would you like to focus on today?"
            )
            followups = [
                "Which jobs are best suited to my profile?",
                "Analyze my resume against my top job match.",
                "Create a 30-day interview prep roadmap."
            ]

        return {
            "response": response,
            "suggested_followups": followups,
            "key_insights": [
                f"Candidate profile grounded: {cand_years} years experience in {', '.join(skills[:3])}.",
                "Deterministic heuristic counselor generated response."
            ],
            "ai_provider": "built-in",
            "model_used": "deterministic-heuristics",
            "is_fallback": True,
            "tokens_used": 0
        }

career_advisor_agent = CareerAdvisorAgent()

