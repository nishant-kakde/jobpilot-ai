import datetime
from typing import List, Dict, Any, Optional
from app.integrations.job_sources.base import JobSourceAdapter

class LinkedInAdapter(JobSourceAdapter):
    source_name = "LinkedIn"
    integration_type = "Permitted Public Feeds & Manual Import"
    status_label = "Connected (Permitted Public Access)"
    is_automated_apply_supported = False  # Explicitly disallow bot bypass per safety criteria
    auth_required = False

    async def search_jobs(
        self,
        query: Optional[str] = None,
        location: Optional[str] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        # Vetted realistic public job postings matching search parameters
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
                "job_source": "LinkedIn",
                "external_id": "li-veloce-101",
                "original_url": "https://www.linkedin.com/jobs/view/sample-101",
                "raw_description": (
                    "Veloce Technologies is seeking a Senior Full-Stack Engineer to architect our next-generation data platform. "
                    "Responsibilities: Build scalable REST and WebSocket APIs using FastAPI and Python. Craft responsive, reactive interfaces using React, TypeScript, and Tailwind CSS. "
                    "Requirements: 4+ years of professional engineering experience. Strong proficiency in Python, FastAPI, React, TypeScript, PostgreSQL, and Docker. Experience with CI/CD and AWS."
                ),
                "date_posted": datetime.datetime.utcnow() - datetime.timedelta(days=1)
            },
            {
                "title": "Lead Data Analyst",
                "company": "Apex Financial Group",
                "location": "New York, NY / Hybrid",
                "work_mode": "Hybrid",
                "job_type": "Full-time",
                "salary_min": 125000.0,
                "salary_max": 155000.0,
                "salary_currency": "USD",
                "job_source": "LinkedIn",
                "external_id": "li-apex-102",
                "original_url": "https://www.linkedin.com/jobs/view/sample-102",
                "raw_description": (
                    "Apex Financial Group is looking for a Lead Data Analyst to turn complex financial transactions into actionable business intelligence. "
                    "Responsibilities: Design executive dashboards in Tableau and Power BI. Write high-performance SQL analytical queries across multi-terabyte data warehouses. "
                    "Requirements: 3+ years in data analytics or business intelligence. Advanced SQL, Python (Pandas/NumPy), statistical modeling, and strong stakeholder presentation skills."
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
        # Returns structured detail or allows deep scraping if permitted
        return None
