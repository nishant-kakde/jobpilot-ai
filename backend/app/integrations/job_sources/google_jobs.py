import datetime
from typing import List, Dict, Any, Optional
from app.integrations.job_sources.base import JobSourceAdapter

class GoogleJobsAdapter(JobSourceAdapter):
    source_name = "Google Jobs"
    integration_type = "Indexed Search Engine Aggregate"
    status_label = "Connected (Permitted Aggregator)"
    is_automated_apply_supported = False
    auth_required = False

    async def search_jobs(
        self,
        query: Optional[str] = None,
        location: Optional[str] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        mock_dataset = [
            {
                "title": "Cloud Solutions & DevOps Engineer",
                "company": "Stratos Cloud Systems",
                "location": "Remote / Seattle, WA",
                "work_mode": "Remote",
                "job_type": "Full-time",
                "salary_min": 135000.0,
                "salary_max": 175000.0,
                "salary_currency": "USD",
                "job_source": "Google Jobs",
                "external_id": "gj-strat-401",
                "original_url": "https://www.google.com/search?ibp=htl;jobs#fpstate=tldetail&htidocid=sample-401",
                "raw_description": (
                    "Stratos Cloud Systems is seeking a Cloud & DevOps Engineer to scale infrastructure as code. "
                    "Responsibilities: Provision Kubernetes clusters, manage Terraform configurations, and optimize cloud expenditure. "
                    "Requirements: Deep knowledge of AWS or GCP, Kubernetes, Docker, Terraform, Python, and Prometheus monitoring."
                ),
                "date_posted": datetime.datetime.utcnow() - datetime.timedelta(days=1)
            }
        ]

        results = []
        q_lower = query.lower() if query else ""
        loc_lower = location.lower() if location else ""

        for item in mock_dataset:
            match_q = not q_lower or (q_lower in item["title"].lower() or q_lower in item["raw_description"].lower())
            match_loc = not loc_lower or (loc_lower in item["location"].lower() or loc_lower in item["work_mode"].lower())
            if match_q and match_loc:
                results.append(item)

        return results[:limit]

    async def fetch_job_details(self, job_url_or_id: str) -> Optional[Dict[str, Any]]:
        return None
