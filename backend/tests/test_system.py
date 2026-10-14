import pytest
import datetime
from app.core.security import get_password_hash, verify_password, create_access_token, decode_access_token
from app.services.ai_service import ai_service
from app.services.job_matcher import job_matcher
from app.services.resume_parser import resume_parser
from app.services.resume_generator import resume_generator
from app.services.autofill_service import autofill_service
from app.integrations.job_sources.manual_import import ManualImportAdapter

def test_password_hashing():
    pw = "SecretSecurePass123"
    hashed = get_password_hash(pw)
    assert hashed != pw
    assert verify_password(pw, hashed) is True
    assert verify_password("WrongPass", hashed) is False

def test_jwt_token():
    payload = {"sub": "user_abc_123", "email": "test@example.com"}
    token = create_access_token(payload, expires_delta=datetime.timedelta(minutes=30))
    decoded = decode_access_token(token)
    assert decoded is not None
    assert decoded["sub"] == "user_abc_123"
    assert decoded["email"] == "test@example.com"

import asyncio

def test_resume_parser_structured():
    sample_text = """
    Alex Rivera
    alex.rivera@example.com
    (555) 234-5678
    https://linkedin.com/in/alexrivera
    
    Professional Summary
    Experienced software engineer with 5 years in Python, SQL, and FastAPI.
    
    Skills: Python, SQL, React, FastAPI, Docker, PostgreSQL
    
    Experience:
    Senior Software Engineer at CloudData Inc (2021 - Present)
    Built distributed pipelines and REST APIs using FastAPI and PostgreSQL.
    """
    raw_text, parsed = asyncio.run(resume_parser.parse_file("resume.txt", sample_text.encode("utf-8")))
    assert "alex.rivera@example.com" in parsed["email"]
    assert any("python" in s.lower() for s in parsed["skills"])
    assert any("sql" in s.lower() for s in parsed["skills"])

def test_job_matcher_explainable():
    candidate_profile = {
        "years_of_experience": 4.0,
        "work_mode_preference": "Remote",
        "preferred_locations": ["Remote", "New York"],
        "skills": ["Python", "SQL", "FastAPI", "React", "PostgreSQL"],
        "educations": [{"degree": "B.S. in Computer Science"}]
    }
    job_data = {
        "work_mode": "Remote",
        "location": "Remote",
        "salary_min": 120000.0,
        "salary_max": 160000.0
    }
    analysis_data = {
        "required_skills": ["Python", "FastAPI", "PostgreSQL"],
        "technical_keywords": ["SQL", "Docker", "Git"],
        "experience_years_min": 3.0
    }
    match_result = job_matcher.calculate_match(candidate_profile, job_data, analysis_data)
    assert match_result["overall_score"] >= 75.0
    assert match_result["skills_score"] > 60.0
    assert len(match_result["matched_skills"]) >= 2
    assert "explanation" in match_result
    assert isinstance(match_result["recommendations"], list)

def test_ai_resume_tailoring_factual_accuracy():
    master_profile = {
        "full_name": "Jordan Lee",
        "years_of_experience": 3.0,
        "skills": [{"name": "Python"}, {"name": "SQL"}, {"name": "FastAPI"}],
        "experiences": [{
            "company": "TechCorp",
            "position": "Backend Engineer",
            "bullet_points": ["Developed microservices using FastAPI and PostgreSQL."]
        }],
        "educations": [{"degree": "B.S. Computer Science", "institution": "State University"}]
    }
    job_data = {"title": "Data Analyst / Python Engineer", "company": "Veloce"}
    job_analysis = {
        "required_skills": ["Python", "SQL"],
        "technical_keywords": ["FastAPI", "Tableau"]
    }

    tailored = asyncio.run(ai_service.tailor_resume(master_profile, job_data, job_analysis))
    assert tailored["target_company"] == "Veloce"
    assert "Python" in str(tailored["skills_section"])
    assert tailored["ats_score"] > 50.0
    assert "ats_breakdown" in tailored

def test_resume_generation_pdf_docx():
    user_prof = {
        "full_name": "Jordan Lee",
        "email": "jordan@example.com",
        "phone": "+1 555-0192",
        "current_city": "Remote"
    }
    resume_data = {
        "summary": "Experienced engineer dedicated to clean backend systems.",
        "skills_section": {"Technical Skills": ["Python", "SQL", "FastAPI"]},
        "experience_section": [{
            "company": "TechCorp",
            "position": "Software Engineer",
            "start_date": "2021",
            "end_date": "Present",
            "bullet_points": ["Shipped core endpoints with 99.9% uptime."]
        }],
        "education_section": [{"degree": "B.S. Computer Science", "institution": "Tech University"}]
    }

    pdf_path = resume_generator.generate_pdf(resume_data, user_prof, "test_resume.pdf")
    docx_path = resume_generator.generate_docx(resume_data, user_prof, "test_resume.docx")

    import os
    assert os.path.exists(pdf_path)
    assert os.path.getsize(pdf_path) > 1000
    assert os.path.exists(docx_path)
    assert os.path.getsize(docx_path) > 1000

def test_autofill_safety_and_mapping():
    profile = {
        "full_name": "Jordan Lee",
        "email": "jordan@example.com",
        "phone": "555-1234",
        "current_city": "Austin",
        "linkedin_url": "https://linkedin.com/in/jordanlee"
    }
    mappings = autofill_service.prepare_field_mappings(profile)
    assert mappings["first_name"] == "Jordan"
    assert mappings["last_name"] == "Lee"
    assert mappings["email"] == "jordan@example.com"
    assert mappings["phone"] == "555-1234"

def test_manual_job_import():
    raw_text = """Senior Data Engineer
    Fintech Corp
    San Francisco, CA
    Looking for a Senior Data Engineer with experience in Python and PostgreSQL.
    """
    imported = ManualImportAdapter.parse_pasted_job(raw_text)
    assert imported["title"] == "Senior Data Engineer"
    assert imported["company"] == "Fintech Corp"
    assert imported["job_source"] == "Manual Import"
