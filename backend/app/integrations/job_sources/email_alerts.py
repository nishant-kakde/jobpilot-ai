import re
import datetime
import email
from email import policy
from typing import List, Dict, Any, Optional

from app.integrations.job_sources.base import JobSourceAdapter
from app.schemas.canonical_job import CanonicalJob

class EmailAlertsAdapter(JobSourceAdapter):
    source_name = "Email Alerts"
    integration_type = "Parsed Email Ingestion"
    status_label = "Connected (Candidate Permitted Alerts)"
    is_automated_apply_supported = False
    rate_limit_per_minute = 60

    def parse_raw_email(self, raw_email_content: str) -> List[CanonicalJob]:
        """
        Parses raw RFC822 or plain text/HTML email alert content and extracts job postings.
        """
        jobs: List[CanonicalJob] = []
        try:
            msg = email.message_from_string(raw_email_content, policy=policy.default)
            body = msg.get_body(preferencelist=('plain', 'html'))
            content = body.get_content() if body else raw_email_content
        except Exception:
            content = raw_email_content

        # Convert <br> or <p> tags into newlines if HTML
        normalized_content = re.sub(r"<br\s*/?>|</p>", "\n", content, flags=re.IGNORECASE)
        normalized_content = re.sub(r"<[^>]+>", " ", normalized_content)

        # Regex heuristic: extract Role/Title, Company, Location, Apply URL
        job_pattern = re.compile(
            r"(?:Title|Role|Position):\s*(?P<title>[^\r\n]+)"
            r"(?:[\r\n\s]+(?:Company|Employer):\s*(?P<company>[^\r\n]+))"
            r"(?:[\r\n\s]+Location:\s*(?P<location>[^\r\n]+))?"
            r"(?:[\r\n\s]+(?:Apply|Link|URL):\s*(?P<url>https?://[^\s\r\n]+))?",
            re.IGNORECASE
        )

        matches = list(job_pattern.finditer(normalized_content))
        for m in matches:
            title = m.group("title").strip()
            company = m.group("company").strip()
            loc = (m.group("location") or "Remote").strip()
            url = (m.group("url") or "").strip()

            job = CanonicalJob(
                title=title,
                company=company,
                location=loc,
                work_mode="Remote" if "remote" in loc.lower() else "Hybrid",
                job_type="Full-time",
                raw_description=f"Ingested from candidate email alert for {title} at {company}. Location: {loc}",
                original_url=url or None,
                apply_url=url or None,
                job_source="Email Alerts",
                external_id=f"email-{abs(hash(title + company)) % 1000000}",
                date_posted=datetime.datetime.now(datetime.timezone.utc),
            ).normalize()
            jobs.append(job)

        return jobs

    async def search_jobs(
        self,
        query: Optional[str] = None,
        location: Optional[str] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        sample_email = (
            "Role: Senior Data Analytics Engineer\n"
            "Company: Snowflake\n"
            "Location: Remote / US\n"
            "Apply: https://careers.snowflake.com/jobs/sample-101\n\n"
            "Role: Lead AI Backend Engineer\n"
            "Company: Anthropic\n"
            "Location: San Francisco, CA / Remote\n"
            "Apply: https://anthropic.com/careers/sample-102\n"
        )
        parsed = self.parse_raw_email(sample_email)
        results = []
        q_lower = (query or "").lower()
        loc_lower = (location or "").lower()

        for j in parsed:
            if q_lower and q_lower not in j.title.lower() and q_lower not in j.company.lower():
                continue
            if loc_lower and loc_lower not in (j.location or "").lower():
                continue
            results.append(j.model_dump())

        return results[:limit]

    async def fetch_job_details(self, job_url_or_id: str) -> Optional[Dict[str, Any]]:
        return None
