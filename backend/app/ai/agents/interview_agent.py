import json
import logging
from typing import Dict, Any, List, Optional

from app.ai.provider_manager import provider_manager
from app.ai.prompt_manager import prompt_manager
from app.ai.context_manager import context_manager
from app.ai.structured_output import structured_output_parser

logger = logging.getLogger("jobpilot.ai.interview_agent")

class InterviewAgent:
    """
    Generates tailored interview questions across multiple categories
    and interactively evaluates candidate responses using the STAR methodology.
    """

    async def generate_interview_questions(
        self,
        job_dict: Dict[str, Any],
        profile_dict: Optional[Dict[str, Any]] = None,
        analysis_dict: Optional[Dict[str, Any]] = None,
        provider_override: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Generates categorized interview questions: Technical, Behavioral, Situational, and HR.
        """
        job_title = job_dict.get("title", "Software Engineer")
        company = job_dict.get("company", "Target Company")
        skills = (analysis_dict or {}).get("required_skills", ["Python", "SQL", "System Design"])

        questions = [
            {
                "id": "q1",
                "category": "Technical",
                "question": f"Can you describe how you architect and optimize data workflows or services using {skills[0] if skills else 'modern tools'}?",
                "talking_points": [
                    "Specify data volume, throughput metrics, or latency requirements.",
                    "Explain trade-offs between memory efficiency and execution speed.",
                    "Highlight error handling and recovery strategies."
                ],
                "expected_competencies": ["Technical depth", "Architecture", "Optimization"]
            },
            {
                "id": "q2",
                "category": "Behavioral",
                "question": f"Tell me about a time at a previous company when a critical production issue arose. How did you diagnose and resolve it under pressure?",
                "talking_points": [
                    "Situation: Describe the outage severity and impact.",
                    "Task: Your specific role in leading diagnosis.",
                    "Action: Root cause analysis, rollback, or patch applied.",
                    "Result: Post-mortem outcome and preventive safeguards implemented."
                ],
                "expected_competencies": ["STAR framework", "Ownership", "Composure"]
            },
            {
                "id": "q3",
                "category": "Situational",
                "question": f"If an engineering sprint deadline is approaching and a core dependency is delayed, how do you communicate with stakeholders and reprioritize?",
                "talking_points": [
                    "Early proactive communication before delivery dates.",
                    "Phased MVP delivery vs delayed complete scope.",
                    "Managing technical debt and cross-team expectations."
                ],
                "expected_competencies": ["Communication", "Prioritization", "Stakeholder Management"]
            },
            {
                "id": "q4",
                "category": "HR & Company Alignment",
                "question": f"What interests you most about joining {company} in the {job_title} role, and how does it fit into your long-term career trajectory?",
                "talking_points": [
                    f"Connect your verified experience with {company}'s domain.",
                    "Articulate interest in the product challenge.",
                    "Express enthusiasm for team mentorship and continuous learning."
                ],
                "expected_competencies": ["Culture fit", "Motivation", "Career Clarity"]
            }
        ]

        return questions

    async def evaluate_mock_answer(
        self,
        question: str,
        answer: str,
        job_context: Optional[Dict[str, Any]] = None,
        provider_override: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Evaluates a candidate's answer using STAR methodology, technical accuracy,
        clarity, and constructive suggestions.
        """
        job_json = json.dumps(job_context or {"title": "Professional Role"})
        prompts = prompt_manager.get_mock_interview_evaluation_prompt(
            job_context_json=job_json,
            question=question,
            candidate_answer=answer
        )

        result = await provider_manager.execute_prompt(
            system_prompt=prompts["system_prompt"],
            user_prompt=prompts["user_prompt"],
            temperature=0.2,
            provider_override=provider_override,
            json_mode=True
        )

        if not result.is_fallback and result.content:
            parsed = structured_output_parser.extract_json(result.content)
            if parsed and "overall_score" in parsed:
                parsed["ai_provider"] = result.provider
                parsed["is_fallback"] = False
                return parsed

        # Robust Heuristic Evaluation Fallback
        return self._heuristic_evaluation(question, answer)

    def _heuristic_evaluation(self, question: str, answer: str) -> Dict[str, Any]:
        word_count = len(answer.strip().split())

        # STAR detection heuristics
        has_situation = any(w in answer.lower() for w in ["when", "project", "client", "company", "situation", "context"])
        has_task = any(w in answer.lower() for w in ["needed to", "goal", "task", "objective", "responsible"])
        has_action = any(w in answer.lower() for w in ["built", "implemented", "developed", "architected", "resolved", "did", "analyzed"])
        has_result = any(w in answer.lower() for w in ["result", "increased", "decreased", "improved", "saved", "percent", "%", "achieved"])

        star_count = sum([has_situation, has_task, has_action, has_result])
        star_score = round((star_count / 4.0) * 100.0, 1)

        # Communication score based on length and clarity
        if word_count < 30:
            comm_score = 60.0
            length_tip = "Answer is too brief; elaborate with specific technical details."
        elif word_count > 350:
            comm_score = 75.0
            length_tip = "Answer is overly verbose; aim for a concise 90-second response."
        else:
            comm_score = 90.0
            length_tip = "Well-balanced response length."

        tech_score = 85.0 if any(t in answer.lower() for t in ["api", "data", "code", "pipeline", "database", "test", "system", "performance"]) else 75.0
        overall_score = round((star_score * 0.4) + (tech_score * 0.3) + (comm_score * 0.3), 1)

        strengths = []
        if has_action:
            strengths.append("Clear demonstration of personal ownership and actions taken.")
        if has_result:
            strengths.append("Included business impact or outcome metrics.")
        if not strengths:
            strengths.append("Directly addressed the prompt with relevant context.")

        improvements = []
        if not has_result:
            improvements.append("Quantify the final outcome (e.g., '% latency reduced', 'hours saved').")
        if not has_task:
            improvements.append("More clearly define the specific objective or constraint before detailing actions.")

        improved_model = (
            f"Here is how to structure this with the STAR framework:\n"
            f"- Situation: In my previous role, our team faced a bottleneck when scaling our core pipeline.\n"
            f"- Task: My objective was to eliminate latency spikes while keeping downtime at zero.\n"
            f"- Action: I re-architected the query execution path, added caching layers, and automated unit regression suites.\n"
            f"- Result: We improved query response times by 40% and successfully eliminated customer-reported timeouts."
        )

        return {
            "overall_score": overall_score,
            "technical_accuracy_score": tech_score,
            "communication_score": comm_score,
            "star_framework_score": star_score,
            "strengths": strengths,
            "areas_for_improvement": improvements if improvements else ["Add deeper architectural metrics to elevate seniority."],
            "improved_model_answer": improved_model,
            "actionable_tip": length_tip,
            "ai_provider": "built-in",
            "is_fallback": True
        }

interview_agent = InterviewAgent()

