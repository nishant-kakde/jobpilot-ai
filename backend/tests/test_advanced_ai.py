import pytest
import datetime
from fastapi.testclient import TestClient

from app.main import app, seed_initial_data
from app.ai.ai_orchestrator import ai_orchestrator
from app.ai.embeddings import embedding_engine
from app.ai.hallucination_guard import hallucination_guard

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def auth_headers(client):
    # Ensure seed data exists
    resp = client.post("/api/auth/login", json={"email": "demo@jobpilot.ai", "password": "password123"})
    if resp.status_code != 200:
        import asyncio
        asyncio.run(seed_initial_data())
        resp = client.post("/api/auth/login", json={"email": "demo@jobpilot.ai", "password": "password123"})
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_embedding_engine_cosine_similarity():
    v1 = [1.0, 0.0, 0.0]
    v2 = [1.0, 0.0, 0.0]
    v3 = [0.0, 1.0, 0.0]
    assert embedding_engine.cosine_similarity(v1, v2) == 1.0
    assert embedding_engine.cosine_similarity(v1, v3) == 0.0

def test_embedding_engine_document_ranking():
    docs = [
        {"id": "1", "text": "Senior Python developer building FastAPI backends and microservices."},
        {"id": "2", "text": "Marketing manager specializing in digital campaigns and social media."},
        {"id": "3", "text": "Data Analyst querying PostgreSQL databases and building dashboards."}
    ]
    query = "Python engineer FastAPI"
    ranked = embedding_engine.rank_documents(query=query, documents=docs, text_key="text", top_k=2)
    assert len(ranked) == 2
    assert ranked[0]["id"] == "1"
    assert ranked[0]["similarity_score"] > ranked[1]["similarity_score"]

def test_hallucination_guard_audit():
    profile = {
        "skills": [{"name": "Python"}, {"name": "SQL"}],
        "experiences": [{"company": "Acme Corp", "position": "Software Engineer"}],
        "educations": [{"institution": "Stanford University", "degree": "B.S."}]
    }

    # Grounded resume
    grounded_resume = {
        "experiences": [{"company": "Acme Corp", "position": "Software Engineer"}],
        "educations": [{"institution": "Stanford University", "degree": "B.S."}]
    }
    audit1 = hallucination_guard.audit_tailored_resume(grounded_resume, profile)
    assert audit1["is_factually_grounded"] is True

    # Hallucinated resume with fake employer
    fake_resume = {
        "experiences": [{"company": "Invented Startup LLC", "position": "CTO"}],
        "educations": [{"institution": "Stanford University", "degree": "B.S."}]
    }
    audit2 = hallucination_guard.audit_tailored_resume(fake_resume, profile)
    assert audit2["is_factually_grounded"] is False
    assert len(audit2["flagged_items"]) > 0

def test_career_roadmap_api(client, auth_headers):
    # 1. Generate roadmap
    payload = {"target_role": "Data Analyst", "weekly_hours": 12}
    resp = client.post("/api/roadmap/generate", json=payload, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["target_role"] == "Data Analyst"
    assert "critical_skill_gaps" in data
    assert len(data["milestones_30_days"]) > 0
    roadmap_id = data["id"]

    # 2. Update progress
    patch_resp = client.patch(f"/api/roadmap/{roadmap_id}/progress?progress_percentage=35.0", headers=auth_headers)
    assert patch_resp.status_code == 200
    assert patch_resp.json()["progress_percentage"] == 35.0

    # 3. List roadmaps
    list_resp = client.get("/api/roadmap", headers=auth_headers)
    assert list_resp.status_code == 200
    assert len(list_resp.json()) >= 1

def test_mock_interview_studio_flow(client, auth_headers):
    # 1. Create mock interview session
    session_payload = {"target_role": "Senior Python Engineer", "title": "Mock Technical Round"}
    s_resp = client.post("/api/interviews/sessions", json=session_payload, headers=auth_headers)
    assert s_resp.status_code == 200
    session_data = s_resp.json()
    session_id = session_data["id"]

    # 2. Evaluate answer
    eval_payload = {
        "question": "Describe how you optimized a slow query in PostgreSQL.",
        "candidate_answer": "When facing high latency on our order table, I analyzed the query plan with EXPLAIN ANALYZE, added a composite B-tree index on user_id and created_at, which reduced response time by 45%.",
        "category": "Technical"
    }
    ans_resp = client.post(f"/api/interviews/sessions/{session_id}/evaluate", json=eval_payload, headers=auth_headers)
    assert ans_resp.status_code == 200
    ans_data = ans_resp.json()
    assert ans_data["overall_score"] > 60.0
    assert ans_data["star_framework_score"] > 50.0
    assert len(ans_data["strengths"]) > 0

    # 3. Complete session
    comp_resp = client.post(f"/api/interviews/sessions/{session_id}/complete", headers=auth_headers)
    assert comp_resp.status_code == 200
    comp_data = comp_resp.json()
    assert comp_data["status"] == "completed"
    assert comp_data["overall_score"] is not None

def test_ai_settings_and_usage_api(client, auth_headers):
    # 1. Update AI settings
    settings_payload = {
        "selected_provider": "built-in",
        "openai_model": "gpt-4o",
        "gemini_model": "gemini-1.5-flash",
        "anthropic_model": "claude-3-5-sonnet-20241022"
    }
    set_resp = client.put("/api/ai/settings", json=settings_payload, headers=auth_headers)
    assert set_resp.status_code == 200
    set_data = set_resp.json()
    assert set_data["selected_provider"] == "built-in"

    # 2. Get AI settings
    get_resp = client.get("/api/ai/settings", headers=auth_headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["selected_provider"] == "built-in"

    # 3. Get AI usage stats
    usage_resp = client.get("/api/ai/usage", headers=auth_headers)
    assert usage_resp.status_code == 200
    usage_data = usage_resp.json()
    assert "total_tokens_consumed" in usage_data
    assert "total_estimated_cost_usd" in usage_data

def test_semantic_job_search_api(client, auth_headers):
    search_payload = {
        "query": "Remote software engineer building APIs",
        "limit": 5
    }
    resp = client.post("/api/jobs/semantic-search", json=search_payload, headers=auth_headers)
    assert resp.status_code == 200
    results = resp.json()
    assert isinstance(results, list)

def test_conversations_api(client, auth_headers):
    # Create conversation
    create_resp = client.post("/api/assistant/conversations", json={"title": "Test Career Discussion"}, headers=auth_headers)
    assert create_resp.status_code == 200
    conv = create_resp.json()
    conv_id = conv["id"]

    # Send message
    msg_resp = client.post(f"/api/assistant/conversations/{conv_id}/messages", json={"content": "What skills should I learn for a Senior Data Analyst role?"}, headers=auth_headers)
    assert msg_resp.status_code == 200
    msg = msg_resp.json()
    assert msg["role"] == "assistant"
    assert len(msg["content"]) > 20

    # Get conversation
    get_resp = client.get(f"/api/assistant/conversations/{conv_id}", headers=auth_headers)
    assert get_resp.status_code == 200
    assert len(get_resp.json()["messages"]) >= 2

