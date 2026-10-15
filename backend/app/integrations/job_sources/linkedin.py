import datetime
from typing import List, Dict, Any, Optional

from app.core.config import settings
from app.integrations.job_sources.base import JobSourceAdapter
from app.schemas.canonical_job import CanonicalJob

class LinkedInAdapter(JobSourceAdapter):
    source_name = "LinkedIn"
    integration_type = "Web Scraping (Optional)"
    is_automated_apply_supported = False
    auth_required = False
    terms_warning = (
        "Automated scraping of LinkedIn is disabled by default to respect platform Terms of Service. "
        "Use universal Manual Import, verified ATS feeds (Greenhouse, Lever, Ashby), or official APIs instead."
    )

    def __init__(self):
        super().__init__()
        self.is_enabled = settings.ENABLE_SCRAPING_SOURCES
        self.status_label = (
            "Connected (Web Scraping Mode)"
            if self.is_enabled
            else "Disabled by Default (Terms of Service Guardrail)"
        )

    async def search_jobs(
        self,
        query: Optional[str] = None,
        location: Optional[str] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        if not self.is_enabled:
            return []

        # If user explicitly opted-in to scraping in configuration:
        mock_dataset = [
            {
                "title": "Senior Full-Stack Engineer (Python / React)",
                "company": "Veloce Technologies",
                "location": "Remote / San Francisco, CA",
                "work_mode": "Remote",
                "job_type": "Full-time",
                "salary_min": 140000.0,
                "salary_max": 185000.0,
                "salary_currency": "USD",
                "raw_description": (
                    "Veloce Technologies is seeking a Senior Full-Stack Engineer to architect our data platform. "
                    "Responsibilities: Build scalable REST and WebSocket APIs using FastAPI and Python. "
                    "Requirements: 4+ years experience. Strong proficiency in Python, FastAPI, React, Docker."
                ),
                "original_url": "https://www.linkedin.com/jobs/view/sample-101",
                "job_source": "LinkedIn",
                "external_id": "li-veloce-101",
                "date_posted": datetime.datetime.now(datetime.timezone.utc),
            }
        ]
        results = []
        q_lower = (query or "").lower()
        for item in mock_dataset:
            if not q_lower or q_lower in item["title"].lower() or q_lower in item["raw_description"].lower():
                results.append(CanonicalJob(**item).normalize().model_dump())
        return results[:limit]

    async def fetch_job_details(self, job_url_or_id: str) -> Optional[Dict[str, Any]]:
        return None
