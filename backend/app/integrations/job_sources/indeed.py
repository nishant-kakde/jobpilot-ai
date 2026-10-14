import datetime
from typing import List, Dict, Any, Optional
from app.integrations.job_sources.base import JobSourceAdapter

class IndeedAdapter(JobSourceAdapter):
    source_name = "Indeed"
    integration_type = "Public RSS & Authorized Job Feeds"
    status_label = "Connected (Permitted Feed)"
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
                "title": "Machine Learning Engineer",
                "company": "Cognitive AI Labs",
                "location": "Remote",
                "work_mode": "Remote",
                "job_type": "Full-time",
                "salary_min": 150000.0,
                "salary_max": 195000.0,
                "salary_currency": "USD",
                "job_source": "Indeed",
                "external_id": "ind-cog-201",
                "original_url": "https://www.indeed.com/viewjob?jk=sample-201",
                "raw_description": (
                    "Cognitive AI Labs is hiring a Machine Learning Engineer to deploy production generative and predictive AI pipelines. "
                    "Responsibilities: Fine-tune transformer models, design vector embeddings retrieval pipelines, and integrate with backend microservices. "
                    "Requirements: Proficient in Python, PyTorch, Hugging Face, Scikit-learn, Docker, and REST APIs. Strong algorithmic background."
                ),
                "date_posted": datetime.datetime.utcnow() - datetime.timedelta(days=1)
            },
            {
                "title": "Junior Python Developer",
                "company": "NextGen Retail",
                "location": "Chicago, IL",
                "work_mode": "Hybrid",
                "job_type": "Full-time",
                "salary_min": 85000.0,
                "salary_max": 105000.0,
                "salary_currency": "USD",
                "job_source": "Indeed",
                "external_id": "ind-next-202",
                "original_url": "https://www.indeed.com/viewjob?jk=sample-202",
                "raw_description": (
                    "NextGen Retail is expanding our backend automation squad. "
                    "Responsibilities: Maintain inventory tracking APIs, write unit tests, and integrate vendor catalog webhooks. "
                    "Requirements: 1-2 years experience with Python, SQL, Git, and automated testing."
                ),
                "date_posted": datetime.datetime.utcnow() - datetime.timedelta(days=3)
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
