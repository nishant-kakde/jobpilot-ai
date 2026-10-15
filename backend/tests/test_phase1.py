import pytest
import asyncio
import datetime
from fastapi.testclient import TestClient

from app.main import app
from app.schemas.canonical_job import CanonicalJob, clean_html, normalize_work_mode
from app.services.deduplication_service import deduplication_service
from app.core.encryption import encryption_service
from app.services.storage import storage_service
from app.integrations.job_sources import get_all_adapters, adapters
from app.models.models import Job, User, Profile, MasterResume, RefreshToken, AuditLog
from app.core.database import AsyncSessionLocal
from sqlalchemy.future import select

def test_canonical_job_normalization():
    raw_html = "<p>Join our team! <strong>Python</strong> &amp; <em>FastAPI</em> experience required.&nbsp;</p>"
    cleaned = clean_html(raw_html)
    assert "<p>" not in cleaned
    assert "<strong>" not in cleaned
    assert "Python & FastAPI experience required." in cleaned

    assert normalize_work_mode("telecommute / remote") == "Remote"
    assert normalize_work_mode("hybrid 2 days office") == "Hybrid"
    assert normalize_work_mode("in-office full-time") == "On-site"

    job = CanonicalJob(
        title="  Senior Backend Engineer  ",
        company=" Acme Corp ",
        raw_description=raw_html,
        original_url="https://example.com/job/1",
        job_source="Greenhouse",
    ).normalize()

    assert job.title == "Senior Backend Engineer"
    assert job.company == "Acme Corp"
    assert job.description_clean is not None
    assert "https://example.com/job/1" in job.source_urls

def test_job_adapters_health_and_tos_guardrails():
    all_adapters = get_all_adapters()
    assert len(all_adapters) >= 8

    # Verify scraping-based adapters are disabled by default with ToS warning
    for name in ["LinkedIn", "Indeed", "Naukri"]:
        ad = adapters[name]
        assert ad.is_enabled is False
        assert "Terms of Service" in (ad.terms_warning or "")
        health = ad.get_health_status()
        assert health["status"] == "disabled"

    # Verify official API adapters are enabled by default
    for name in ["Greenhouse", "Lever", "Ashby", "RSS Job Feeds", "Email Alerts"]:
        ad = adapters[name]
        assert ad.is_enabled is True
        health = ad.get_health_status()
        assert health["status"] == "healthy"

def test_greenhouse_and_lever_adapters():
    async def _run():
        gh_ad = adapters["Greenhouse"]
        gh_jobs = await gh_ad.search_jobs(query="Systems", limit=2)
        assert len(gh_jobs) >= 1
        assert "Greenhouse" in gh_jobs[0]["job_source"]
        assert "source_urls" in gh_jobs[0]

        lev_ad = adapters["Lever"]
        lev_jobs = await lev_ad.search_jobs(query="Engineer", limit=2)
        assert len(lev_jobs) >= 1
        assert "Lever" in lev_jobs[0]["job_source"]

    asyncio.run(_run())

def test_email_alerts_adapter():
    async def _run():
        email_ad = adapters["Email Alerts"]
        jobs = await email_ad.search_jobs(limit=2)
        assert len(jobs) >= 1
        assert jobs[0]["job_source"] == "Email Alerts"

    asyncio.run(_run())

def test_deduplication_fuzzy_and_ghost_job_logic():
    # 1. Fuzzy matching
    is_dup, score, reason = deduplication_service.is_fuzzy_duplicate(
        title1="Senior Full Stack Software Engineer", company1="Google LLC", loc1="Remote",
        title2="Sr. Full-Stack Software Engineer", company2="Google", loc2="Remote"
    )
    assert is_dup is True
    assert score >= 0.80

    # Non-duplicate
    is_dup2, score2, _ = deduplication_service.is_fuzzy_duplicate(
        title1="Senior Data Analyst", company1="Stripe", loc1="Remote",
        title2="Staff Backend Engineer", company2="Netflix", loc2="San Francisco"
    )
    assert is_dup2 is False

    # 2. Ghost job detection
    now = datetime.datetime.now(datetime.timezone.utc)
    old_date = now - datetime.timedelta(days=60)
    is_ghost, reasons = deduplication_service.evaluate_ghost_job(
        date_posted=old_date, repost_count=4
    )
    assert is_ghost is True
    assert any("days old" in r for r in reasons)
    assert any("reposted" in r for r in reasons)

    # Fresh job
    fresh_ghost, _ = deduplication_service.evaluate_ghost_job(
        date_posted=now, repost_count=0
    )
    assert fresh_ghost is False

def test_pii_field_level_encryption():
    secret_phone = "+1 (555) 987-6543"
    encrypted = encryption_service.encrypt(secret_phone)
    assert encrypted != secret_phone
    assert isinstance(encrypted, str)

    decrypted = encryption_service.decrypt(encrypted)
    assert decrypted == secret_phone

    # Verify graceful handling of None and empty strings
    assert encryption_service.encrypt(None) is None
    assert encryption_service.decrypt(None) is None
    assert encryption_service.encrypt("") == ""

def test_storage_interface_roundtrip():
    async def _run():
        test_content = b"Candidate Master Resume Content in PDF binary format."
        saved_key = await storage_service.save_file(test_content, "test_vault_resume.pdf")
        assert saved_key is not None

        retrieved = await storage_service.get_file(saved_key)
        assert retrieved == test_content

        deleted = await storage_service.delete_file(saved_key)
        assert deleted is True

    asyncio.run(_run())

def test_refresh_token_and_audit_log_flow():
    with TestClient(app) as client:
        # 1. Login with demo user
        login_resp = client.post("/api/auth/login", json={
            "email": "demo@jobpilot.ai",
            "password": "password123"
        })
        assert login_resp.status_code == 200
        data = login_resp.json()
        assert "access_token" in data
        assert "refresh_token" in data
        refresh_token = data["refresh_token"]

        # 2. Rotate refresh token via /api/auth/refresh
        refresh_resp = client.post("/api/auth/refresh", json={
            "refresh_token": refresh_token
        })
        assert refresh_resp.status_code == 200
        refresh_data = refresh_resp.json()
        assert "access_token" in refresh_data
        assert "refresh_token" in refresh_data
        new_refresh = refresh_data["refresh_token"]
        assert new_refresh != refresh_token  # rotated!

        # 3. Old refresh token should now be rejected as revoked
        stale_resp = client.post("/api/auth/refresh", json={
            "refresh_token": refresh_token
        })
        assert stale_resp.status_code == 401

def test_rate_limiting_and_correlation_id_headers():
    with TestClient(app) as client:
        res = client.get("/api/health")
        assert res.status_code == 200
        assert "X-Request-ID" in res.headers
        data = res.json()
        assert data["rate_limiting"] == "active"
        assert data["storage_backend"] in ["local", "s3"]
