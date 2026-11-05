import re
import json
import logging
from typing import Dict, Any, Optional

from app.ai.provider_manager import provider_manager
from app.ai.prompt_manager import prompt_manager
from app.ai.structured_output import structured_output_parser

logger = logging.getLogger("jobpilot.ai.job_discovery_agent")

class JobDiscoveryAgent:
    """
    Intelligently analyzes job descriptions to extract structured requirements,
    keywords, and role attributes with full fallback assurance.
    """

    SKILL_CATALOG = {
        "python": "Python", "sql": "SQL", "javascript": "JavaScript", "typescript": "TypeScript",
        "react": "React", "node.js": "Node.js", "fastapi": "FastAPI", "docker": "Docker",
        "aws": "AWS", "azure": "Azure", "gcp": "GCP", "kubernetes": "Kubernetes",
        "postgresql": "PostgreSQL", "mysql": "MySQL", "mongodb": "MongoDB", "redis": "Redis",
        "git": "Git", "ci/cd": "CI/CD", "rest api": "REST APIs", "graphql": "GraphQL",
        "pandas": "Pandas", "numpy": "NumPy", "scikit-learn": "Scikit-Learn",
        "tableau": "Tableau", "power bi": "Power BI", "excel": "Excel", "spark": "Apache Spark",
        "airflow": "Apache Airflow", "kafka": "Kafka", "linux": "Linux", "tailwind": "Tailwind CSS",
        "next.js": "Next.js", "django": "Django", "flask": "Flask", "pytorch": "PyTorch", "tensorflow": "TensorFlow"
    }

    SOFT_SKILLS_CATALOG = [
        "Communication", "Leadership", "Problem Solving", "Collaboration", "Critical Thinking",
        "Adaptability", "Project Management", "Time Management", "Agile", "Scrum"
    ]

    async def analyze_job_description(
        self,
        raw_text: str,
        title: Optional[str] = None,
        company: Optional[str] = None,
        provider_override: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Extracts structured job requirements via LLM or robust fallback rules.
        """
        prompts = prompt_manager.get_job_analysis_prompt(raw_text, title, company)
        result = await provider_manager.execute_prompt(
            system_prompt=prompts["system_prompt"],
            user_prompt=prompts["user_prompt"],
            temperature=0.2,
            provider_override=provider_override,
            json_mode=True
        )

        if not result.is_fallback and result.content:
            parsed = structured_output_parser.extract_json(result.content)
            if parsed and "required_skills" in parsed:
                parsed["ai_provider"] = result.provider
                parsed["model_used"] = result.model
                parsed["is_fallback"] = False
                parsed["tokens_used"] = result.tokens_used
                return parsed

        # Robust Heuristic Extraction Fallback
        return self._heuristic_analysis(raw_text, title, company)

    def _heuristic_analysis(self, raw_text: str, title: Optional[str] = None, company: Optional[str] = None) -> Dict[str, Any]:
        text_lower = raw_text.lower()

        # Detect skills
        detected_tech = []
        for term, formal in self.SKILL_CATALOG.items():
            if re.search(rf'\b{re.escape(term)}\b', text_lower):
                detected_tech.append(formal)

        # Detect soft skills
        detected_soft = []
        for ss in self.SOFT_SKILLS_CATALOG:
            if re.search(rf'\b{re.escape(ss.lower())}\b', text_lower):
                detected_soft.append(ss)

        # Years of experience
        exp_match = re.search(r'(\d+)(?:\+|-|\s+to\s+\d+)?\s*(?:years|yrs)\b', text_lower)
        exp_years = float(exp_match.group(1)) if exp_match else 2.0

        # Work mode
        work_mode = "Remote"
        if "hybrid" in text_lower:
            work_mode = "Hybrid"
        elif "on-site" in text_lower or "onsite" in text_lower or "in-office" in text_lower:
            work_mode = "On-site"

        # Education
        education_reqs = []
        if re.search(r'\b(?:bachelor|b\.s\.|b\.e\.|b\.tech|degree)\b', text_lower):
            education_reqs.append("Bachelor's Degree in Computer Science, Engineering, or related field")
        if re.search(r'\b(?:master|m\.s\.|mba)\b', text_lower):
            education_reqs.append("Master's Degree preferred")
        if not education_reqs:
            education_reqs.append("Bachelor's Degree or equivalent practical experience")

        # Split skills into required and preferred
        req_skills = detected_tech[:5] if detected_tech else ["Python", "SQL", "Git"]
        pref_skills = detected_tech[5:9] if len(detected_tech) > 5 else ["Docker", "Cloud Platforms"]

        return {
            "extracted_title": title or "Software Engineer / Data Professional",
            "extracted_company": company or "Leading Technology Firm",
            "extracted_location": "Remote" if work_mode == "Remote" else "Multiple Locations",
            "required_skills": req_skills,
            "preferred_skills": pref_skills,
            "technical_keywords": detected_tech[:12],
            "soft_skills": detected_soft if detected_soft else ["Collaboration", "Problem Solving", "Communication"],
            "responsibilities": [
                "Design, develop, and maintain resilient production applications and data pipelines.",
                "Collaborate with multi-disciplinary teams to translate product requirements into technical solutions.",
                "Ensure software quality through automated testing, code reviews, and performance monitoring."
            ],
            "education_requirements": education_reqs,
            "experience_years_min": exp_years,
            "work_mode": work_mode,
            "employment_type": "Full-time",
            "key_takeaways": [
                f"Requires {exp_years}+ years of experience with strong foundation in core technologies.",
                f"Primary technical focus on {', '.join(req_skills[:3])}.",
                f"Work mode designated as {work_mode}."
            ],
            "ai_provider": "built-in",
            "model_used": "deterministic-heuristics",
            "is_fallback": True,
            "tokens_used": 0
        }

job_discovery_agent = JobDiscoveryAgent()

