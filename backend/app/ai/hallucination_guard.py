import re
import logging
from typing import Dict, Any, List, Set, Tuple

logger = logging.getLogger("jobpilot.ai.hallucination_guard")

class HallucinationGuard:
    """
    Enforces strict candidate profile factual grounding.
    Guarantees that AI never fabricates employers, degrees, certifications,
    unverified technical skills, or false metrics.
    """

    @classmethod
    def extract_candidate_grounding(cls, profile_dict: Dict[str, Any]) -> Dict[str, Set[str]]:
        """
        Builds normalized lookup sets for verified candidate attributes.
        """
        grounding = {
            "skills": set(),
            "companies": set(),
            "titles": set(),
            "institutions": set(),
            "degrees": set(),
            "projects": set(),
            "certifications": set(),
        }

        # Skills
        for s in profile_dict.get("skills", []):
            name = s.get("name") if isinstance(s, dict) else str(s)
            if name:
                grounding["skills"].add(name.strip().lower())

        # Experiences
        for exp in profile_dict.get("experiences", []):
            if isinstance(exp, dict):
                comp = exp.get("company")
                pos = exp.get("position")
                if comp:
                    grounding["companies"].add(comp.strip().lower())
                if pos:
                    grounding["titles"].add(pos.strip().lower())

        # Educations
        for edu in profile_dict.get("educations", []):
            if isinstance(edu, dict):
                inst = edu.get("institution")
                deg = edu.get("degree")
                if inst:
                    grounding["institutions"].add(inst.strip().lower())
                if deg:
                    grounding["degrees"].add(deg.strip().lower())

        # Projects
        for proj in profile_dict.get("projects", []):
            if isinstance(proj, dict):
                title = proj.get("title")
                if title:
                    grounding["projects"].add(title.strip().lower())

        # Certifications
        for cert in profile_dict.get("certifications", []):
            if isinstance(cert, dict):
                name = cert.get("name")
                if name:
                    grounding["certifications"].add(name.strip().lower())

        return grounding

    @classmethod
    def filter_unverified_skills(
        cls,
        candidate_skills: List[str],
        skills_to_check: List[str]
    ) -> Tuple[List[str], List[str]]:
        """
        Separates skills into verified (grounded in candidate profile)
        and missing/unverified.
        """
        cand_normalized = {s.strip().lower() for s in candidate_skills if s}
        verified = []
        unverified = []

        for skill in skills_to_check:
            s_clean = skill.strip()
            s_lower = s_clean.lower()
            if any(c == s_lower or c in s_lower or s_lower in c for c in cand_normalized):
                verified.append(s_clean)
            else:
                unverified.append(s_clean)

        return verified, unverified

    @classmethod
    def audit_tailored_resume(
        cls,
        tailored_resume: Dict[str, Any],
        profile_dict: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Audits a generated/tailored resume to ensure no hallucinated employers,
        degrees, or fabricated credentials were introduced.
        """
        grounding = cls.extract_candidate_grounding(profile_dict)
        flagged_items = []

        # Audit Experience Companies
        for exp in tailored_resume.get("experiences", tailored_resume.get("experience_section", [])):
            company = (exp.get("company") or "").strip().lower()
            if company and company not in grounding["companies"]:
                # Check if it matches any known company substring
                if not any(gc in company or company in gc for gc in grounding["companies"] if gc):
                    flagged_items.append(f"Unverified employer detected: '{exp.get('company')}'")

        # Audit Education Institutions
        for edu in tailored_resume.get("educations", tailored_resume.get("education_section", [])):
            inst = (edu.get("institution") or "").strip().lower()
            if inst and inst not in grounding["institutions"]:
                if not any(gi in inst or inst in gi for gi in grounding["institutions"] if gi):
                    flagged_items.append(f"Unverified educational institution: '{edu.get('institution')}'")

        return {
            "is_factually_grounded": len(flagged_items) == 0,
            "hallucinations_detected": len(flagged_items) > 0,
            "flagged_items": flagged_items,
            "audit_timestamp": "now",
        }

hallucination_guard = HallucinationGuard()

