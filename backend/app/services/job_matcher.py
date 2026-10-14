import re
from typing import Dict, Any, List, Tuple, Optional
from app.models.models import Profile, Job, JobAnalysis

class JobMatcher:
    """
    Computes transparent, explainable compatibility scores between candidate profiles and job postings.
    Weights:
      - Skills: 35%
      - Experience: 25%
      - Education: 15%
      - Location & Work Mode: 15%
      - Preferences / Salary: 10%
    """

    @classmethod
    def calculate_match(
        cls,
        profile_dict: Dict[str, Any],
        job_dict: Dict[str, Any],
        analysis_dict: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        analysis = analysis_dict or {}
        
        # 1. Skills Matching (35%)
        req_skills = [s.lower() for s in analysis.get("required_skills", [])]
        pref_skills = [s.lower() for s in analysis.get("preferred_skills", [])]
        tech_keywords = [s.lower() for s in analysis.get("technical_keywords", [])]
        
        all_job_skills = list(set(req_skills + pref_skills + tech_keywords))
        
        cand_skills_raw = profile_dict.get("skills", [])
        cand_skills = []
        for s in cand_skills_raw:
            if isinstance(s, dict):
                cand_skills.append(s.get("name", "").lower())
            else:
                cand_skills.append(str(s).lower())

        matched_skills = []
        missing_skills = []

        if all_job_skills:
            for js in all_job_skills:
                if any(cs in js or js in cs for cs in cand_skills):
                    matched_skills.append(js.title())
                else:
                    missing_skills.append(js.title())
            skills_score = round(min(100.0, (len(matched_skills) / max(len(all_job_skills), 1)) * 100), 1)
        else:
            skills_score = 80.0
            matched_skills = [s.title() for s in cand_skills[:4]]

        # 2. Experience Matching (25%)
        cand_years = float(profile_dict.get("years_of_experience", 0.0) or 0.0)
        req_years = float(analysis.get("experience_years_min", 2.0) or 2.0)

        if cand_years >= req_years:
            experience_score = 100.0
        elif cand_years > 0:
            experience_score = round((cand_years / req_years) * 100.0, 1)
        else:
            experience_score = 65.0

        # 3. Education Matching (15%)
        cand_edus = profile_dict.get("educations", [])
        if cand_edus:
            education_score = 100.0
        else:
            education_score = 75.0

        # 4. Location & Work Mode Matching (15%)
        job_mode = (job_dict.get("work_mode") or "Remote").lower()
        pref_mode = (profile_dict.get("work_mode_preference") or "Remote").lower()
        job_loc = (job_dict.get("location") or "").lower()
        cand_locs = [l.lower() for l in profile_dict.get("preferred_locations", [])]
        current_city = (profile_dict.get("current_city") or "").lower()

        if job_mode == "remote" or pref_mode == "remote" or pref_mode == "any":
            location_score = 100.0
        elif job_mode == pref_mode:
            location_score = 95.0
        elif any(cl in job_loc or job_loc in cl for cl in cand_locs + [current_city]):
            location_score = 90.0
        else:
            location_score = 70.0

        # 5. Preferences & Salary (10%)
        expected_min = profile_dict.get("expected_salary_min")
        job_min = job_dict.get("salary_min")
        job_max = job_dict.get("salary_max")

        if expected_min and job_min:
            if (job_max or job_min) >= expected_min:
                preferences_score = 100.0
            else:
                diff_pct = (expected_min - (job_max or job_min)) / expected_min
                preferences_score = max(50.0, round(100.0 - (diff_pct * 100), 1))
        else:
            preferences_score = 85.0

        # Weighted Overall Score
        overall_score = round(
            (skills_score * 0.35) +
            (experience_score * 0.25) +
            (education_score * 0.15) +
            (location_score * 0.15) +
            (preferences_score * 0.10),
            1
        )

        # Explainable summary
        explanation = (
            f"Overall compatibility calculated at {overall_score}%. "
            f"You possess {len(matched_skills)} of the key target skills ({', '.join(matched_skills[:3]) if matched_skills else 'core fundamentals'}). "
            f"Your {cand_years:g} years of experience aligns well with the {req_years:g}+ years benchmark. "
            f"Location & work mode preference is rated at {location_score}%."
        )

        recommendations = []
        if missing_skills:
            recommendations.append(f"Consider acquiring or showcasing projects in: {', '.join(missing_skills[:3])}.")
        if cand_years < req_years:
            recommendations.append(f"Emphasize impactful project leadership to offset the {req_years:g} years benchmark.")
        recommendations.append("Tailor your summary to mirror the employer's core terminology.")

        return {
            "overall_score": overall_score,
            "skills_score": skills_score,
            "experience_score": experience_score,
            "education_score": education_score,
            "location_score": location_score,
            "preferences_score": preferences_score,
            "matched_skills": matched_skills[:10],
            "missing_skills": missing_skills[:10],
            "explanation": explanation,
            "recommendations": recommendations
        }

job_matcher = JobMatcher()
