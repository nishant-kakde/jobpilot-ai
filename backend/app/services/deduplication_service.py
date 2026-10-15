import re
import datetime
import difflib
import hashlib
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.config import settings
from app.models.models import Job
from app.schemas.canonical_job import CanonicalJob

class DeduplicationService:
    @staticmethod
    def normalize_string(s: Optional[str]) -> str:
        if not s:
            return ""
        # Lowercase, strip punctuation and collapse whitespace
        cleaned = re.sub(r"[^\w\s]", "", s.lower())
        return re.sub(r"\s+", " ", cleaned).strip()

    @classmethod
    def compute_exact_hash(cls, title: str, company: str, location: Optional[str] = None) -> str:
        norm_title = cls.normalize_string(title)
        norm_company = cls.normalize_string(company)
        norm_loc = cls.normalize_string(location)
        raw = f"{norm_title}|{norm_company}|{norm_loc}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    @classmethod
    def fuzzy_match_ratio(cls, s1: str, s2: str) -> float:
        norm1 = cls.normalize_string(s1)
        norm2 = cls.normalize_string(s2)
        if not norm1 or not norm2:
            return 0.0
        if norm1 == norm2:
            return 1.0
        matcher = difflib.SequenceMatcher(None, norm1, norm2)
        return matcher.ratio()

    @classmethod
    def is_fuzzy_duplicate(
        cls,
        title1: str, company1: str, loc1: Optional[str],
        title2: str, company2: str, loc2: Optional[str]
    ) -> Tuple[bool, float, str]:
        """
        Determines whether two job postings are duplicate listings using fuzzy matching.
        Returns: (is_duplicate, similarity_score, reason)
        """
        company_sim = cls.fuzzy_match_ratio(company1, company2)
        if company_sim < 0.75:
            return False, company_sim, "Company mismatch"

        title_sim = cls.fuzzy_match_ratio(title1, title2)
        if title_sim < 0.80:
            return False, title_sim, "Title mismatch"

        # Compare locations if both provided
        loc_sim = 1.0
        if loc1 and loc2:
            # If one is remote and the other is remote, match
            if "remote" in loc1.lower() and "remote" in loc2.lower():
                loc_sim = 1.0
            else:
                loc_sim = cls.fuzzy_match_ratio(loc1, loc2)
                if loc_sim < 0.50:
                    return False, loc_sim, "Location mismatch"

        overall = (title_sim * 0.5) + (company_sim * 0.35) + (loc_sim * 0.15)
        if overall >= 0.80:
            return True, overall, f"Fuzzy matched: title={title_sim:.2f}, company={company_sim:.2f}"
        return False, overall, "Below threshold"

    @classmethod
    def evaluate_ghost_job(
        cls,
        date_posted: Optional[datetime.datetime],
        repost_count: int,
        first_seen_at: Optional[datetime.datetime] = None
    ) -> Tuple[bool, List[str]]:
        """
        Detects if a job posting is likely a ghost job or stale evergreen repost.
        """
        now = datetime.datetime.now(datetime.timezone.utc)
        reasons = []

        # 1. Posting age check
        ref_date = date_posted or first_seen_at
        if ref_date:
            if ref_date.tzinfo is None:
                ref_date = ref_date.replace(tzinfo=datetime.timezone.utc)
            age_days = (now - ref_date).days
            if age_days >= settings.GHOST_JOB_THRESHOLD_DAYS:
                reasons.append(
                    f"Posting is {age_days} days old (exceeds threshold of {settings.GHOST_JOB_THRESHOLD_DAYS} days)"
                )

        # 2. Repeated reposts with unchanged content
        if repost_count >= settings.GHOST_JOB_REPOST_THRESHOLD:
            reasons.append(
                f"Repeatedly reposted {repost_count} times without meaningful updates"
            )

        is_ghost = len(reasons) > 0
        return is_ghost, reasons

    @classmethod
    async def find_existing_job(
        cls,
        db: AsyncSession,
        canonical: CanonicalJob
    ) -> Tuple[Optional[Job], bool, str]:
        """
        Finds existing matching job in database.
        Returns: (matched_job, is_exact, reason)
        """
        # Step 1: Exact URL match
        if canonical.original_url:
            url_query = select(Job).where(Job.original_url == canonical.original_url)
            url_res = await db.execute(url_query)
            existing_url = url_res.scalar_one_or_none()
            if existing_url:
                return existing_url, True, "Exact URL match"

        # Step 2: Exact (title, company) match
        query = select(Job).where(
            (Job.company.ilike(canonical.company.strip())) &
            (Job.title.ilike(canonical.title.strip()))
        )
        res = await db.execute(query)
        exact_matches = res.scalars().all()
        if exact_matches:
            return exact_matches[0], True, "Exact Title & Company match"

        # Step 3: Fuzzy matching over recent jobs with similar company
        company_query = select(Job).where(Job.company.ilike(f"%{canonical.company[:4]}%"))
        cand_res = await db.execute(company_query)
        candidates = cand_res.scalars().all()

        for cand in candidates:
            is_dup, score, reason = cls.is_fuzzy_duplicate(
                canonical.title, canonical.company, canonical.location,
                cand.title, cand.company, cand.location
            )
            if is_dup:
                return cand, False, f"Fuzzy duplicate ({reason}, score: {score:.2f})"

        return None, False, "New listing"

    @classmethod
    async def merge_or_create_job(
        cls,
        db: AsyncSession,
        canonical: CanonicalJob
    ) -> Tuple[Job, bool]:
        """
        Merges canonical job into existing job record or creates a new one.
        Returns: (job_record, is_new)
        """
        existing, is_exact, match_reason = await cls.find_existing_job(db, canonical)

        now = datetime.datetime.now(datetime.timezone.utc)
        if existing:
            # Merge logic: append new source url, update repost count and last_seen
            existing_urls = list(existing.source_urls or [])
            for u in canonical.source_urls:
                if u and u not in existing_urls:
                    existing_urls.append(u)
            if canonical.original_url and canonical.original_url not in existing_urls:
                existing_urls.append(canonical.original_url)
            existing.source_urls = existing_urls

            # Increment repost counter and update last_seen_at
            existing.repost_count = (existing.repost_count or 0) + 1
            existing.last_seen_at = now
            existing.updated_at = now

            # Re-evaluate ghost job status
            is_ghost, reasons = cls.evaluate_ghost_job(
                existing.date_posted,
                existing.repost_count,
                existing.first_seen_at
            )
            existing.is_ghost_job = is_ghost
            existing.ghost_job_reasons = reasons

            await db.flush()
            return existing, False

        # Brand new job creation
        is_ghost, reasons = cls.evaluate_ghost_job(
            canonical.date_posted or now,
            0,
            now
        )

        job = Job(
            title=canonical.title,
            company=canonical.company,
            location=canonical.location,
            work_mode=canonical.work_mode,
            job_type=canonical.job_type,
            salary_min=canonical.salary_min,
            salary_max=canonical.salary_max,
            salary_currency=canonical.salary_currency,
            raw_description=canonical.description_clean or canonical.raw_description,
            original_url=canonical.original_url,
            job_source=canonical.job_source,
            external_id=canonical.external_id,
            source_urls=canonical.source_urls or ([canonical.original_url] if canonical.original_url else []),
            is_ghost_job=is_ghost,
            ghost_job_reasons=reasons,
            repost_count=0,
            first_seen_at=now,
            last_seen_at=now,
            date_posted=canonical.date_posted or now,
            created_at=now,
            updated_at=now
        )
        db.add(job)
        await db.flush()
        return job, True

deduplication_service = DeduplicationService()
