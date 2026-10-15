import asyncio
import pytest
from fastapi.testclient import TestClient
from app.main import app, seed_initial_data
from app.core.database import init_db

@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    asyncio.run(init_db())
    asyncio.run(seed_initial_data())

def test_health_check_api():
    with TestClient(app) as client:
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["app_name"] == "JobPilot AI"

def test_auth_login_demo_user():
    with TestClient(app) as client:
        response = client.post("/api/auth/login", json={
            "email": "demo@jobpilot.ai",
            "password": "password123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == "demo@jobpilot.ai"
        assert data["user"]["full_name"] == "Alex Chen"

def test_auth_register_new_user():
    import uuid
    with TestClient(app) as client:
        email = f"candidate_{uuid.uuid4().hex[:8]}@test.com"
        response = client.post("/api/auth/register", json={
            "email": email,
            "password": "SecretPassword123",
            "full_name": "Test Candidate"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == email

def test_jobs_list_api():
    with TestClient(app) as client:
        response = client.get("/api/jobs")
        assert response.status_code == 200
        jobs = response.json()
        assert isinstance(jobs, list)
        assert len(jobs) >= 1
        job0 = jobs[0]
        assert "title" in job0
        assert "company" in job0
        assert "raw_description" in job0
        assert "job_source" in job0

def test_job_source_adapters_api():
    with TestClient(app) as client:
        response = client.get("/api/jobs/sources/adapters")
        assert response.status_code == 200
        adapters = response.json()
        assert len(adapters) >= 4
        names = [a["source_name"] for a in adapters]
        assert "LinkedIn" in names
        assert "Indeed" in names
        assert "Naukri" in names

def test_dashboard_stats_authorized():
    with TestClient(app) as client:
        login_resp = client.post("/api/auth/login", json={
            "email": "demo@jobpilot.ai",
            "password": "password123"
        })
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        dash_resp = client.get("/api/dashboard/stats", headers=headers)
        assert dash_resp.status_code == 200
        stats = dash_resp.json()
        assert stats["total_jobs_found"] >= 1
        assert "applications_by_status" in stats
        assert "funnel_stages" in stats
        assert len(stats["funnel_stages"]) == 6

def test_profile_api_authorized():
    with TestClient(app) as client:
        login_resp = client.post("/api/auth/login", json={
            "email": "demo@jobpilot.ai",
            "password": "password123"
        })
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        prof_resp = client.get("/api/profile", headers=headers)
        assert prof_resp.status_code == 200
        profile = prof_resp.json()
        assert "skills" in profile
        assert len(profile["skills"]) >= 5
        assert "experiences" in profile
        assert "educations" in profile
