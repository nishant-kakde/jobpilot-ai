import json
import logging
from typing import Dict, Any, Optional, List

from app.ai.provider_manager import provider_manager
from app.ai.prompt_manager import prompt_manager
from app.ai.context_manager import context_manager
from app.ai.hallucination_guard import hallucination_guard
from app.ai.structured_output import structured_output_parser

logger = logging.getLogger("jobpilot.ai.resume_agent")

class ResumeAgent:
    """
    Intelligently tailors resumes to job descriptions with ATS readability optimization,
    keyword density checks, and strict anti-hallucination verification.
    """

    async def tailor_resume(
        self,
        profile_dict: Dict[str, Any],
        job_dict: Dict[str, Any],
        analysis_dict: Optional[Dict[str, Any]] = None,
        provider_override: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Produces a tailored resume representation grounded in the candidate's verified profile.
        """
        profile_context = context_manager.format_profile_for_ai(profile_dict)
        job_context = context_manager.format_job_for_ai(job_dict, analysis_dict)

        prompts = prompt_manager.get_resume_tailoring_prompt(profile_context, job_context)
        result = await provider_manager.execute_prompt(
            system_prompt=prompts["system_prompt"],
            user_prompt=prompts["user_prompt"],
            temperature=0.2,
            provider_override=provider_override,
            json_mode=True
        )

        tailored_data = None
        if not result.is_fallback and result.content:
            parsed = structured_output_parser.extract_json(result.content)
            if parsed and "tailored_summary" in parsed:
                tailored_data = parsed
                tailored_data["ai_provider"] = result.provider
                tailored_data["is_fallback"] = False

        if not tailored_data:
            tailored_data = self._heuristic_tailoring(profile_dict, job_dict, analysis_dict)

        # Audit against Hallucination Guard
        audit = hallucination_guard.audit_tailored_resume(tailored_data, profile_dict)
        tailored_data["factual_audit"] = audit

        return tailored_data

    def _heuristic_tailoring(
        self,
        profile_dict: Dict[str, Any],
        job_dict: Dict[str, Any],
        analysis_dict: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        analysis = analysis_dict or {}
        req_skills = [s.strip() for s in analysis.get("required_skills", []) if s]
        tech_keywords = [s.strip() for s in analysis.get("technical_keywords", []) if s]
        target_skills = list(dict.fromkeys(req_skills + tech_keywords))

        # Candidate verified skills
        cand_skills = []
        for s in profile_dict.get("skills", []):
            name = s.get("name") if isinstance(s, dict) else str(s)
            if name:
                cand_skills.append(name.strip())

        matched_kws = [ts for ts in target_skills if any(cs.lower() in ts.lower() or ts.lower() in cs.lower() for cs in cand_skills)]
        missing_kws = [ts for ts in target_skills if ts not in matched_kws]

        cand_years = profile_dict.get("years_of_experience", 3.0)
        top_skills_str = ", ".join(matched_kws[:3]) if matched_kws else ", ".join(cand_skills[:3])
        target_title = job_dict.get("title") or profile_dict.get("target_job_titles", ["Professional"])[0]
        target_company = job_dict.get("company", "Target Organization")

        summary = (
            f"Results-oriented {target_title} with {cand_years}+ years of demonstrated experience building "
            f"reliable, high-throughput systems and data solutions. Proven expertise in {top_skills_str}. "
            f"Passionate about leveraging technical engineering rigor to advance goals at {target_company}."
        )

        # Tailor experiences
        tailored_exps = []
        for exp in profile_dict.get("experiences", []):
            if isinstance(exp, dict):
                bullets = list(exp.get("bullet_points", []))
                if not bullets and exp.get("description"):
                    bullets = [exp.get("description")]
                
                # Active verb polish for bullets
                polished = []
                for b in bullets:
                    b_clean = b.strip().rstrip(".")
                    if not any(b_clean.startswith(v) for v in ["Architected", "Engineered", "Spearheaded", "Optimized", "Delivered"]):
                        b_clean = f"Engineered and deployed: {b_clean}"
                    polished.append(b_clean + ".")

                tailored_exps.append({
                    "company": exp.get("company"),
                    "position": exp.get("position"),
                    "location": exp.get("location"),
                    "start_date": exp.get("start_date"),
                    "end_date": exp.get("end_date"),
                    "is_current": exp.get("is_current", False),
                    "description": exp.get("description", ""),
                    "bullet_points": polished if polished else ["Spearheaded core development initiatives ensuring high performance."],
                    "technologies": exp.get("technologies", cand_skills[:4])
                })

        # Calculate ATS score & breakdown
        match_pct = round(min(100.0, (len(matched_kws) / max(len(target_skills), 1)) * 100.0), 1) if target_skills else 85.0
        ats_score = round((match_pct * 0.6) + 36.0, 1)  # base ATS baseline for clean structure

        ats_breakdown = {
            "keyword_match_percentage": match_pct,
            "skills_match_percentage": match_pct,
            "experience_relevance_score": 90.0,
            "formatting_readability_score": 95.0,
            "formatting_issues": [],
            "missing_keywords": missing_kws[:8],
            "actionable_improvements": [
                f"Incorporate missing verified keywords into project summaries: {', '.join(missing_kws[:3])}." if missing_kws else "Keywords are well aligned with role requirements.",
                "Ensure metric-driven outcomes (e.g. % throughput gain, latency drop) are featured in top 2 bullet points."
            ]
        }

        return {
            "tailored_summary": summary,
            "skills_section": {
                "technical": matched_kws + [s for s in cand_skills if s not in matched_kws],
                "tools": ["Git", "Docker", "VS Code", "CI/CD"],
                "soft": ["Cross-functional Collaboration", "Analytical Problem Solving", "Technical Communication"]
            },
            "experience_section": tailored_exps,
            "education_section": profile_dict.get("educations", []),
            "projects_section": profile_dict.get("projects", []),
            "certifications_section": profile_dict.get("certifications", []),
            "ats_score": ats_score,
            "ats_breakdown": ats_breakdown,
            "matched_keywords": matched_kws,
            "missing_keywords": missing_kws,
            "ai_provider": "built-in",
            "is_fallback": True,
        }

resume_agent = ResumeAgent()

