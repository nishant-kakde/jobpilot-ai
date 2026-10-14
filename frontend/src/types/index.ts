export interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Education {
  id: string;
  profile_id: string;
  institution: string;
  degree: string;
  field_of_study?: string;
  start_date?: string;
  end_date?: string;
  grade_or_gpa?: string;
  description?: string;
  is_current: boolean;
}

export interface Experience {
  id: string;
  profile_id: string;
  company: string;
  position: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  is_current: boolean;
  description?: string;
  bullet_points: string[];
  technologies: string[];
}

export interface Skill {
  id: string;
  profile_id: string;
  name: string;
  category: string; // Technical, Soft, Tool, Language
  proficiency_level: string; // Beginner, Intermediate, Advanced, Expert
  years_of_experience: number;
}

export interface Project {
  id: string;
  profile_id: string;
  title: string;
  description?: string;
  role?: string;
  technologies: string[];
  url?: string;
  github_url?: string;
  key_achievements: string[];
}

export interface Certification {
  id: string;
  profile_id: string;
  name: string;
  issuing_organization: string;
  issue_date?: string;
  expiration_date?: string;
  credential_id?: string;
  credential_url?: string;
}

export interface Profile {
  id: string;
  user_id: string;
  phone?: string;
  current_city?: string;
  preferred_locations: string[];
  linkedin_url?: string;
  github_url?: string;
  portfolio_url?: string;
  summary?: string;
  years_of_experience: number;
  target_job_titles: string[];
  preferred_industries: string[];
  expected_salary_min?: number;
  expected_salary_max?: number;
  salary_currency: string;
  employment_types: string[];
  work_mode_preference: string;
  notice_period_days: number;
  educations: Education[];
  experiences: Experience[];
  skills: Skill[];
  projects: Project[];
  certifications: Certification[];
  created_at: string;
  updated_at: string;
}

export interface MasterResume {
  id: string;
  user_id: string;
  file_name: string;
  file_type: string;
  is_default: boolean;
  version: number;
  parsed_data: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ResumeVersion {
  id: string;
  user_id: string;
  job_id?: string;
  master_resume_id?: string;
  title: string;
  target_job_title?: string;
  target_company?: string;
  summary?: string;
  skills_section: Record<string, any>;
  experience_section: any[];
  education_section: any[];
  projects_section: any[];
  certifications_section: any[];
  match_score: number;
  ats_score: number;
  ats_breakdown: Record<string, any>;
  matched_keywords: string[];
  missing_keywords: string[];
  pdf_path?: string;
  docx_path?: string;
  is_tailored: boolean;
  created_at: string;
  updated_at: string;
}

export interface JobAnalysis {
  id: string;
  job_id: string;
  extracted_title?: string;
  extracted_company?: string;
  extracted_location?: string;
  required_skills: string[];
  preferred_skills: string[];
  technical_keywords: string[];
  soft_skills: string[];
  responsibilities: string[];
  education_requirements: string[];
  certifications: string[];
  experience_years_min: number;
  work_mode?: string;
  employment_type?: string;
  key_takeaways: string[];
  created_at: string;
}

export interface JobMatch {
  id: string;
  job_id: string;
  overall_score: number;
  skills_score: number;
  experience_score: number;
  education_score: number;
  location_score: number;
  preferences_score: number;
  matched_skills: string[];
  missing_skills: string[];
  explanation?: string;
  recommendations: string[];
  created_at: string;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  location?: string;
  work_mode: string;
  job_type: string;
  salary_min?: number;
  salary_max?: number;
  salary_currency: string;
  raw_description: string;
  original_url?: string;
  job_source: string;
  external_id?: string;
  is_active: boolean;
  date_posted: string;
  created_at: string;
  is_saved?: boolean;
  match?: JobMatch;
  analysis?: JobAnalysis;
}

export interface JobSourceAdapterInfo {
  source_name: string;
  integration_type: string;
  status_label: string;
  is_automated_apply_supported: boolean;
  auth_required: boolean;
}

export interface CoverLetter {
  id: string;
  user_id: string;
  job_id?: string;
  resume_version_id?: string;
  title: string;
  company: string;
  position: string;
  letter_text: string;
  tone: string;
  key_points_highlighted: string[];
  created_at: string;
  updated_at: string;
}

export interface ApplicationAnswer {
  id: string;
  user_id: string;
  job_id?: string;
  application_id?: string;
  question_text: string;
  suggested_answer: string;
  user_edited_answer?: string;
  category: string;
  confidence_level: number;
  requires_manual_review: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApplicationEvent {
  id: string;
  application_id: string;
  event_type: string;
  previous_status?: string;
  new_status?: string;
  description: string;
  event_date: string;
  created_at: string;
}

export interface Application {
  id: string;
  user_id: string;
  job_id: string;
  resume_version_id?: string;
  cover_letter_id?: string;
  status: string; // Saved, Interested, Preparing, Ready to Apply, Applied, Assessment, Interview, Shortlisted, Offer, Rejected, Withdrawn
  applied_date?: string;
  follow_up_date?: string;
  notes?: string;
  salary_offered?: number;
  autofill_status: string;
  autofill_details: Record<string, any>;
  submission_verified: boolean;
  submission_confirmation_code?: string;
  created_at: string;
  updated_at: string;
  job?: Job;
  events?: ApplicationEvent[];
}

export interface Interview {
  id: string;
  user_id: string;
  application_id: string;
  round_name: string;
  scheduled_at: string;
  interviewer_names?: string;
  meeting_url?: string;
  notes?: string;
  preparation_checklist: { item: string; done: boolean }[];
  generated_questions: {
    type: string;
    question: string;
    talking_points: string[];
    sample_answer: string;
  }[];
  outcome: string;
  created_at: string;
  updated_at: string;
  application?: Application;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  link_url?: string;
  created_at: string;
}

export interface UserPreference {
  id: string;
  user_id: string;
  daily_search_enabled: boolean;
  daily_search_time: string;
  target_titles: string[];
  target_locations: string[];
  min_match_score: number;
  email_notifications_enabled: boolean;
  telegram_notifications_enabled: boolean;
  telegram_chat_id?: string;
  dark_mode_enabled: boolean;
}

export interface DashboardStats {
  total_jobs_found: number;
  matching_jobs_count: number;
  saved_jobs_count: number;
  applications_prepared: number;
  confirmed_applications_submitted: number;
  interviews_count: number;
  offers_count: number;
  rejections_count: number;
  applications_by_status: Record<string, number>;
  applications_by_source: Record<string, number>;
  weekly_applications: { week: string; count: number }[];
  match_score_distribution: { bracket: string; count: number }[];
  funnel_stages: { stage: string; count: number }[];
}
