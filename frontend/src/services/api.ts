import {
  AuthResponse, User, Profile, MasterResume, ResumeVersion,
  Job, JobSourceAdapterInfo, CoverLetter, ApplicationAnswer,
  Application, Interview, NotificationItem, UserPreference,
  DashboardStats
} from '../types';

const API_BASE = '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('jobpilot_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorDetail = 'An error occurred';
    try {
      const errJson = await res.json();
      errorDetail = errJson.detail || JSON.stringify(errJson);
    } catch {
      errorDetail = res.statusText;
    }
    throw new Error(errorDetail);
  }
  return res.json();
}

export const api = {
  // Auth
  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await handleResponse<AuthResponse>(res);
    localStorage.setItem('jobpilot_token', data.access_token);
    return data;
  },

  async register(email: string, password: string, full_name: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, full_name })
    });
    const data = await handleResponse<AuthResponse>(res);
    localStorage.setItem('jobpilot_token', data.access_token);
    return data;
  },

  async getMe(): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse<User>(res);
  },

  logout() {
    localStorage.removeItem('jobpilot_token');
  },

  // Profile
  async getProfile(): Promise<Profile> {
    const res = await fetch(`${API_BASE}/profile`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse<Profile>(res);
  },

  async updateProfile(profileData: Partial<Profile>): Promise<Profile> {
    const res = await fetch(`${API_BASE}/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(profileData)
    });
    return handleResponse<Profile>(res);
  },

  async addSkill(skill: { name: string; category: string; proficiency_level: string; years_of_experience: number }) {
    const res = await fetch(`${API_BASE}/profile/skills`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(skill)
    });
    return handleResponse(res);
  },

  async deleteSkill(id: string) {
    const res = await fetch(`${API_BASE}/profile/skills/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async addExperience(exp: any) {
    const res = await fetch(`${API_BASE}/profile/experiences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(exp)
    });
    return handleResponse(res);
  },

  async deleteExperience(id: string) {
    const res = await fetch(`${API_BASE}/profile/experiences/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async addEducation(edu: any) {
    const res = await fetch(`${API_BASE}/profile/educations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(edu)
    });
    return handleResponse(res);
  },

  async deleteEducation(id: string) {
    const res = await fetch(`${API_BASE}/profile/educations/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async addProject(proj: any) {
    const res = await fetch(`${API_BASE}/profile/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(proj)
    });
    return handleResponse(res);
  },

  async deleteProject(id: string) {
    const res = await fetch(`${API_BASE}/profile/projects/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  // Master Resumes
  async uploadResume(formData: FormData): Promise<MasterResume> {
    const res = await fetch(`${API_BASE}/resumes/upload`, {
      method: 'POST',
      headers: { ...getAuthHeader() },
      body: formData
    });
    return handleResponse<MasterResume>(res);
  },

  async getMasterResumes(): Promise<MasterResume[]> {
    const res = await fetch(`${API_BASE}/resumes`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse<MasterResume[]>(res);
  },

  async deleteMasterResume(id: string) {
    const res = await fetch(`${API_BASE}/resumes/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  // Tailoring
  async tailorResume(payload: { job_id: string; master_resume_id?: string; target_emphasis?: string[] }): Promise<ResumeVersion> {
    const res = await fetch(`${API_BASE}/resumes/tailor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload)
    });
    return handleResponse<ResumeVersion>(res);
  },

  async getTailoredVersions(): Promise<ResumeVersion[]> {
    const res = await fetch(`${API_BASE}/resumes/versions`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse<ResumeVersion[]>(res);
  },

  async updateTailoredVersion(id: string, updates: Partial<ResumeVersion>): Promise<ResumeVersion> {
    const res = await fetch(`${API_BASE}/resumes/versions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(updates)
    });
    return handleResponse<ResumeVersion>(res);
  },

  getResumeDownloadUrl(versionId: string, format: 'pdf' | 'docx' = 'pdf'): string {
    return `${API_BASE}/resumes/versions/${versionId}/download?format=${format}`;
  },

  // Jobs
  async listJobs(params?: {
    keywords?: string;
    company?: string;
    location?: string;
    work_mode?: string;
    job_type?: string;
    job_source?: string;
    min_match_score?: number;
    sort_by?: string;
  }): Promise<Job[]> {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          query.append(key, String(val));
        }
      });
    }
    const res = await fetch(`${API_BASE}/jobs?${query.toString()}`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse<Job[]>(res);
  },

  async getJob(id: string): Promise<Job> {
    const res = await fetch(`${API_BASE}/jobs/${id}`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse<Job>(res);
  },

  async importJob(payload: {
    raw_description: string;
    title?: string;
    company?: string;
    location?: string;
    url?: string;
    salary_min?: number;
    salary_max?: number;
    job_source?: string;
  }): Promise<Job> {
    const res = await fetch(`${API_BASE}/jobs/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload)
    });
    return handleResponse<Job>(res);
  },

  async saveJob(id: string, notes?: string) {
    const res = await fetch(`${API_BASE}/jobs/${id}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ notes })
    });
    return handleResponse(res);
  },

  async unsaveJob(id: string) {
    const res = await fetch(`${API_BASE}/jobs/${id}/save`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async analyzeJob(id: string) {
    const res = await fetch(`${API_BASE}/jobs/${id}/analyze`, {
      method: 'POST',
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async matchJob(id: string) {
    const res = await fetch(`${API_BASE}/jobs/${id}/match`, {
      method: 'POST',
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async getSourceAdapters(): Promise<JobSourceAdapterInfo[]> {
    const res = await fetch(`${API_BASE}/jobs/sources/adapters`);
    return handleResponse<JobSourceAdapterInfo[]>(res);
  },

  // Cover Letters
  async generateCoverLetter(payload: { job_id: string; resume_version_id?: string; tone?: string; custom_instructions?: string }): Promise<CoverLetter> {
    const res = await fetch(`${API_BASE}/cover-letters/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload)
    });
    return handleResponse<CoverLetter>(res);
  },

  async listCoverLetters(): Promise<CoverLetter[]> {
    const res = await fetch(`${API_BASE}/cover-letters`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse<CoverLetter[]>(res);
  },

  async updateCoverLetter(id: string, updates: Partial<CoverLetter>): Promise<CoverLetter> {
    const res = await fetch(`${API_BASE}/cover-letters/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(updates)
    });
    return handleResponse<CoverLetter>(res);
  },

  async deleteCoverLetter(id: string) {
    const res = await fetch(`${API_BASE}/cover-letters/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  // Question Assistant
  async generateAnswers(questions: string[], job_id?: string): Promise<ApplicationAnswer[]> {
    const res = await fetch(`${API_BASE}/applications/questions/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ questions, job_id })
    });
    return handleResponse<ApplicationAnswer[]>(res);
  },

  async listAnswers(): Promise<ApplicationAnswer[]> {
    const res = await fetch(`${API_BASE}/applications/questions`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse<ApplicationAnswer[]>(res);
  },

  async updateAnswer(id: string, user_edited_answer: string): Promise<ApplicationAnswer> {
    const res = await fetch(`${API_BASE}/applications/questions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ user_edited_answer })
    });
    return handleResponse<ApplicationAnswer>(res);
  },

  // Autofill
  async prepareAutofill(application_id: string) {
    const res = await fetch(`${API_BASE}/autofill/prepare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ application_id })
    });
    return handleResponse(res);
  },

  async executeAutofill(payload: { application_id: string; action: string; form_data?: any }) {
    const res = await fetch(`${API_BASE}/autofill/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  // Application Tracker
  async listApplications(status_filter?: string, search?: string): Promise<Application[]> {
    const query = new URLSearchParams();
    if (status_filter) query.append('status_filter', status_filter);
    if (search) query.append('search', search);
    const res = await fetch(`${API_BASE}/applications?${query.toString()}`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse<Application[]>(res);
  },

  async createApplication(payload: {
    job_id: string;
    resume_version_id?: string;
    cover_letter_id?: string;
    status: string;
    applied_date?: string;
    follow_up_date?: string;
    notes?: string;
  }): Promise<Application> {
    const res = await fetch(`${API_BASE}/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload)
    });
    return handleResponse<Application>(res);
  },

  async updateApplication(id: string, updates: Partial<Application>): Promise<Application> {
    const res = await fetch(`${API_BASE}/applications/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(updates)
    });
    return handleResponse<Application>(res);
  },

  async deleteApplication(id: string) {
    const res = await fetch(`${API_BASE}/applications/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  getApplicationExportCsvUrl(): string {
    return `${API_BASE}/applications/export/csv`;
  },

  // Interviews
  async listInterviews(): Promise<Interview[]> {
    const res = await fetch(`${API_BASE}/interviews`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse<Interview[]>(res);
  },

  async createInterview(payload: {
    application_id: string;
    round_name: string;
    scheduled_at: string;
    meeting_url?: string;
    notes?: string;
  }): Promise<Interview> {
    const res = await fetch(`${API_BASE}/interviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload)
    });
    return handleResponse<Interview>(res);
  },

  async updateInterview(id: string, updates: Partial<Interview>): Promise<Interview> {
    const res = await fetch(`${API_BASE}/interviews/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(updates)
    });
    return handleResponse<Interview>(res);
  },

  async regenerateInterviewPrep(id: string): Promise<Interview> {
    const res = await fetch(`${API_BASE}/interviews/${id}/generate-prep`, {
      method: 'POST',
      headers: { ...getAuthHeader() }
    });
    return handleResponse<Interview>(res);
  },

  async deleteInterview(id: string) {
    const res = await fetch(`${API_BASE}/interviews/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  // Assistant Chat
  async chatWithAssistant(message: string, job_id?: string, history: any[] = []) {
    const res = await fetch(`${API_BASE}/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ message, job_id, conversation_history: history })
    });
    return handleResponse(res);
  },

  // Dashboard
  async getDashboardStats(): Promise<DashboardStats> {
    const res = await fetch(`${API_BASE}/dashboard/stats`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse<DashboardStats>(res);
  },

  // Notifications
  async listNotifications(): Promise<NotificationItem[]> {
    const res = await fetch(`${API_BASE}/notifications`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse<NotificationItem[]>(res);
  },

  async markNotificationRead(id: string): Promise<NotificationItem> {
    const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
      method: 'PUT',
      headers: { ...getAuthHeader() }
    });
    return handleResponse<NotificationItem>(res);
  },

  async markAllNotificationsRead() {
    const res = await fetch(`${API_BASE}/notifications/read-all`, {
      method: 'POST',
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  // Scheduled search
  async triggerScheduledRun() {
    const res = await fetch(`${API_BASE}/scheduled/trigger`, {
      method: 'POST',
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  // Settings
  async getPreferences(): Promise<UserPreference> {
    const res = await fetch(`${API_BASE}/settings/preferences`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse<UserPreference>(res);
  },

  async updatePreferences(pref: Partial<UserPreference>): Promise<UserPreference> {
    const res = await fetch(`${API_BASE}/settings/preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(pref)
    });
    return handleResponse<UserPreference>(res);
  },

  async exportUserData() {
    const res = await fetch(`${API_BASE}/settings/export-data`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async deleteAccount() {
    const res = await fetch(`${API_BASE}/settings/account`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  }
};
