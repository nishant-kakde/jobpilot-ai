import datetime
from typing import List, Dict, Any, Optional

from app.core.config import settings
from app.integrations.job_sources.base import JobSourceAdapter
from app.schemas.canonical_job import CanonicalJob

class NaukriAdapter(JobSourceAdapter):
    source_name = "Naukri"
    integration_type = "Web Scraping (Optional)"
    is_automated_apply_supported = False
    auth_required = False
    terms_warning = (
        "Automated scraping of Naukri is disabled by default to respect platform Terms of Service. "
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

        mock_dataset = [
            {
                "title": "Senior Data Analyst",
                "company": "Infosys / FinTech Practice",
                "location": "Pune / Bengaluru / Hybrid",
                "work_mode": "Hybrid",
                "job_type": "Full-time",
                "salary_min": 25000.0,
                "salary_max": 38000.0,
                "salary_currency": "USD",
                "raw_description": (
                    "Looking for an experienced Data Analyst with strong SQL, Python (Pandas), and Tableau skills. "
                    "Responsibilities: Deliver business intelligence dashboards, run cohort analysis, and communicate insights to leadership."
                ),
                "original_url": "https://www.naukri.com/job-listings-sample-301",
                "job_source": "Naukri",
                "external_id": "nk-infosys-301",
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
