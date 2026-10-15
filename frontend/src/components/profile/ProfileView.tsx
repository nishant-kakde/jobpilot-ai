import React, { useState, useEffect } from 'react';
import {
  UserCheck, Building, GraduationCap, Code, Briefcase, Plus, Trash2,
  CheckCircle2, Save, ExternalLink, ShieldCheck, Sparkles, MapPin, DollarSign
} from 'lucide-react';
import { api } from '../../services/api';
import { Profile, Skill, Experience, Education, Project } from '../../types';
import { useAuth } from '../../context/AuthContext';

export const ProfileView: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    phone: '',
    current_city: '',
    preferred_locations: '',
    linkedin_url: '',
    github_url: '',
    portfolio_url: '',
    summary: '',
    years_of_experience: 0,
    target_job_titles: '',
    preferred_industries: '',
    expected_salary_min: '',
    expected_salary_max: '',
    salary_currency: 'USD',
    work_mode_preference: 'Remote',
    notice_period_days: 30
  });

  // Modal Dialogs for child items
  const [newSkill, setNewSkill] = useState({ name: '', category: 'Technical', proficiency_level: 'Intermediate', years_of_experience: 2 });
  const [newExp, setNewExp] = useState({ company: '', position: '', start_date: '', end_date: '', description: '', bullet_points: '' });
  const [newEdu, setNewEdu] = useState({ institution: '', degree: '', field_of_study: '', start_date: '', end_date: '' });

  const loadProfile = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const p = await api.getProfile();
      setProfile(p);
      setFormData({
        phone: p.phone || '',
        current_city: p.current_city || '',
        preferred_locations: p.preferred_locations ? p.preferred_locations.join(', ') : '',
        linkedin_url: p.linkedin_url || '',
        github_url: p.github_url || '',
        portfolio_url: p.portfolio_url || '',
        summary: p.summary || '',
        years_of_experience: p.years_of_experience || 0,
        target_job_titles: p.target_job_titles ? p.target_job_titles.join(', ') : '',
        preferred_industries: p.preferred_industries ? p.preferred_industries.join(', ') : '',
        expected_salary_min: p.expected_salary_min ? String(p.expected_salary_min) : '',
        expected_salary_max: p.expected_salary_max ? String(p.expected_salary_max) : '',
        salary_currency: p.salary_currency || 'USD',
        work_mode_preference: p.work_mode_preference || 'Remote',
        notice_period_days: p.notice_period_days || 30
      });
    } catch (err) {
      console.error('Error loading profile', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [user]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    try {
      const payload: Partial<Profile> = {
        phone: formData.phone,
        current_city: formData.current_city,
        preferred_locations: formData.preferred_locations.split(',').map(s => s.trim()).filter(Boolean),
        linkedin_url: formData.linkedin_url,
        github_url: formData.github_url,
        portfolio_url: formData.portfolio_url,
        summary: formData.summary,
        years_of_experience: Number(formData.years_of_experience),
        target_job_titles: formData.target_job_titles.split(',').map(s => s.trim()).filter(Boolean),
        preferred_industries: formData.preferred_industries.split(',').map(s => s.trim()).filter(Boolean),
        expected_salary_min: formData.expected_salary_min ? Number(formData.expected_salary_min) : undefined,
        expected_salary_max: formData.expected_salary_max ? Number(formData.expected_salary_max) : undefined,
        salary_currency: formData.salary_currency,
        work_mode_preference: formData.work_mode_preference,
        notice_period_days: Number(formData.notice_period_days)
      };

      const updated = await api.updateProfile(payload);
      setProfile(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAddSkill = async () => {
    if (!newSkill.name.trim()) return;
    try {
      await api.addSkill(newSkill);
      setNewSkill({ name: '', category: 'Technical', proficiency_level: 'Intermediate', years_of_experience: 2 });
      loadProfile();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSkill = async (id: string) => {
    try {
      await api.deleteSkill(id);
      setProfile(prev => prev ? { ...prev, skills: prev.skills.filter(s => s.id !== id) } : null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddExperience = async () => {
    if (!newExp.company.trim() || !newExp.position.trim()) return;
    try {
      const bullets = newExp.bullet_points.split('\n').map(s => s.trim()).filter(Boolean);
      await api.addExperience({
        company: newExp.company,
        position: newExp.position,
        start_date: newExp.start_date,
        end_date: newExp.end_date,
        description: newExp.description,
        bullet_points: bullets,
        technologies: []
      });
      setNewExp({ company: '', position: '', start_date: '', end_date: '', description: '', bullet_points: '' });
      loadProfile();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteExperience = async (id: string) => {
    try {
      await api.deleteExperience(id);
      setProfile(prev => prev ? { ...prev, experiences: prev.experiences.filter(e => e.id !== id) } : null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddEducation = async () => {
    if (!newEdu.institution.trim() || !newEdu.degree.trim()) return;
    try {
      await api.addEducation(newEdu);
      setNewEdu({ institution: '', degree: '', field_of_study: '', start_date: '', end_date: '' });
      loadProfile();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteEducation = async (id: string) => {
    try {
      await api.deleteEducation(id);
      setProfile(prev => prev ? { ...prev, educations: prev.educations.filter(e => e.id !== id) } : null);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading master profile...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Integrity Notice Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 text-white flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-300">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm">Verified Candidate Source of Truth</h3>
            <p className="text-xs text-slate-300">
              JobPilot strictly references your verified profile data. We never hallucinate or invent qualifications.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleProfileSubmit} className="space-y-6">
        {/* Section 1: Personal & Contact Details */}
        <div className="glass-card p-5 space-y-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
            Contact & Online Profiles
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Phone Number</label>
              <input
                type="text"
                placeholder="+1 (555) 000-0000"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Current City</label>
              <input
                type="text"
                placeholder="e.g. San Francisco, CA"
                value={formData.current_city}
                onChange={(e) => setFormData({ ...formData, current_city: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Preferred Locations (comma separated)</label>
              <input
                type="text"
                placeholder="Remote, New York, London, Pune"
                value={formData.preferred_locations}
                onChange={(e) => setFormData({ ...formData, preferred_locations: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">LinkedIn URL</label>
              <input
                type="url"
                placeholder="https://linkedin.com/in/username"
                value={formData.linkedin_url}
                onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">GitHub URL</label>
              <input
                type="url"
                placeholder="https://github.com/username"
                value={formData.github_url}
                onChange={(e) => setFormData({ ...formData, github_url: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Portfolio / Personal Site</label>
              <input
                type="url"
                placeholder="https://myportfolio.dev"
                value={formData.portfolio_url}
                onChange={(e) => setFormData({ ...formData, portfolio_url: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Career Preferences & Summary */}
        <div className="glass-card p-5 space-y-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
            Career Positioning & Preferences
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Years of Experience</label>
              <input
                type="number"
                step="0.5"
                value={formData.years_of_experience}
                onChange={(e) => setFormData({ ...formData, years_of_experience: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Work Mode</label>
              <select
                value={formData.work_mode_preference}
                onChange={(e) => setFormData({ ...formData, work_mode_preference: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
                <option value="On-site">On-site</option>
                <option value="Any">Any Mode</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Notice Period (Days)</label>
              <input
                type="number"
                value={formData.notice_period_days}
                onChange={(e) => setFormData({ ...formData, notice_period_days: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Expected Salary (Min)</label>
              <input
                type="number"
                placeholder="120000"
                value={formData.expected_salary_min}
                onChange={(e) => setFormData({ ...formData, expected_salary_min: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Target Job Titles (comma separated)</label>
              <input
                type="text"
                placeholder="Data Analyst, Senior Full-Stack Engineer, Machine Learning Engineer"
                value={formData.target_job_titles}
                onChange={(e) => setFormData({ ...formData, target_job_titles: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Preferred Industries</label>
              <input
                type="text"
                placeholder="Technology, Fintech, Healthtech"
                value={formData.preferred_industries}
                onChange={(e) => setFormData({ ...formData, preferred_industries: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="text-xs">
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Professional Summary</label>
            <textarea
              rows={3}
              value={formData.summary}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            {saveSuccess ? (
              <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                Profile changes saved successfully!
              </span>
            ) : <span />}

            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving Profile...' : 'Save Profile Details'}
            </button>
          </div>
        </div>
      </form>

      {/* Section 3: Verified Skills Matrix */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Technical & Soft Skills Matrix</h3>
            <p className="text-xs text-slate-500">Referenced in ATS keyword scoring</p>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            {profile?.skills.length || 0} Verified Skills
          </span>
        </div>

        {/* Add Skill Row */}
        <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-850 text-xs">
          <input
            type="text"
            placeholder="Skill name (e.g. FastAPI, SQL, Tableau)..."
            value={newSkill.name}
            onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
            className="flex-1 min-w-[150px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
          />
          <select
            value={newSkill.category}
            onChange={(e) => setNewSkill({ ...newSkill, category: e.target.value })}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
          >
            <option value="Technical">Technical</option>
            <option value="Soft">Soft</option>
            <option value="Tool">Tool / Framework</option>
            <option value="Language">Language</option>
          </select>
          <select
            value={newSkill.proficiency_level}
            onChange={(e) => setNewSkill({ ...newSkill, proficiency_level: e.target.value })}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
          >
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
            <option value="Expert">Expert</option>
          </select>
          <button
            type="button"
            onClick={handleAddSkill}
            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700"
          >
            Add Skill
          </button>
        </div>

        {/* Skills Tag Cloud */}
        <div className="flex flex-wrap gap-2 pt-2">
          {profile?.skills.map((s) => (
            <div
              key={s.id}
              className="group flex items-center gap-1.5 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 shadow-sm"
            >
              <span className="font-semibold">{s.name}</span>
              <span className="text-[10px] text-slate-400">({s.proficiency_level})</span>
              <button
                type="button"
                onClick={() => handleDeleteSkill(s.id)}
                className="text-slate-300 hover:text-rose-500 ml-1"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Section 4: Work Experience */}
      <div className="glass-card p-5 space-y-4">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
          Professional Work Experience
        </h3>

        {/* Existing Experiences */}
        <div className="space-y-3">
          {profile?.experiences.map((exp) => (
            <div key={exp.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                <span className="text-sm">{exp.position} • {exp.company}</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-normal">{exp.start_date} - {exp.end_date}</span>
                  <button onClick={() => handleDeleteExperience(exp.id)} className="text-slate-400 hover:text-rose-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {exp.description && <p className="text-slate-600 dark:text-slate-300">{exp.description}</p>}
              <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-400">
                {exp.bullet_points.map((b, bIdx) => <li key={bIdx}>{b}</li>)}
              </ul>
            </div>
          ))}
        </div>

        {/* Add Experience Form */}
        <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 space-y-3 text-xs">
          <span className="font-bold text-slate-700 dark:text-slate-300 block">Add Verified Experience Record</span>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Company name..."
              value={newExp.company}
              onChange={(e) => setNewExp({ ...newExp, company: e.target.value })}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            />
            <input
              type="text"
              placeholder="Job title / role..."
              value={newExp.position}
              onChange={(e) => setNewExp({ ...newExp, position: e.target.value })}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            />
            <input
              type="text"
              placeholder="Start Date (e.g. Jan 2022)"
              value={newExp.start_date}
              onChange={(e) => setNewExp({ ...newExp, start_date: e.target.value })}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            />
            <input
              type="text"
              placeholder="End Date (e.g. Present)"
              value={newExp.end_date}
              onChange={(e) => setNewExp({ ...newExp, end_date: e.target.value })}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            />
          </div>
          <textarea
            rows={3}
            placeholder="Bullet points (one per line)..."
            value={newExp.bullet_points}
            onChange={(e) => setNewExp({ ...newExp, bullet_points: e.target.value })}
            className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
          />
          <button
            type="button"
            onClick={handleAddExperience}
            className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700"
          >
            Add Experience
          </button>
        </div>
      </div>

      {/* Section 5: Education */}
      <div className="glass-card p-5 space-y-4">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
          Education & Degrees
        </h3>

        <div className="space-y-3">
          {profile?.educations.map((edu) => (
            <div key={edu.id} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-sm text-slate-900 dark:text-white">{edu.degree} in {edu.field_of_study}</span>
                <p className="text-slate-500">{edu.institution} ({edu.start_date} - {edu.end_date})</p>
              </div>
              <button onClick={() => handleDeleteEducation(edu.id)} className="text-slate-400 hover:text-rose-500">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Add Education Form */}
        <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 space-y-3 text-xs">
          <span className="font-bold text-slate-700 dark:text-slate-300 block">Add Degree Record</span>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Institution / University..."
              value={newEdu.institution}
              onChange={(e) => setNewEdu({ ...newEdu, institution: e.target.value })}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            />
            <input
              type="text"
              placeholder="Degree (e.g. Bachelor of Science)..."
              value={newEdu.degree}
              onChange={(e) => setNewEdu({ ...newEdu, degree: e.target.value })}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            />
            <input
              type="text"
              placeholder="Field of study (e.g. Computer Science)..."
              value={newEdu.field_of_study}
              onChange={(e) => setNewEdu({ ...newEdu, field_of_study: e.target.value })}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            />
            <input
              type="text"
              placeholder="Dates (e.g. 2018 - 2022)..."
              value={newEdu.start_date}
              onChange={(e) => setNewEdu({ ...newEdu, start_date: e.target.value })}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            />
          </div>
          <button
            type="button"
            onClick={handleAddEducation}
            className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700"
          >
            Add Degree
          </button>
        </div>
      </div>
    </div>
  );
};
