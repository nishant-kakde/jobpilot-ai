from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field

# ----------------- Auth Schemas -----------------
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    full_name: str = Field(min_length=2)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    refresh_token: Optional[str] = None
    user: "UserOut"

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class UserOut(BaseModel):
    id: str
    email: str
    full_name: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# ----------------- Profile Schemas -----------------
class EducationBase(BaseModel):
    institution: str
    degree: str
    field_of_study: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    grade_or_gpa: Optional[str] = None
    description: Optional[str] = None
    is_current: bool = False

class EducationCreate(EducationBase):
    pass

class EducationOut(EducationBase):
    id: str
    profile_id: str

    class Config:
        from_attributes = True

class ExperienceBase(BaseModel):
    company: str
    position: str
    location: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_current: bool = False
    description: Optional[str] = None
    bullet_points: List[str] = []
    technologies: List[str] = []

class ExperienceCreate(ExperienceBase):
    pass

class ExperienceOut(ExperienceBase):
    id: str
    profile_id: str

    class Config:
        from_attributes = True

class SkillBase(BaseModel):
    name: str
    category: str = "Technical"  # Technical, Soft, Tool, Language
    proficiency_level: str = "Intermediate"
    years_of_experience: float = 1.0

class SkillCreate(SkillBase):
    pass

class SkillOut(SkillBase):
    id: str
    profile_id: str

    class Config:
        from_attributes = True

class ProjectBase(BaseModel):
    title: str
    description: Optional[str] = None
    role: Optional[str] = None
    technologies: List[str] = []
    url: Optional[str] = None
    github_url: Optional[str] = None
    key_achievements: List[str] = []

class ProjectCreate(ProjectBase):
    pass

class ProjectOut(ProjectBase):
    id: str
    profile_id: str

    class Config:
        from_attributes = True

class CertificationBase(BaseModel):
    name: str
    issuing_organization: str
    issue_date: Optional[str] = None
    expiration_date: Optional[str] = None
    credential_id: Optional[str] = None
    credential_url: Optional[str] = None

class CertificationCreate(CertificationBase):
    pass

class CertificationOut(CertificationBase):
    id: str
    profile_id: str

    class Config:
        from_attributes = True

class ProfileUpdate(BaseModel):
    phone: Optional[str] = None
    current_city: Optional[str] = None
    preferred_locations: Optional[List[str]] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    summary: Optional[str] = None
    years_of_experience: Optional[float] = None
    target_job_titles: Optional[List[str]] = None
    preferred_industries: Optional[List[str]] = None
    expected_salary_min: Optional[float] = None
    expected_salary_max: Optional[float] = None
    salary_currency: Optional[str] = "USD"
    employment_types: Optional[List[str]] = None
    work_mode_preference: Optional[str] = None
    notice_period_days: Optional[int] = None

class ProfileOut(BaseModel):
    id: str
    user_id: str
    phone: Optional[str] = None
    current_city: Optional[str] = None
    preferred_locations: List[str] = []
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    summary: Optional[str] = None
    years_of_experience: float = 0.0
    target_job_titles: List[str] = []
    preferred_industries: List[str] = []
    expected_salary_min: Optional[float] = None
    expected_salary_max: Optional[float] = None
    salary_currency: str = "USD"
    employment_types: List[str] = ["Full-time"]
    work_mode_preference: str = "Remote"
    notice_period_days: int = 30
    
    educations: List[EducationOut] = []
    experiences: List[ExperienceOut] = []
    skills: List[SkillOut] = []
    projects: List[ProjectOut] = []
    certifications: List[CertificationOut] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# ----------------- Master Resume Schemas -----------------
class MasterResumeOut(BaseModel):
    id: str
    user_id: str
    file_name: str
    file_type: str
    is_default: bool
    version: int
    parsed_data: Dict[str, Any] = {}
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# ----------------- Resume Version & Tailoring Schemas -----------------
class TailorResumeRequest(BaseModel):
    job_id: str
    master_resume_id: Optional[str] = None
    tone: Optional[str] = "Standard Professional"
    target_emphasis: Optional[List[str]] = None

class ResumeVersionUpdate(BaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None
    skills_section: Optional[Dict[str, Any]] = None
    experience_section: Optional[List[Dict[str, Any]]] = None
    education_section: Optional[List[Dict[str, Any]]] = None
    projects_section: Optional[List[Dict[str, Any]]] = None
    certifications_section: Optional[List[Dict[str, Any]]] = None

class ResumeVersionOut(BaseModel):
    id: str
    user_id: str
    job_id: Optional[str] = None
    master_resume_id: Optional[str] = None
    title: str
    target_job_title: Optional[str] = None
    target_company: Optional[str] = None
    summary: Optional[str] = None
    skills_section: Dict[str, Any] = {}
    experience_section: List[Dict[str, Any]] = []
    education_section: List[Dict[str, Any]] = []
    projects_section: List[Dict[str, Any]] = []
    certifications_section: List[Dict[str, Any]] = []
    match_score: float = 0.0
    ats_score: float = 0.0
    ats_breakdown: Dict[str, Any] = {}
    matched_keywords: List[str] = []
    missing_keywords: List[str] = []
    pdf_path: Optional[str] = None
    docx_path: Optional[str] = None
    is_tailored: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# ----------------- Job & Analysis Schemas -----------------
class JobImportRequest(BaseModel):
    url: Optional[str] = None
    title: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    raw_description: str
    work_mode: Optional[str] = "Remote"
    job_type: Optional[str] = "Full-time"
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    job_source: Optional[str] = "Manual Import"

class JobSearchQuery(BaseModel):
    keywords: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    work_mode: Optional[str] = None
    job_type: Optional[str] = None
    job_source: Optional[str] = None
    min_match_score: Optional[float] = None
    sort_by: Optional[str] = "newest"  # newest, match_score, salary
    page: int = 1
    page_size: int = 20

class JobAnalysisOut(BaseModel):
    id: str
    job_id: str
    extracted_title: Optional[str] = None
    extracted_company: Optional[str] = None
    extracted_location: Optional[str] = None
    required_skills: List[str] = []
    preferred_skills: List[str] = []
    technical_keywords: List[str] = []
    soft_skills: List[str] = []
    responsibilities: List[str] = []
    education_requirements: List[str] = []
    certifications: List[str] = []
    experience_years_min: float = 0.0
    work_mode: Optional[str] = None
    employment_type: Optional[str] = None
    key_takeaways: List[str] = []
    created_at: datetime

    class Config:
        from_attributes = True

class JobMatchOut(BaseModel):
    id: str
    job_id: str
    overall_score: float
    skills_score: float
    experience_score: float
    education_score: float
    location_score: float
    preferences_score: float
    matched_skills: List[str] = []
    missing_skills: List[str] = []
    explanation: Optional[str] = None
    recommendations: List[str] = []
    created_at: datetime

    class Config:
        from_attributes = True

class JobOut(BaseModel):
    id: str
    title: str
    company: str
    location: Optional[str] = None
    work_mode: str
    job_type: str
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    salary_currency: str = "USD"
    raw_description: str
    original_url: Optional[str] = None
    job_source: str
    external_id: Optional[str] = None
    is_active: bool
    date_posted: datetime
    created_at: datetime
    is_saved: Optional[bool] = False
    match: Optional[JobMatchOut] = None
    analysis: Optional[JobAnalysisOut] = None

    class Config:
        from_attributes = True

# ----------------- Cover Letter Schemas -----------------
class GenerateCoverLetterRequest(BaseModel):
    job_id: str
    resume_version_id: Optional[str] = None
    tone: Optional[str] = "Professional & Impactful"
    custom_instructions: Optional[str] = None

class CoverLetterUpdate(BaseModel):
    title: Optional[str] = None
    letter_text: Optional[str] = None
    tone: Optional[str] = None

class CoverLetterOut(BaseModel):
    id: str
    user_id: str
    job_id: Optional[str] = None
    resume_version_id: Optional[str] = None
    title: str
    company: str
    position: str
    letter_text: str
    tone: str
    key_points_highlighted: List[str] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# ----------------- Application Question Assistant Schemas -----------------
class GenerateAnswersRequest(BaseModel):
    job_id: Optional[str] = None
    questions: List[str]

class ApplicationAnswerUpdate(BaseModel):
    user_edited_answer: str

class ApplicationAnswerOut(BaseModel):
    id: str
    user_id: str
    job_id: Optional[str] = None
    application_id: Optional[str] = None
    question_text: str
    suggested_answer: str
    user_edited_answer: Optional[str] = None
    category: str
    confidence_level: float
    requires_manual_review: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# ----------------- Application Tracker Schemas -----------------
class ApplicationCreate(BaseModel):
    job_id: str
    resume_version_id: Optional[str] = None
    cover_letter_id: Optional[str] = None
    status: str = "Saved"
    applied_date: Optional[datetime] = None
    follow_up_date: Optional[datetime] = None
    notes: Optional[str] = None

class ApplicationUpdate(BaseModel):
    status: Optional[str] = None
    applied_date: Optional[datetime] = None
    follow_up_date: Optional[datetime] = None
    notes: Optional[str] = None
    salary_offered: Optional[float] = None
    resume_version_id: Optional[str] = None
    cover_letter_id: Optional[str] = None
    submission_verified: Optional[bool] = None
    submission_confirmation_code: Optional[str] = None

class ApplicationEventOut(BaseModel):
    id: str
    application_id: str
    event_type: str
    previous_status: Optional[str] = None
    new_status: Optional[str] = None
    description: str
    event_date: datetime
    created_at: datetime

    class Config:
        from_attributes = True

class ApplicationOut(BaseModel):
    id: str
    user_id: str
    job_id: str
    resume_version_id: Optional[str] = None
    cover_letter_id: Optional[str] = None
    status: str
    applied_date: Optional[datetime] = None
    follow_up_date: Optional[datetime] = None
    notes: Optional[str] = None
    salary_offered: Optional[float] = None
    autofill_status: str
    autofill_details: Dict[str, Any] = {}
    submission_verified: bool
    submission_confirmation_code: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    job: Optional[JobOut] = None
    events: List[ApplicationEventOut] = []

    class Config:
        from_attributes = True

# ----------------- Browser Autofill Schemas -----------------
class PrepareAutofillRequest(BaseModel):
    application_id: str

class AutofillActionRequest(BaseModel):
    application_id: str
    action: str  # start_browser, fill_form, submit_approved
    form_data: Optional[Dict[str, Any]] = None

class AutofillStatusResponse(BaseModel):
    application_id: str
    status: str
    current_step: str
    filled_fields: List[str] = []
    unsupported_fields: List[str] = []
    requires_user_approval: bool
    screenshot_url: Optional[str] = None
    notes: Optional[str] = None

# ----------------- Interview Schemas -----------------
class InterviewCreate(BaseModel):
    application_id: str
    round_name: str = "Technical Round 1"
    scheduled_at: datetime
    interviewer_names: Optional[str] = None
    meeting_url: Optional[str] = None
    notes: Optional[str] = None

class InterviewUpdate(BaseModel):
    round_name: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    interviewer_names: Optional[str] = None
    meeting_url: Optional[str] = None
    notes: Optional[str] = None
    preparation_checklist: Optional[List[Dict[str, Any]]] = None
    generated_questions: Optional[List[Dict[str, Any]]] = None
    outcome: Optional[str] = None

class InterviewOut(BaseModel):
    id: str
    user_id: str
    application_id: str
    round_name: str
    scheduled_at: datetime
    interviewer_names: Optional[str] = None
    meeting_url: Optional[str] = None
    notes: Optional[str] = None
    preparation_checklist: List[Dict[str, Any]] = []
    generated_questions: List[Dict[str, Any]] = []
    outcome: str
    created_at: datetime
    updated_at: datetime
    application: Optional[ApplicationOut] = None

    class Config:
        from_attributes = True

# ----------------- Notification Schemas -----------------
class NotificationOut(BaseModel):
    id: str
    user_id: str
    title: str
    message: str
    notification_type: str
    is_read: bool
    link_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# ----------------- User Preference Schemas -----------------
class UserPreferenceUpdate(BaseModel):
    daily_search_enabled: Optional[bool] = None
    daily_search_time: Optional[str] = None
    target_titles: Optional[List[str]] = None
    target_locations: Optional[List[str]] = None
    min_match_score: Optional[float] = None
    email_notifications_enabled: Optional[bool] = None
    telegram_notifications_enabled: Optional[bool] = None
    telegram_chat_id: Optional[str] = None
    dark_mode_enabled: Optional[bool] = None

class UserPreferenceOut(BaseModel):
    id: str
    user_id: str
    daily_search_enabled: bool
    daily_search_time: str
    target_titles: List[str]
    target_locations: List[str]
    min_match_score: float
    email_notifications_enabled: bool
    telegram_notifications_enabled: bool
    telegram_chat_id: Optional[str] = None
    dark_mode_enabled: bool

    class Config:
        from_attributes = True

# ----------------- Career Assistant & Dashboard Schemas -----------------
class CareerChatRequest(BaseModel):
    message: str
    job_id: Optional[str] = None
    conversation_history: List[Dict[str, str]] = []

class CareerChatResponse(BaseModel):
    reply: str
    action_suggestions: List[str] = []
    action_type: Optional[str] = None
    data: Optional[Dict[str, Any]] = None

class DashboardStats(BaseModel):
    total_jobs_found: int
    matching_jobs_count: int
    saved_jobs_count: int
    applications_prepared: int
    confirmed_applications_submitted: int
    interviews_count: int
    offers_count: int
    rejections_count: int
    
    applications_by_status: Dict[str, int]
    applications_by_source: Dict[str, int]
    weekly_applications: List[Dict[str, Any]]
    match_score_distribution: List[Dict[str, Any]]
    funnel_stages: List[Dict[str, Any]]
