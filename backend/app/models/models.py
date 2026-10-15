import uuid
import datetime
from sqlalchemy import (
    Column, String, Text, Boolean, Integer, Float, DateTime, ForeignKey, JSON
)
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.encrypted_type import EncryptedString, EncryptedText

def generate_uuid() -> str:
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    profile = relationship("Profile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    preferences = relationship("UserPreference", back_populates="user", uselist=False, cascade="all, delete-orphan")
    master_resumes = relationship("MasterResume", back_populates="user", cascade="all, delete-orphan")
    resume_versions = relationship("ResumeVersion", back_populates="user", cascade="all, delete-orphan")
    job_matches = relationship("JobMatch", back_populates="user", cascade="all, delete-orphan")
    saved_jobs = relationship("SavedJob", back_populates="user", cascade="all, delete-orphan")
    cover_letters = relationship("CoverLetter", back_populates="user", cascade="all, delete-orphan")
    applications = relationship("Application", back_populates="user", cascade="all, delete-orphan")
    application_answers = relationship("ApplicationAnswer", back_populates="user", cascade="all, delete-orphan")
    interviews = relationship("Interview", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    ai_generations = relationship("AIGenerationLog", back_populates="user", cascade="all, delete-orphan")
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user")

class Profile(Base):
    __tablename__ = "profiles"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    phone = Column(EncryptedString(255), nullable=True)
    current_city = Column(EncryptedString(255), nullable=True)
    preferred_locations = Column(JSON, default=list)  # list of strings
    linkedin_url = Column(String(255), nullable=True)
    github_url = Column(String(255), nullable=True)
    portfolio_url = Column(String(255), nullable=True)
    
    summary = Column(Text, nullable=True)
    years_of_experience = Column(Float, default=0.0)
    target_job_titles = Column(JSON, default=list)  # list of strings
    preferred_industries = Column(JSON, default=list)  # list of strings
    expected_salary_min = Column(Float, nullable=True)
    expected_salary_max = Column(Float, nullable=True)
    salary_currency = Column(String(10), default="USD")
    
    employment_types = Column(JSON, default=lambda: ["Full-time"])  # Full-time, Contract, etc.
    work_mode_preference = Column(String(50), default="Remote")  # Remote, Hybrid, On-site, Any
    notice_period_days = Column(Integer, default=30)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="profile")
    educations = relationship("Education", back_populates="profile", cascade="all, delete-orphan")
    experiences = relationship("Experience", back_populates="profile", cascade="all, delete-orphan")
    skills = relationship("Skill", back_populates="profile", cascade="all, delete-orphan")
    projects = relationship("Project", back_populates="profile", cascade="all, delete-orphan")
    certifications = relationship("Certification", back_populates="profile", cascade="all, delete-orphan")

class Education(Base):
    __tablename__ = "educations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    profile_id = Column(String(36), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    institution = Column(String(255), nullable=False)
    degree = Column(String(255), nullable=False)
    field_of_study = Column(String(255), nullable=True)
    start_date = Column(String(50), nullable=True)
    end_date = Column(String(50), nullable=True)
    grade_or_gpa = Column(String(50), nullable=True)
    description = Column(Text, nullable=True)
    is_current = Column(Boolean, default=False)

    profile = relationship("Profile", back_populates="educations")

class Experience(Base):
    __tablename__ = "experiences"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    profile_id = Column(String(36), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    company = Column(String(255), nullable=False)
    position = Column(String(255), nullable=False)
    location = Column(String(255), nullable=True)
    start_date = Column(String(50), nullable=True)
    end_date = Column(String(50), nullable=True)
    is_current = Column(Boolean, default=False)
    description = Column(Text, nullable=True)
    bullet_points = Column(JSON, default=list)  # list of strings
    technologies = Column(JSON, default=list)  # list of strings

    profile = relationship("Profile", back_populates="experiences")

class Skill(Base):
    __tablename__ = "skills"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    profile_id = Column(String(36), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    category = Column(String(50), default="Technical")  # Technical, Soft, Tool, Language
    proficiency_level = Column(String(50), default="Intermediate")  # Beginner, Intermediate, Advanced, Expert
    years_of_experience = Column(Float, default=1.0)

    profile = relationship("Profile", back_populates="skills")

class Project(Base):
    __tablename__ = "projects"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    profile_id = Column(String(36), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    role = Column(String(100), nullable=True)
    technologies = Column(JSON, default=list)  # list of strings
    url = Column(String(255), nullable=True)
    github_url = Column(String(255), nullable=True)
    key_achievements = Column(JSON, default=list)

    profile = relationship("Profile", back_populates="projects")

class Certification(Base):
    __tablename__ = "certifications"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    profile_id = Column(String(36), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    issuing_organization = Column(String(255), nullable=False)
    issue_date = Column(String(50), nullable=True)
    expiration_date = Column(String(50), nullable=True)
    credential_id = Column(String(100), nullable=True)
    credential_url = Column(String(255), nullable=True)

    profile = relationship("Profile", back_populates="certifications")

class MasterResume(Base):
    __tablename__ = "master_resumes"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_type = Column(String(20), default="pdf")  # pdf, docx, txt
    raw_text = Column(EncryptedText, nullable=True)
    parsed_data = Column(JSON, default=dict)
    is_default = Column(Boolean, default=True)
    version = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    user = relationship("User", back_populates="master_resumes")
    resume_versions = relationship("ResumeVersion", back_populates="master_resume")

class Job(Base):
    __tablename__ = "jobs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    title = Column(String(255), nullable=False, index=True)
    company = Column(String(255), nullable=False, index=True)
    location = Column(String(255), nullable=True, index=True)
    work_mode = Column(String(50), default="Remote")  # Remote, Hybrid, On-site
    job_type = Column(String(50), default="Full-time")  # Full-time, Contract, Internship, Part-time
    salary_min = Column(Float, nullable=True)
    salary_max = Column(Float, nullable=True)
    salary_currency = Column(String(10), default="USD")
    raw_description = Column(Text, nullable=False)
    original_url = Column(String(500), nullable=True)
    job_source = Column(String(100), default="Manual Import")  # LinkedIn, Indeed, Naukri, Google Jobs, Company Career, Manual Import
    external_id = Column(String(255), nullable=True, index=True)
    source_urls = Column(JSON, default=list)
    is_ghost_job = Column(Boolean, default=False)
    ghost_job_reasons = Column(JSON, default=list)
    repost_count = Column(Integer, default=0)
    first_seen_at = Column(DateTime, default=datetime.datetime.utcnow)
    last_seen_at = Column(DateTime, default=datetime.datetime.utcnow)
    is_active = Column(Boolean, default=True)
    date_posted = Column(DateTime, default=datetime.datetime.utcnow)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    analysis = relationship("JobAnalysis", back_populates="job", uselist=False, cascade="all, delete-orphan")
    matches = relationship("JobMatch", back_populates="job", cascade="all, delete-orphan")
    saved_entries = relationship("SavedJob", back_populates="job", cascade="all, delete-orphan")
    applications = relationship("Application", back_populates="job", cascade="all, delete-orphan")
    cover_letters = relationship("CoverLetter", back_populates="job", cascade="all, delete-orphan")
    resume_versions = relationship("ResumeVersion", back_populates="job")

class JobAnalysis(Base):
    __tablename__ = "job_analysis"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    job_id = Column(String(36), ForeignKey("jobs.id", ondelete="CASCADE"), unique=True, nullable=False)
    extracted_title = Column(String(255), nullable=True)
    extracted_company = Column(String(255), nullable=True)
    extracted_location = Column(String(255), nullable=True)
    required_skills = Column(JSON, default=list)
    preferred_skills = Column(JSON, default=list)
    technical_keywords = Column(JSON, default=list)
    soft_skills = Column(JSON, default=list)
    responsibilities = Column(JSON, default=list)
    education_requirements = Column(JSON, default=list)
    certifications = Column(JSON, default=list)
    experience_years_min = Column(Float, default=0.0)
    work_mode = Column(String(50), nullable=True)
    employment_type = Column(String(50), nullable=True)
    key_takeaways = Column(JSON, default=list)
    raw_analysis_json = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    job = relationship("Job", back_populates="analysis")

class JobMatch(Base):
    __tablename__ = "job_matches"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    job_id = Column(String(36), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    overall_score = Column(Float, default=0.0)
    skills_score = Column(Float, default=0.0)
    experience_score = Column(Float, default=0.0)
    education_score = Column(Float, default=0.0)
    location_score = Column(Float, default=0.0)
    preferences_score = Column(Float, default=0.0)
    matched_skills = Column(JSON, default=list)
    missing_skills = Column(JSON, default=list)
    explanation = Column(Text, nullable=True)
    recommendations = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    user = relationship("User", back_populates="job_matches")
    job = relationship("Job", back_populates="matches")

class SavedJob(Base):
    __tablename__ = "saved_jobs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    job_id = Column(String(36), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="saved_jobs")
    job = relationship("Job", back_populates="saved_entries")

class ResumeVersion(Base):
    __tablename__ = "resume_versions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    job_id = Column(String(36), ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True)
    master_resume_id = Column(String(36), ForeignKey("master_resumes.id", ondelete="SET NULL"), nullable=True)
    
    title = Column(String(255), nullable=False)
    target_job_title = Column(String(255), nullable=True)
    target_company = Column(String(255), nullable=True)
    
    summary = Column(Text, nullable=True)
    skills_section = Column(JSON, default=dict)       # {"technical": [...], "tools": [...], "soft": [...]}
    experience_section = Column(JSON, default=list)   # list of tailored job experiences with targeted bullets
    education_section = Column(JSON, default=list)    # list of educations
    projects_section = Column(JSON, default=list)     # prioritized relevant projects
    certifications_section = Column(JSON, default=list)
    
    match_score = Column(Float, default=0.0)
    ats_score = Column(Float, default=0.0)
    ats_breakdown = Column(JSON, default=dict)
    matched_keywords = Column(JSON, default=list)
    missing_keywords = Column(JSON, default=list)
    
    pdf_path = Column(String(500), nullable=True)
    docx_path = Column(String(500), nullable=True)
    is_tailored = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    user = relationship("User", back_populates="resume_versions")
    job = relationship("Job", back_populates="resume_versions")
    master_resume = relationship("MasterResume", back_populates="resume_versions")
    applications = relationship("Application", back_populates="resume_version")

class CoverLetter(Base):
    __tablename__ = "cover_letters"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    job_id = Column(String(36), ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True)
    resume_version_id = Column(String(36), ForeignKey("resume_versions.id", ondelete="SET NULL"), nullable=True)
    
    title = Column(String(255), nullable=False)
    company = Column(String(255), nullable=False)
    position = Column(String(255), nullable=False)
    letter_text = Column(Text, nullable=False)
    tone = Column(String(50), default="Professional & Impactful")
    key_points_highlighted = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    user = relationship("User", back_populates="cover_letters")
    job = relationship("Job", back_populates="cover_letters")
    applications = relationship("Application", back_populates="cover_letter")

class Application(Base):
    __tablename__ = "applications"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    job_id = Column(String(36), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    resume_version_id = Column(String(36), ForeignKey("resume_versions.id", ondelete="SET NULL"), nullable=True)
    cover_letter_id = Column(String(36), ForeignKey("cover_letters.id", ondelete="SET NULL"), nullable=True)
    
    status = Column(String(50), default="Saved", index=True)
    # Statuses: Saved, Interested, Preparing, Ready to Apply, Applied, Assessment, Interview, Shortlisted, Offer, Rejected, Withdrawn
    
    applied_date = Column(DateTime, nullable=True)
    follow_up_date = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    salary_offered = Column(Float, nullable=True)
    
    autofill_status = Column(String(50), default="not_started")  # not_started, ready, autofilled, needs_manual_review, submitted_verified
    autofill_details = Column(JSON, default=dict)
    submission_verified = Column(Boolean, default=False)
    submission_confirmation_code = Column(String(100), nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    user = relationship("User", back_populates="applications")
    job = relationship("Job", back_populates="applications")
    resume_version = relationship("ResumeVersion", back_populates="applications")
    cover_letter = relationship("CoverLetter", back_populates="applications")
    events = relationship("ApplicationEvent", back_populates="application", cascade="all, delete-orphan", order_by="ApplicationEvent.created_at.desc()")
    interviews = relationship("Interview", back_populates="application", cascade="all, delete-orphan")

class ApplicationAnswer(Base):
    __tablename__ = "application_answers"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    job_id = Column(String(36), ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True)
    application_id = Column(String(36), ForeignKey("applications.id", ondelete="SET NULL"), nullable=True)
    
    question_text = Column(Text, nullable=False)
    suggested_answer = Column(Text, nullable=False)
    user_edited_answer = Column(Text, nullable=True)
    category = Column(String(50), default="General")  # Behavioral, Technical, Experience, Compensation, Eligibility
    confidence_level = Column(Float, default=0.9)
    requires_manual_review = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    user = relationship("User", back_populates="application_answers")

class ApplicationEvent(Base):
    __tablename__ = "application_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    application_id = Column(String(36), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False)
    event_type = Column(String(50), nullable=False)  # status_change, note_added, interview_scheduled, offer_received, rejection_received
    previous_status = Column(String(50), nullable=True)
    new_status = Column(String(50), nullable=True)
    description = Column(Text, nullable=False)
    event_date = Column(DateTime, default=datetime.datetime.utcnow)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    application = relationship("Application", back_populates="events")

class Interview(Base):
    __tablename__ = "interviews"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    application_id = Column(String(36), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False)
    
    round_name = Column(String(100), default="Technical Round 1")
    scheduled_at = Column(DateTime, nullable=False)
    interviewer_names = Column(String(255), nullable=True)
    meeting_url = Column(String(500), nullable=True)
    notes = Column(Text, nullable=True)
    preparation_checklist = Column(JSON, default=list)
    generated_questions = Column(JSON, default=list)
    outcome = Column(String(50), default="Scheduled")  # Scheduled, Completed, Passed, Failed, Cancelled
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    user = relationship("User", back_populates="interviews")
    application = relationship("Application", back_populates="interviews")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String(50), default="job_match")  # job_match, interview_reminder, follow_up, system
    is_read = Column(Boolean, default=False)
    link_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="notifications")

class UserPreference(Base):
    __tablename__ = "user_preferences"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    daily_search_enabled = Column(Boolean, default=True)
    daily_search_time = Column(String(10), default="09:00")
    target_titles = Column(JSON, default=lambda: ["Data Analyst", "Data Scientist", "Software Engineer"])
    target_locations = Column(JSON, default=lambda: ["Remote", "New York", "San Francisco", "London", "Pune", "Mumbai"])
    min_match_score = Column(Float, default=70.0)
    email_notifications_enabled = Column(Boolean, default=True)
    telegram_notifications_enabled = Column(Boolean, default=False)
    telegram_chat_id = Column(String(100), nullable=True)
    dark_mode_enabled = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    user = relationship("User", back_populates="preferences")

class AIGenerationLog(Base):
    __tablename__ = "ai_generation_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    prompt_type = Column(String(50), nullable=False)  # resume_tailor, cover_letter, job_analysis, interview_prep, question_answer, career_chat
    provider_used = Column(String(50), default="built-in")
    model_name = Column(String(100), nullable=True)
    tokens_used = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="ai_generations")

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token = Column(String(255), unique=True, index=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    is_revoked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="refresh_tokens")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action = Column(String(100), nullable=False, index=True)  # auth.login, auth.refresh, pii.access, profile.update, resume.delete
    resource_type = Column(String(100), nullable=True)
    resource_id = Column(String(100), nullable=True)
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(255), nullable=True)
    details = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    user = relationship("User", back_populates="audit_logs")
