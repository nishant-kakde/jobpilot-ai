import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger("jobpilot.ai.application_agent")

class ApplicationAgent:
    """
    Assists in form field mapping and application screening questions
    with strict user consent gating and zero anti-bot bypassing.
    """

    @classmethod
    def map_application_fields(
        cls,
        form_fields: List[Dict[str, Any]],
        profile_dict: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Maps standard job application form fields to verified profile data.
        Flags sensitive legal/eligibility fields for mandatory manual review.
        """
        cand_name = profile_dict.get("full_name", "")
        name_parts = cand_name.split()
        first_name = name_parts[0] if name_parts else ""
        last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""

        mappings = {}
        manual_reviews = []

        field_dictionary = {
            "first_name": first_name,
            "last_name": last_name,
            "full_name": cand_name,
            "email": profile_dict.get("email", ""),
            "phone": profile_dict.get("phone", ""),
            "city": profile_dict.get("current_city", ""),
            "linkedin": profile_dict.get("linkedin_url", ""),
            "github": profile_dict.get("github_url", ""),
            "portfolio": profile_dict.get("portfolio_url", ""),
            "years_experience": str(profile_dict.get("years_of_experience", 2.0)),
            "notice_period": str(profile_dict.get("notice_period_days", 30)),
            "salary_expectation": str(profile_dict.get("expected_salary_min", 90000)),
        }

        for field in form_fields:
            field_name = (field.get("name") or field.get("id") or "").lower()
            field_label = (field.get("label") or "").lower()
            key_term = field_name or field_label

            matched = False
            for k, val in field_dictionary.items():
                if k in key_term or key_term in k:
                    mappings[field.get("name") or field.get("id")] = val
                    matched = True
                    break

            # Flag eligibility/visa queries for mandatory user review
            if any(term in key_term for term in ["sponsorship", "visa", "clearance", "authorized", "disability", "veteran"]):
                manual_reviews.append({
                    "field": field.get("name") or field.get("id"),
                    "label": field.get("label"),
                    "reason": "Regulatory compliance & eligibility field requires explicit manual candidate confirmation."
                })

        return {
            "mapped_fields": mappings,
            "fields_requiring_manual_review": manual_reviews,
            "user_consent_required": True,
            "submission_state": "Pending_User_Consent",
            "safety_policy": "Explicit user review and approval required before submission record is saved."
        }

    @classmethod
    def generate_screening_answer(
        cls,
        question: str,
        profile_dict: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Generates structured STAR answers for application screening questions.
        """
        q_lower = question.lower()
        skills = [
            (s.get("name") if isinstance(s, dict) else str(s))
            for s in profile_dict.get("skills", [])
        ]
        years = profile_dict.get("years_of_experience", 2.0)

        if "why do you want" in q_lower or "interest" in q_lower:
            answer = (
                f"I am drawn to this opportunity because it directly matches my {years}+ years of verified "
                f"experience in {', '.join(skills[:3])}. I have consistently driven measurable improvements in system "
                f"performance and delivery reliability, and I am excited to bring that dedication to your engineering team."
            )
            category = "Motivation"
            confidence = 0.95
            manual_review = False
        elif "years of experience" in q_lower or "how many years" in q_lower:
            answer = f"I have approximately {years} years of professional engineering experience with {', '.join(skills[:3])}."
            category = "Experience"
            confidence = 0.98
            manual_review = False
        elif any(w in q_lower for w in ["visa", "sponsorship", "legally authorized"]):
            answer = "I am legally authorized to work, and I will confirm any specific corporate sponsorship requirements upon request."
            category = "Eligibility"
            confidence = 0.70
            manual_review = True
        else:
            answer = (
                f"Throughout my professional background with {', '.join(skills[:3])}, I have applied disciplined "
                f"engineering practices to achieve reliable business outcomes. I welcome the opportunity to discuss "
                f"specific past technical achievements that directly benefit your team."
            )
            category = "General"
            confidence = 0.85
            manual_review = False

        return {
            "question_text": question,
            "suggested_answer": answer,
            "category": category,
            "confidence_level": confidence,
            "requires_manual_review": manual_review
        }

application_agent = ApplicationAgent()

