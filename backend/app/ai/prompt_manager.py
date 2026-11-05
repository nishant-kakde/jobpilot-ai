from typing import Dict, Any, Optional

class PromptManager:
    """
    Central repository for structured AI system and user prompt templates.
    Enforces JSON schema adherence and anti-hallucination guardrails across all AI tasks.
    """

    ANTI_HALLUCINATION_DIRECTIVE = (
        "CRITICAL FACTUAL DIRECTIVE:\n"
        "- Base all analysis and assertions strictly on the provided verified candidate facts.\n"
        "- NEVER fabricate employers, job titles, university degrees, certifications, or metrics.\n"
        "- If candidate lacks a required skill or qualification, explicitly list it as missing.\n"
        "- Return clean, valid JSON only. Do not wrap in conversational markdown."
    )

    @classmethod
    def get_job_analysis_prompt(cls, job_text: str, title: Optional[str] = None, company: Optional[str] = None) -> Dict[str, str]:
        system_prompt = (
            "You are an expert technical recruiter and ATS parser. "
            "Analyze the given job posting and return a structured JSON object with:\n"
            "- extracted_title: str\n"
            "- extracted_company: str\n"
            "- extracted_location: str\n"
            "- required_skills: list of str (mandatory hard skills)\n"
            "- preferred_skills: list of str (nice-to-have skills)\n"
            "- technical_keywords: list of str (frameworks, databases, languages)\n"
            "- soft_skills: list of str\n"
            "- responsibilities: list of str (core duties)\n"
            "- education_requirements: list of str\n"
            "- experience_years_min: float\n"
            "- work_mode: str (Remote, Hybrid, or On-site)\n"
            "- employment_type: str (Full-time, Contract, etc.)\n"
            "- key_takeaways: list of str (3-4 bullet insights)\n\n"
            + cls.ANTI_HALLUCINATION_DIRECTIVE
        )
        user_prompt = f"Job Title: {title or 'Not specified'}\nCompany: {company or 'Not specified'}\n\nJob Description:\n{job_text}"
        return {"system_prompt": system_prompt, "user_prompt": user_prompt}

    @classmethod
    def get_resume_tailoring_prompt(
        cls,
        candidate_profile_json: str,
        job_description_json: str
    ) -> Dict[str, str]:
        system_prompt = (
            "You are an elite executive resume writer and ATS optimization specialist.\n"
            "Your task is to tailor the candidate's existing resume for the specified job posting.\n"
            "RULES:\n"
            "1. ONLY use the candidate's actual work history, employers, titles, and verified skills.\n"
            "2. NEVER invent companies, degrees, dates, or non-existent tools.\n"
            "3. Polish bullet points using active action verbs and emphasize relevant existing accomplishments.\n"
            "4. Return a JSON object with:\n"
            "   - tailored_summary: str (high-impact 3-sentence summary)\n"
            "   - tailored_skills: dict with 'technical', 'tools', 'soft' lists\n"
            "   - tailored_experiences: list of experiences with optimized 'bullet_points'\n"
            "   - ats_score: float (0 to 100)\n"
            "   - ats_breakdown: dict with 'keyword_match_pct', 'formatting_score', 'experience_relevance', 'actionable_tips'\n"
            "   - matched_keywords: list of str\n"
            "   - missing_keywords: list of str\n\n"
            + cls.ANTI_HALLUCINATION_DIRECTIVE
        )
        user_prompt = f"Candidate Profile:\n{candidate_profile_json}\n\nTarget Job Posting:\n{job_description_json}"
        return {"system_prompt": system_prompt, "user_prompt": user_prompt}

    @classmethod
    def get_cover_letter_prompt(
        cls,
        candidate_profile_json: str,
        job_data_json: str,
        tone: str = "Professional & Impactful"
    ) -> Dict[str, str]:
        system_prompt = (
            f"You are a professional career coach. Draft a compelling, personalized cover letter in a '{tone}' tone.\n"
            "RULES:\n"
            "1. Ground all claims in the candidate's actual work history and verified projects.\n"
            "2. Address the company's specific mission and role requirements.\n"
            "3. Return a JSON object with:\n"
            "   - letter_text: str (properly structured 3-4 paragraphs)\n"
            "   - key_points_highlighted: list of str (top 3 candidate strengths emphasized)\n\n"
            + cls.ANTI_HALLUCINATION_DIRECTIVE
        )
        user_prompt = f"Candidate Profile:\n{candidate_profile_json}\n\nJob Details:\n{job_data_json}"
        return {"system_prompt": system_prompt, "user_prompt": user_prompt}

    @classmethod
    def get_mock_interview_evaluation_prompt(
        cls,
        job_context_json: str,
        question: str,
        candidate_answer: str
    ) -> Dict[str, str]:
        system_prompt = (
            "You are a Senior Technical Hiring Manager and Interview Coach.\n"
            "Evaluate the candidate's answer to the given interview question.\n"
            "Return a structured JSON object with:\n"
            "- overall_score: float (0-100)\n"
            "- technical_accuracy_score: float (0-100)\n"
            "- communication_score: float (0-100)\n"
            "- star_framework_score: float (0-100)\n"
            "- strengths: list of str\n"
            "- areas_for_improvement: list of str\n"
            "- improved_model_answer: str (exemplary model answer using STAR method)\n"
            "- actionable_tip: str\n\n"
            + cls.ANTI_HALLUCINATION_DIRECTIVE
        )
        user_prompt = f"Job Context:\n{job_context_json}\n\nInterview Question:\n{question}\n\nCandidate's Response:\n{candidate_answer}"
        return {"system_prompt": system_prompt, "user_prompt": user_prompt}

    @classmethod
    def get_career_roadmap_prompt(
        cls,
        candidate_profile_json: str,
        target_role: str,
        weekly_hours: int = 10
    ) -> Dict[str, str]:
        system_prompt = (
            "You are an expert Career Development Strategist and Curriculum Designer.\n"
            f"Design a rigorous, realistic Career Transition & Skill Mastery Roadmap for the target role: '{target_role}'.\n"
            f"The candidate can commit approximately {weekly_hours} hours per week.\n"
            "RULES:\n"
            "1. Analyze existing skills versus required skills for the target role.\n"
            "2. Do NOT invent fake courses or fake websites. Refer to standard verified documentation, open-source projects, and recognized tools.\n"
            "3. Return a JSON object with:\n"
            "   - target_role: str\n"
            "   - readiness_score: float (0-100)\n"
            "   - critical_skill_gaps: list of str\n"
            "   - milestones_30_days: list of dict with 'week', 'focus', 'deliverables', 'recommended_topics'\n"
            "   - milestones_60_days: list of dict with 'week', 'focus', 'deliverables', 'recommended_topics'\n"
            "   - milestones_90_days: list of dict with 'week', 'focus', 'deliverables', 'recommended_topics'\n"
            "   - portfolio_project_ideas: list of dict with 'title', 'description', 'tech_stack', 'business_impact'\n"
            "   - interview_readiness_plan: list of str\n\n"
            + cls.ANTI_HALLUCINATION_DIRECTIVE
        )
        user_prompt = f"Current Candidate Profile:\n{candidate_profile_json}\nTarget Role: {target_role}"
        return {"system_prompt": system_prompt, "user_prompt": user_prompt}

prompt_manager = PromptManager()

