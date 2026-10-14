import datetime
import re
from typing import List, Dict, Any, Optional
from app.integrations.job_sources.base import JobSourceAdapter

class ManualImportAdapter(JobSourceAdapter):
    source_name = "Manual Import"
    integration_type = "Direct URL & Raw Text Extraction"
    status_label = "Universal Support"
    is_automated_apply_supported = True
    auth_required = False

    async def search_jobs(
        self,
        query: Optional[str] = None,
        location: Optional[str] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        return []

    async def fetch_job_details(self, job_url_or_id: str) -> Optional[Dict[str, Any]]:
        return None

    @staticmethod
    def parse_pasted_job(
        raw_description: str,
        title: Optional[str] = None,
        company: Optional[str] = None,
        location: Optional[str] = None,
        url: Optional[str] = None,
        salary_min: Optional[float] = None,
        salary_max: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Extracts metadata from pasted job text if title/company are not supplied.
        """
        lines = [l.strip() for l in raw_description.split("\n") if l.strip()]
        computed_title = title or (lines[0] if lines else "Imported Role")
        computed_company = company or (lines[1] if len(lines) > 1 else "Target Organization")
        computed_loc = location or "Remote"

        return {
            "title": computed_title,
            "company": computed_company,
            "location": computed_loc,
            "work_mode": "Remote" if "remote" in raw_description.lower() else "Hybrid",
            "job_type": "Full-time",
            "salary_min": salary_min,
            "salary_max": salary_max,
            "salary_currency": "USD",
            "job_source": "Manual Import",
            "original_url": url or "",
            "raw_description": raw_description,
            "date_posted": datetime.datetime.utcnow()
        }
