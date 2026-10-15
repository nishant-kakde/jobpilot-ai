import re
import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator

def clean_html(raw_html: str) -> str:
    """Strip HTML tags and unescape common HTML entities."""
    if not raw_html:
        return ""
    # Remove HTML tags
    cleanr = re.compile(r"<.*?>")
    cleantext = re.sub(cleanr, " ", raw_html)
    # Replace entities
    cleantext = (
        cleantext.replace("&nbsp;", " ")
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", '"')
        .replace("&#39;", "'")
    )
    # Collapse multiple whitespaces
    return re.sub(r"\s+", " ", cleantext).strip()

def normalize_work_mode(val: Optional[str]) -> str:
    if not val:
        return "Remote"
    v = val.lower()
    if any(k in v for k in ["remote", "telecommute", "wfh", "work from home", "anywhere"]):
        return "Remote"
    if any(k in v for k in ["hybrid", "flexible"]):
        return "Hybrid"
    if any(k in v for k in ["on-site", "onsite", "in-office", "office"]):
        return "On-site"
    return "Remote"

class CanonicalJob(BaseModel):
    title: str
    company: str
    location: Optional[str] = "Remote"
    work_mode: str = "Remote"
    job_type: str = "Full-time"
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    salary_currency: str = "USD"
    salary_interval: str = "yearly"
    raw_description: str
    description_clean: Optional[str] = None
    original_url: Optional[str] = None
    apply_url: Optional[str] = None
    job_source: str
    external_id: Optional[str] = None
    source_urls: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    date_posted: Optional[datetime.datetime] = None
    first_seen_at: Optional[datetime.datetime] = None
    last_seen_at: Optional[datetime.datetime] = None
    is_ghost_job: bool = False
    ghost_job_reasons: List[str] = Field(default_factory=list)
    repost_count: int = 0

    @field_validator("title", "company")
    @classmethod
    def clean_strings(cls, v: str) -> str:
        return v.strip() if v else ""

    @field_validator("work_mode", mode="before")
    @classmethod
    def validate_work_mode(cls, v: Optional[str]) -> str:
        return normalize_work_mode(v)

    def normalize(self) -> "CanonicalJob":
        """Returns normalized canonical job with cleaned text and populated source_urls."""
        if not self.description_clean:
            self.description_clean = clean_html(self.raw_description)
        if self.original_url and self.original_url not in self.source_urls:
            self.source_urls.append(self.original_url)
        if self.apply_url and self.apply_url not in self.source_urls:
            self.source_urls.append(self.apply_url)
        if not self.date_posted:
            self.date_posted = datetime.datetime.now(datetime.timezone.utc)
        if not self.first_seen_at:
            self.first_seen_at = self.date_posted
        if not self.last_seen_at:
            self.last_seen_at = self.first_seen_at
        return self
