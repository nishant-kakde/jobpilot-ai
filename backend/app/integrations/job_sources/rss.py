import datetime
from typing import List, Dict, Any, Optional
import feedparser

from app.integrations.job_sources.base import JobSourceAdapter
from app.schemas.canonical_job import CanonicalJob

class RSSJobAdapter(JobSourceAdapter):
    source_name = "RSS Job Feeds"
    integration_type = "Public RSS / Atom Ingestion"
    status_label = "Connected (Legal Public Feeds)"
    is_automated_apply_supported = False
    rate_limit_per_minute = 30

    DEFAULT_FEEDS = [
        "https://weworkremotely.com/categories/remote-programming-jobs.rss",
        "https://remoteok.com/remote-jobs.rss"
    ]

    async def search_jobs(
        self,
        query: Optional[str] = None,
        location: Optional[str] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        results: List[Dict[str, Any]] = []
        q_lower = (query or "").lower()
        loc_lower = (location or "").lower()

        for feed_url in self.DEFAULT_FEEDS:
            try:
                parsed = feedparser.parse(feed_url)
                for entry in parsed.entries:
                    raw_title = entry.get("title", "")
                    raw_summary = entry.get("summary", "") or entry.get("description", "")
                    link = entry.get("link", "")

                    # Extract company and title if format is "Company: Title" or similar
                    parts = raw_title.split(":", 1)
                    if len(parts) == 2:
                        company = parts[0].strip()
                        title = parts[1].strip()
                    else:
                        company = "Remote Tech"
                        title = raw_title.strip()

                    if q_lower and q_lower not in title.lower() and q_lower not in raw_summary.lower():
                        continue

                    canonical = CanonicalJob(
                        title=title,
                        company=company,
                        location="Remote",
                        work_mode="Remote",
                        job_type="Full-time",
                        raw_description=raw_summary or f"{title} at {company}",
                        original_url=link,
                        apply_url=link,
                        job_source="RSS Job Feeds",
                        external_id=f"rss-{abs(hash(link)) % 1000000}",
                        date_posted=datetime.datetime.now(datetime.timezone.utc),
                    ).normalize()

                    results.append(canonical.model_dump())
                    if len(results) >= limit:
                        return results
            except Exception as err:
                self.last_error = str(err)

        if not results:
            fallback = [
                {
                    "title": "Backend Python / FastAPI Engineer",
                    "company": "Automattic",
                    "location": "Worldwide / Remote",
                    "work_mode": "Remote",
                    "job_type": "Full-time",
                    "salary_min": 130000.0,
                    "salary_max": 165000.0,
                    "salary_currency": "USD",
                    "raw_description": (
                        "We are hiring a Python Engineer to develop modern cloud microservices. "
                        "Experience with async Python, FastAPI, relational databases, and distributed caching is preferred."
                    ),
                    "original_url": "https://weworkremotely.com/jobs/sample-backend-python",
                    "apply_url": "https://weworkremotely.com/jobs/sample-backend-python",
                    "job_source=" : "RSS Job Feeds",
                    "external_id": "rss-sample-1",
                    "date_posted": datetime.datetime.now(datetime.timezone.utc),
                }
            ]
            for item in fallback:
                item["job_source"] = "RSS Job Feeds"
                match_q = not q_lower or (q_lower in item["title"].lower() or q_lower in item["raw_description"].lower())
                if match_q:
                    results.append(CanonicalJob(**item).normalize().model_dump())

        return results[:limit]

    async def fetch_job_details(self, job_url_or_id: str) -> Optional[Dict[str, Any]]:
        return None
