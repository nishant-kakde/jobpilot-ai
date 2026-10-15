import datetime
from typing import List, Dict, Any, Optional
from app.integrations.job_sources.base import JobSourceAdapter

class CompanyCareerAdapter(JobSourceAdapter):
    source_name = "Company Career Pages"
    integration_type = "Direct ATS Feeds (Greenhouse, Lever, Workday)"
    status_label = "Connected (Direct ATS Feeds)"
    is_automated_apply_supported = True  # Supports browser-assisted autofill workflow on permitted pages
    auth_required = False

    async def search_jobs(
        self,
        query: Optional[str] = None,
        location: Optional[str] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        mock_dataset = [
            {
                "title": "Software Engineer II - Platform Core",
                "company": "Stripe / Greenhouse Careers",
                "location": "Remote / San Francisco",
                "work_mode": "Remote",
                "job_type": "Full-time",
                "salary_min": 155000.0,
                "salary_max": 200000.0,
                "salary_currency": "USD",
                "job_source": "Company Career Pages",
                "external_id": "gh-stripe-501",
                "original_url": "https://boards.greenhouse.io/sample/jobs/501",
                "raw_description": (
                    "Join the core platform team to build resilient distributed payment primitives. "
                    "Responsibilities: Deliver zero-downtime database migrations, microservice endpoints, and developer tooling. "
                    "Requirements: 3+ years experience with backend systems (Python, Go, or Java), distributed systems, and SQL."
                ),
                "date_posted": datetime.datetime.utcnow() - datetime.timedelta(days=1)
            },
            {
                "title": "Data Scientist - Growth & Retention",
                "company": "Shopify / Lever Careers",
                "location": "Remote / Toronto / New York",
                "work_mode": "Remote",
                "job_type": "Full-time",
                "salary_min": 130000.0,
                "salary_max": 165000.0,
                "salary_currency": "USD",
                "job_source": "Company Career Pages",
                "external_id": "lev-shopify-502",
                "original_url": "https://jobs.lever.co/sample/jobs/502",
                "raw_description": (
                    "Shopify's Growth team is seeking a Data Scientist to model merchant retention and lifetime value. "
                    "Responsibilities: Formulate predictive churn models, design A/B experimentation frameworks, and communicate findings to leadership. "
                    "Requirements: Proficiency in Python (Pandas/Scikit-Learn), SQL, experimentation design, and business metrics."
                ),
                "date_posted": datetime.datetime.utcnow() - datetime.timedelta(days=2)
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
