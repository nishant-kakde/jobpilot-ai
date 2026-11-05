import json
from typing import Dict, Any, List, Optional

class ContextManager:
    """
    Assembles, sanitizes, and compacts candidate profile and telemetry context
    for AI processing, ensuring token efficiency and privacy compliance.
    """

    @staticmethod
    def format_profile_for_ai(profile_dict: Dict[str, Any]) -> str:
        """
        Formats candidate profile into a compact, structured JSON string without sensitive PII.
        """
        compact_skills = []
        for s in profile_dict.get("skills", []):
            if isinstance(s, dict):
                compact_skills.append(f"{s.get('name')} ({s.get('proficiency_level', 'Intermediate')})")
            else:
                compact_skills.append(str(s))

        compact_exp = []
        for exp in profile_dict.get("experiences", []):
            if isinstance(exp, dict):
                compact_exp.append({
                    "company": exp.get("company"),
                    "position": exp.get("position"),
                    "start_date": exp.get("start_date"),
                    "end_date": exp.get("end_date"),
                    "bullet_points": exp.get("bullet_points", [])[:4],
                    "technologies": exp.get("technologies", [])[:6]
                })

        compact_edu = []
        for edu in profile_dict.get("educations", []):
            if isinstance(edu, dict):
                compact_edu.append({
                    "institution": edu.get("institution"),
                    "degree": edu.get("degree"),
                    "field_of_study": edu.get("field_of_study")
                })

        compact_proj = []
        for p in profile_dict.get("projects", []):
            if isinstance(p, dict):
                compact_proj.append({
                    "title": p.get("title"),
                    "role": p.get("role"),
                    "technologies": p.get("technologies", []),
                    "achievements": p.get("key_achievements", [])
                })

        payload = {
            "summary": profile_dict.get("summary", ""),
            "years_of_experience": profile_dict.get("years_of_experience", 0.0),
            "target_job_titles": profile_dict.get("target_job_titles", []),
            "work_mode_preference": profile_dict.get("work_mode_preference", "Remote"),
            "skills": compact_skills,
            "experiences": compact_exp,
            "educations": compact_edu,
            "projects": compact_proj,
            "preferred_locations": profile_dict.get("preferred_locations", []),
        }

        return json.dumps(payload, indent=2)

    @staticmethod
    def format_job_for_ai(job_dict: Dict[str, Any], analysis_dict: Optional[Dict[str, Any]] = None) -> str:
        """
        Extracts essential job details into a compact JSON string.
        """
        payload = {
            "title": job_dict.get("title", ""),
            "company": job_dict.get("company", ""),
            "location": job_dict.get("location", ""),
            "work_mode": job_dict.get("work_mode", "Remote"),
            "salary_range": f"{job_dict.get('salary_min', '')} - {job_dict.get('salary_max', '')} {job_dict.get('salary_currency', 'USD')}",
            "description_snippet": (job_dict.get("raw_description", ""))[:2000],
        }
        if analysis_dict:
            payload["required_skills"] = analysis_dict.get("required_skills", [])
            payload["preferred_skills"] = analysis_dict.get("preferred_skills", [])
            payload["technical_keywords"] = analysis_dict.get("technical_keywords", [])
            payload["experience_years_min"] = analysis_dict.get("experience_years_min", 2.0)

        return json.dumps(payload, indent=2)

    @staticmethod
    def format_conversation_history(history: List[Dict[str, str]], max_turns: int = 6) -> List[Dict[str, str]]:
        """
        Selects recent turns from conversation history to stay within context budgets.
        """
        recent = history[-max_turns:] if len(history) > max_turns else history
        formatted = []
        for msg in recent:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role in ["user", "assistant", "system"] and content:
                formatted.append({"role": role, "content": content})
        return formatted

context_manager = ContextManager()

