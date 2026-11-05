from typing import Dict, Any, List, Optional
import math

class JobMatchingAgent:
    """
    Computes explainable, transparent candidate-to-job compatibility scores
    using the calibrated five-factor weighted model.
    Weights:
      1. Skills: 35%
      2. Experience: 25%
      3. Education: 15%
      4. Location & Work Mode: 15%
      5. Preferences & Compensation: 10%
    """

    WEIGHTS = {
        "skills": 0.35,
        "experience": 0.25,
        "education": 0.15,
        "location": 0.15,
        "preferences": 0.10,
    }

    @classmethod
    def evaluate_match(
        cls,
        profile_dict: Dict[str, Any],
        job_dict: Dict[str, Any],
        analysis_dict: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        analysis = analysis_dict or {}

        # 1. Skills Matching (35%)
        req_skills = [s.strip().lower() for s in analysis.get("required_skills", []) if s]
        pref_skills = [s.strip().lower() for s in analysis.get("preferred_skills", []) if s]
        tech_keywords = [s.strip().lower() for s in analysis.get("technical_keywords", []) if s]
        all_job_skills = list(dict.fromkeys(req_skills + pref_skills + tech_keywords))

        cand_skills_raw = profile_dict.get("skills", [])
        cand_skills = []
        for s in cand_skills_raw:
            if isinstance(s, dict):
                cand_skills.append((s.get("name") or "").strip().lower())
            else:
                cand_skills.append(str(s).strip().lower())
        cand_skills = [s for s in cand_skills if s]

        matched_skills = []
        missing_skills = []

        if all_job_skills:
            for js in all_job_skills:
                if any(cs == js or cs in js or js in cs for cs in cand_skills):
                    matched_skills.append(js.title())
                else:
                    missing_skills.append(js.title())
            skills_score = round(min(100.0, (len(matched_skills) / max(len(all_job_skills), 1)) * 100.0), 1)
        else:
            skills_score = 85.0
            matched_skills = [s.title() for s in cand_skills[:5]]

        # 2. Experience Matching (25%)
        cand_years = float(profile_dict.get("years_of_experience", 0.0) or 0.0)
        req_years = float(analysis.get("experience_years_min", 2.0) or 2.0)

        if cand_years >= req_years:
            experience_score = 100.0
        elif cand_years > 0 and req_years > 0:
            experience_score = round(min(100.0, (cand_years / req_years) * 100.0), 1)
        else:
            experience_score = 65.0

        # 3. Education Matching (15%)
        cand_edus = profile_dict.get("educations", [])
        if cand_edus:
            education_score = 100.0
        else:
            education_score = 75.0

        # 4. Location & Work Mode Matching (15%)
        job_mode = (job_dict.get("work_mode") or "Remote").strip().lower()
        pref_mode = (profile_dict.get("work_mode_preference") or "Remote").strip().lower()
        job_loc = (job_dict.get("location") or "").strip().lower()
        cand_locs = [(l or "").strip().lower() for l in profile_dict.get("preferred_locations", [])]
        current_city = (profile_dict.get("current_city") or "").strip().lower()

        if job_mode == "remote" or pref_mode == "remote" or pref_mode == "any":
            location_score = 100.0
        elif job_mode == pref_mode:
            location_score = 95.0
        elif any(cl in job_loc or job_loc in cl for cl in cand_locs + [current_city] if cl):
            location_score = 90.0
        else:
            location_score = 70.0

        # 5. Preferences & Salary (10%)
        expected_min = profile_dict.get("expected_salary_min")
        job_min = job_dict.get("salary_min")
        job_max = job_dict.get("salary_max")

        if expected_min and (job_min or job_max):
            offered = job_max or job_min
            if offered >= expected_min:
                preferences_score = 100.0
            else:
                diff_pct = (expected_min - offered) / expected_min
                preferences_score = max(50.0, round(100.0 - (diff_pct * 100.0), 1))
        else:
            preferences_score = 85.0

        # Aggregate weighted score
        overall_score = round(
            (skills_score * cls.WEIGHTS["skills"]) +
            (experience_score * cls.WEIGHTS["experience"]) +
            (education_score * cls.WEIGHTS["education"]) +
            (location_score * cls.WEIGHTS["location"]) +
            (preferences_score * cls.WEIGHTS["preferences"]),
            1
        )

        # Transparent explanation
        explanation_parts = [
            f"Compatibility: {overall_score}%.",
            f"Skills alignment: {skills_score}% ({len(matched_skills)} matched, {len(missing_skills)} gaps).",
            f"Experience: {cand_years} years vs {req_years} years required ({experience_score}%).",
            f"Location & Work Mode: {location_score}%.",
            f"Preferences: {preferences_score}%."
        ]
        explanation = " ".join(explanation_parts)

        # Actionable recommendations
        recommendations = []
        if missing_skills:
            recommendations.append(f"Consider highlighting experience with key missing skills: {', '.join(missing_skills[:3])}.")
        if cand_years < req_years:
            recommendations.append(f"Emphasize impactful project leadership to offset the {round(req_years - cand_years, 1)}-year experience delta.")
        if location_score < 80.0:
            recommendations.append(f"Confirm willingness to relocate or discuss flexible hybrid arrangements for {job_dict.get('location', 'the target office')}.")
        if not recommendations:
            recommendations.append("Profile demonstrates strong alignment across all major criteria. Recommended for immediate application.")

        return {
            "overall_score": overall_score,
            "skills_score": skills_score,
            "experience_score": experience_score,
            "education_score": education_score,
            "location_score": location_score,
            "preferences_score": preferences_score,
            "matched_skills": matched_skills,
            "missing_skills": missing_skills,
            "explanation": explanation,
            "recommendations": recommendations,
        }

job_matching_agent = JobMatchingAgent()

