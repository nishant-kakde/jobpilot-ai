"""
Specialized AI Agents for JobPilot AI.
"""

from app.ai.agents.job_discovery_agent import JobDiscoveryAgent, job_discovery_agent
from app.ai.agents.job_matching_agent import JobMatchingAgent, job_matching_agent
from app.ai.agents.resume_agent import ResumeAgent, resume_agent
from app.ai.agents.cover_letter_agent import CoverLetterAgent, cover_letter_agent
from app.ai.agents.interview_agent import InterviewAgent, interview_agent
from app.ai.agents.career_advisor_agent import CareerAdvisorAgent, career_advisor_agent
from app.ai.agents.application_agent import ApplicationAgent, application_agent

__all__ = [
    "JobDiscoveryAgent",
    "job_discovery_agent",
    "JobMatchingAgent",
    "job_matching_agent",
    "ResumeAgent",
    "resume_agent",
    "CoverLetterAgent",
    "cover_letter_agent",
    "InterviewAgent",
    "interview_agent",
    "CareerAdvisorAgent",
    "career_advisor_agent",
    "ApplicationAgent",
    "application_agent",
]

