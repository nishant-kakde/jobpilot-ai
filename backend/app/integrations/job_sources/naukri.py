import datetime
from typing import List, Dict, Any, Optional
from app.integrations.job_sources.base import JobSourceAdapter

class NaukriAdapter(JobSourceAdapter):
    source_name = "Naukri"
    integration_type = "Permitted Public Feeds & Manual Import"
    status_label = "Connected (Permitted Public Access)"
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
                "title": "Business Intelligence & Data Analyst",
                "company": "Infosys Cloud Solutions",
                "location": "Pune / Bengaluru / Hybrid",
                "work_mode": "Hybrid",
                "job_type": "Full-time",
                "salary_min": 1400000.0,
                "salary_max": 2200000.0,
                "salary_currency": "INR",
                "job_source": "Naukri",
                "external_id": "nk-inf-301",
                "original_url": "https://www.naukri.com/job-listings-sample-301",
                "raw_description": (
                    "Infosys Cloud Solutions is hiring a Business Intelligence & Data Analyst for enterprise banking transformation. "
                    "Responsibilities: Develop automated ETL pipelines, build executive scorecards, and run statistical analysis on customer churn. "
                    "Requirements: 3-6 years experience in SQL, Python, Power BI, Advanced Excel, and data warehousing principles."
                ),
                "date_posted": datetime.datetime.utcnow() - datetime.timedelta(days=1)
            },
            {
                "title": "Backend Python & FastAPI Engineer",
                "company": "Tata Consultancy Digital",
                "location": "Mumbai / Remote",
                "work_mode": "Remote",
                "job_type": "Full-time",
                "salary_min": 1600000.0,
                "salary_max": 2500000.0,
                "salary_currency": "INR",
                "job_source": "Naukri",
                "external_id": "nk-tata-302",
                "original_url": "https://www.naukri.com/job-listings-sample-302",
                "raw_description": (
                    "Looking for a Backend Python Engineer with deep FastAPI, PostgreSQL, and Docker experience. "
                    "Responsibilities: Build microservices with high transaction throughput and strict latency SLAs. "
                    "Requirements: Hands-on mastery of Python, FastAPI, SQLAlchemy, Redis, Docker, and Kafka."
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
