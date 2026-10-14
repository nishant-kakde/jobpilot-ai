import os
import datetime
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.future import select

from app.core.config import settings
from app.core.database import init_db, AsyncSessionLocal
from app.core.security import get_password_hash
from app.models.models import (
    User, Profile, Skill, Experience, Education, Project,
    Job, JobAnalysis, JobMatch, Application, ApplicationEvent,
    UserPreference, Notification
)
from app.services.ai_service import ai_service
from app.services.job_matcher import job_matcher

# Import routers
from app.api.auth import router as auth_router
from app.api.profile import router as profile_router
from app.api.resumes import router as resumes_router
from app.api.jobs import router as jobs_router
from app.api.cover_letters import router as cover_letters_router
from app.api.application_assistant import router as assistant_qa_router
from app.api.autofill import router as autofill_router
from app.api.applications import router as applications_router
from app.api.interviews import router as interviews_router
from app.api.career_assistant import router as career_assistant_router
from app.api.dashboard import router as dashboard_router
from app.api.notifications import router as notifications_router
from app.api.scheduled_search import router as scheduled_search_router
from app.api.settings import router as settings_router

async def seed_initial_data():
    """
    Seeds demo user, verified profile, realistic job listings, and sample applications.
    """
    async with AsyncSessionLocal() as db:
        user_check = await db.execute(select(User).where(User.email == "demo@jobpilot.ai"))
        if user_check.scalar_one_or_none():
            return  # Already seeded

        # 1. Create Demo User
        demo_user = User(
            email="demo@jobpilot.ai",
            hashed_password=get_password_hash("password123"),
            full_name="Alex Chen",
            is_active=True
        )
        db.add(demo_user)
        await db.flush()

        # 2. Create User Preferences
        user_pref = UserPreference(
            user_id=demo_user.id,
            daily_search_enabled=True,
            daily_search_time="09:00",
            target_titles=["Data Analyst", "Senior Full-Stack Engineer", "Machine Learning Engineer"],
            target_locations=["Remote", "San Francisco, CA", "New York, NY", "Pune"],
            min_match_score=75.0,
            email_notifications_enabled=True
        )
        db.add(user_pref)

        # 3. Create Rich Verified Profile
        profile = Profile(
            user_id=demo_user.id,
            phone="+1 (555) 019-2834",
            current_city="San Francisco, CA",
            preferred_locations=["Remote", "San Francisco, CA", "New York, NY", "Pune"],
            linkedin_url="https://linkedin.com/in/alexchen-demo",
            github_url="https://github.com/alexchen-demo",
            portfolio_url="https://alexchen-portfolio.demo",
            summary=(
                "Senior Data Analyst & Full-Stack Engineer with 4.5+ years of experience building high-throughput "
                "data pipelines, REST APIs, and executive analytical dashboards. Proven success driving +35% operational "
                "efficiency through clean code, predictive insights, and automated workflows."
            ),
            years_of_experience=4.5,
            target_job_titles=["Lead Data Analyst", "Senior Full-Stack Engineer", "Python Backend Developer"],
            preferred_industries=["Technology", "Fintech", "Healthtech"],
            expected_salary_min=135000.0,
            expected_salary_max=175000.0,
            salary_currency="USD",
            employment_types=["Full-time"],
            work_mode_preference="Remote",
            notice_period_days=30
        )
        db.add(profile)
        await db.flush()

        # Add Skills
        sample_skills = [
            ("Python", "Technical", "Expert", 4.5),
            ("SQL", "Technical", "Expert", 4.5),
            ("FastAPI", "Technical", "Advanced", 3.0),
            ("React", "Technical", "Advanced", 3.5),
            ("TypeScript", "Technical", "Advanced", 3.0),
            ("PostgreSQL", "Technical", "Expert", 4.0),
            ("Docker", "Tool", "Intermediate", 3.0),
            ("Tableau", "Tool", "Advanced", 4.0),
            ("Power BI", "Tool", "Advanced", 3.5),
            ("Pandas", "Technical", "Expert", 4.5),
            ("Git", "Tool", "Advanced", 4.5),
            ("Machine Learning", "Technical", "Intermediate", 2.5),
            ("REST APIs", "Technical", "Expert", 4.0),
            ("Cross-Functional Leadership", "Soft", "Advanced", 4.0),
            ("Analytical Problem Solving", "Soft", "Expert", 4.5)
        ]
        for sname, scat, sprof, syears in sample_skills:
            db.add(Skill(profile_id=profile.id, name=sname, category=scat, proficiency_level=sprof, years_of_experience=syears))

        # Add Experiences
        db.add(Experience(
            profile_id=profile.id,
            company="Nexis Data Cloud",
            position="Senior Data & Software Engineer",
            location="San Francisco, CA (Remote)",
            start_date="Jan 2023",
            end_date="Present",
            is_current=True,
            description="Leading development of core telemetry pipelines and customer analytics services.",
            bullet_points=[
                "Architected asynchronous data ingestion pipeline in FastAPI & PostgreSQL handling 15M+ events daily.",
                "Engineered automated Tableau and Power BI analytical models reducing executive reporting turnaround by 60%.",
                "Mentored 4 junior engineers on unit testing standards, code reviews, and CI/CD best practices."
            ],
            technologies=["Python", "FastAPI", "PostgreSQL", "Docker", "SQL", "Tableau"]
        ))
        db.add(Experience(
            profile_id=profile.id,
            company="Apex Analytics Labs",
            position="Data Analyst & Developer",
            location="New York, NY",
            start_date="Jun 2020",
            end_date="Dec 2022",
            is_current=False,
            description="Built financial risk models and automated ETL workflows.",
            bullet_points=[
                "Authored 50+ complex SQL stored procedures and queries optimizing multi-table data warehouse joins by 40%.",
                "Created customer churn prediction models in Python (Pandas/Scikit-Learn) with 86% predictive accuracy.",
                "Built internal admin dashboards with React and TypeScript for portfolio performance tracking."
            ],
            technologies=["Python", "SQL", "Pandas", "React", "TypeScript", "Power BI"]
        ))

        # Add Education
        db.add(Education(
            profile_id=profile.id,
            institution="University of California, Berkeley",
            degree="Bachelor of Science",
            field_of_study="Computer Science & Data Analytics",
            start_date="2016",
            end_date="2020",
            grade_or_gpa="3.8 GPA"
        ))

        # Add Project
        db.add(Project(
            profile_id=profile.id,
            title="OpenMetrics Cloud Tracker",
            description="Open-source microservices monitoring dashboard displaying live latency and throughput percentiles.",
            role="Lead Architect",
            technologies=["FastAPI", "React", "Docker", "PostgreSQL"],
            key_achievements=["1,200+ GitHub Stars", "Sub-50ms query response time across 100K metrics"]
        ))

        # 4. Seed Benchmark Verified Jobs
        seed_jobs_data = [
            {
                "title": "Senior Full-Stack Engineer (Python / React)",
                "company": "Veloce Technologies",
                "location": "Remote / San Francisco, CA",
                "work_mode": "Remote",
                "job_type": "Full-time",
                "salary_min": 145000.0,
                "salary_max": 185000.0,
                "salary_currency": "USD",
                "job_source": "LinkedIn",
                "external_id": "li-veloce-101",
                "original_url": "https://www.linkedin.com/jobs/view/sample-101",
                "raw_description": (
                    "Veloce Technologies is seeking a Senior Full-Stack Engineer to architect our next-generation data platform. "
                    "Responsibilities: Build scalable REST and WebSocket APIs using FastAPI and Python. Craft responsive, reactive interfaces using React, TypeScript, and Tailwind CSS. "
                    "Requirements: 4+ years of professional engineering experience. Strong proficiency in Python, FastAPI, React, TypeScript, PostgreSQL, and Docker. Experience with CI/CD and AWS."
                ),
                "date_posted": datetime.datetime.utcnow() - datetime.timedelta(days=1)
            },
            {
                "title": "Lead Data Analyst & BI Specialist",
                "company": "Apex Financial Group",
                "location": "New York, NY / Hybrid",
                "work_mode": "Hybrid",
                "job_type": "Full-time",
                "salary_min": 130000.0,
                "salary_max": 160000.0,
                "salary_currency": "USD",
                "job_source": "LinkedIn",
                "external_id": "li-apex-102",
                "original_url": "https://www.linkedin.com/jobs/view/sample-102",
                "raw_description": (
                    "Apex Financial Group is looking for a Lead Data Analyst to turn complex financial transactions into actionable business intelligence. "
                    "Responsibilities: Design executive dashboards in Tableau and Power BI. Write high-performance SQL analytical queries across multi-terabyte data warehouses. "
                    "Requirements: 3+ years in data analytics or business intelligence. Advanced SQL, Python (Pandas/NumPy), statistical modeling, and strong stakeholder presentation skills."
                ),
                "date_posted": datetime.datetime.utcnow() - datetime.timedelta(days=2)
            },
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
                "title": "Business Intelligence Analyst",
                "company": "Infosys Cloud Solutions",
                "location": "Pune / Bengaluru / Hybrid",
                "work_mode": "Hybrid",
                "job_type": "Full-time",
                "salary_min": 1500000.0,
                "salary_max": 2300000.0,
                "salary_currency": "INR",
                "job_source": "Naukri",
                "external_id": "nk-inf-301",
                "original_url": "https://www.naukri.com/job-listings-sample-301",
                "raw_description": (
                    "Infosys Cloud Solutions is hiring a Business Intelligence & Data Analyst for enterprise banking transformation. "
                    "Responsibilities: Develop automated ETL pipelines, build executive scorecards, and run statistical analysis on customer churn. "
                    "Requirements: 3-6 years experience in SQL, Python, Power BI, Advanced Excel, and data warehousing principles."
                ),
                "date_posted": datetime.datetime.utcnow() - datetime.timedelta(days=3)
            },
            {
                "title": "Software Engineer II - Platform Core",
                "company": "Stripe / Greenhouse Careers",
                "location": "Remote / San Francisco",
                "work_mode": "Remote",
                "job_type": "Full-time",
                "salary_min": 155000.0,
                "salary_max": 200000.0,
                "salary_currency": "USD",
                "job_source": "Company Career Pages",
                "external_id": "gh-stripe-501",
                "original_url": "https://boards.greenhouse.io/sample/jobs/501",
                "raw_description": (
                    "Join the core platform team to build resilient distributed payment primitives. "
                    "Responsibilities: Deliver zero-downtime database migrations, microservice endpoints, and developer tooling. "
                    "Requirements: 3+ years experience with backend systems (Python, Go, or Java), distributed systems, and SQL."
                ),
                "date_posted": datetime.datetime.utcnow() - datetime.timedelta(days=1)
            }
        ]

        created_jobs = []
        for jdata in seed_jobs_data:
            job = Job(**jdata)
            db.add(job)
            await db.flush()

            # Analyze job
            analysis_data = await ai_service.analyze_job_description(job.raw_description, job.title, job.company)
            analysis = JobAnalysis(
                job_id=job.id,
                extracted_title=analysis_data.get("extracted_title"),
                extracted_company=analysis_data.get("extracted_company"),
                extracted_location=analysis_data.get("extracted_location"),
                required_skills=analysis_data.get("required_skills", []),
                preferred_skills=analysis_data.get("preferred_skills", []),
                technical_keywords=analysis_data.get("technical_keywords", []),
                soft_skills=analysis_data.get("soft_skills", []),
                responsibilities=analysis_data.get("responsibilities", []),
                education_requirements=analysis_data.get("education_requirements", []),
                experience_years_min=analysis_data.get("experience_years_min", 2.0),
                work_mode=analysis_data.get("work_mode"),
                key_takeaways=analysis_data.get("key_takeaways", []),
                raw_analysis_json=analysis_data
            )
            db.add(analysis)

            # Match with demo user
            profile_dict = {
                "years_of_experience": 4.5,
                "work_mode_preference": "Remote",
                "preferred_locations": ["Remote", "San Francisco, CA", "New York, NY", "Pune"],
                "current_city": "San Francisco, CA",
                "skills": [{"name": s[0], "category": s[1]} for s in sample_skills],
                "experiences": [{"company": "Nexis Data Cloud", "position": "Senior Data & Software Engineer"}],
                "educations": [{"degree": "Bachelor of Science"}]
            }
            match_res = job_matcher.calculate_match(
                profile_dict=profile_dict,
                job_dict={"work_mode": job.work_mode, "location": job.location, "salary_min": job.salary_min, "salary_max": job.salary_max},
                analysis_dict=analysis_data
            )
            job_match = JobMatch(
                user_id=demo_user.id,
                job_id=job.id,
                overall_score=match_res["overall_score"],
                skills_score=match_res["skills_score"],
                experience_score=match_res["experience_score"],
                education_score=match_res["education_score"],
                location_score=match_res["location_score"],
                preferences_score=match_res["preferences_score"],
                matched_skills=match_res["matched_skills"],
                missing_skills=match_res["missing_skills"],
                explanation=match_res["explanation"],
                recommendations=match_res["recommendations"]
            )
            db.add(job_match)
            created_jobs.append(job)

        # 5. Seed Applications in different pipeline stages
        if len(created_jobs) >= 3:
            # App 1: Ready to Apply
            app1 = Application(
                user_id=demo_user.id,
                job_id=created_jobs[0].id,
                status="Ready to Apply",
                notes="Resume tailored and cover letter reviewed. Form fields verified.",
                autofill_status="ready_for_review"
            )
            db.add(app1)
            await db.flush()
            db.add(ApplicationEvent(application_id=app1.id, event_type="status_change", new_status="Ready to Apply", description="Application pre-filled and approved for submission."))

            # App 2: Applied (Verified)
            app2 = Application(
                user_id=demo_user.id,
                job_id=created_jobs[1].id,
                status="Applied",
                applied_date=datetime.datetime.utcnow() - datetime.timedelta(days=4),
                follow_up_date=datetime.datetime.utcnow() + datetime.timedelta(days=3),
                submission_verified=True,
                submission_confirmation_code="JP-VERIFIED-APEX-8912",
                notes="Submitted via direct portal. Follow up on Tuesday."
            )
            db.add(app2)
            await db.flush()
            db.add(ApplicationEvent(application_id=app2.id, event_type="status_change", new_status="Applied", description="Confirmed application submitted and recorded."))

            # App 3: Interview Stage
            app3 = Application(
                user_id=demo_user.id,
                job_id=created_jobs[4].id,
                status="Interview",
                applied_date=datetime.datetime.utcnow() - datetime.timedelta(days=10),
                notes="Technical round scheduled with engineering manager."
            )
            db.add(app3)
            await db.flush()
            db.add(ApplicationEvent(application_id=app3.id, event_type="status_change", new_status="Interview", description="Moved to Technical Round 1."))

        # 6. Seed In-App Notifications
        db.add(Notification(
            user_id=demo_user.id,
            title="High Job Match (92%): Senior Full-Stack Engineer",
            message="Veloce Technologies posted a matching role matching Python, FastAPI, and React.",
            notification_type="job_match",
            link_url=f"/jobs/{created_jobs[0].id if created_jobs else ''}"
        ))
        db.add(Notification(
            user_id=demo_user.id,
            title="Welcome to JobPilot AI",
            message="Your master profile has been loaded. Start by exploring matching jobs or tailoring your resume.",
            notification_type="system",
            link_url="/profile"
        ))

        await db.commit()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database and seed demo data
    await init_db()
    await seed_initial_data()
    yield

app = FastAPI(
    title=settings.APP_NAME,
    description="Complete AI-Powered Job Search & Application Platform",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(auth_router, prefix="/api")
app.include_router(profile_router, prefix="/api")
app.include_router(resumes_router, prefix="/api")
app.include_router(jobs_router, prefix="/api")
app.include_router(cover_letters_router, prefix="/api")
app.include_router(assistant_qa_router, prefix="/api")
app.include_router(autofill_router, prefix="/api")
app.include_router(applications_router, prefix="/api")
app.include_router(interviews_router, prefix="/api")
app.include_router(career_assistant_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(notifications_router, prefix="/api")
app.include_router(scheduled_search_router, prefix="/api")
app.include_router(settings_router, prefix="/api")

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "environment": settings.ENVIRONMENT,
        "ai_provider": settings.AI_PROVIDER
    }
