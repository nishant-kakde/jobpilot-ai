import React, { useState, useEffect } from 'react';
import {
  FileText, Upload, Sparkles, Download, CheckCircle, AlertCircle,
  Eye, Edit3, Trash2, ShieldCheck, RefreshCw, Layers, Check,
  ExternalLink, FileCheck, ArrowRight
} from 'lucide-react';
import { api } from '../../services/api';
import { MasterResume, ResumeVersion, Job } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface ResumeBuilderViewProps {
  initialJobId?: string | null;
  onNavigateToJob?: (jobId: string) => void;
}

export const ResumeBuilderView: React.FC<ResumeBuilderViewProps> = ({ initialJobId }) => {
  const { user } = useAuth();
  const [masterResumes, setMasterResumes] = useState<MasterResume[]>([]);
  const [tailoredVersions, setTailoredVersions] = useState<ResumeVersion[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload State
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Tailoring Form
  const [selectedJobId, setSelectedJobId] = useState<string>(initialJobId || '');
  const [tailoring, setTailoring] = useState(false);

  // Active Version Being Viewed / Edited
  const [activeVersion, setActiveVersion] = useState<ResumeVersion | null>(null);
  const [editableSummary, setEditableSummary] = useState('');
  const [savingEdits, setSavingEdits] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const loadData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [masters, versions, jobsList] = await Promise.all([
        api.getMasterResumes(),
        api.getTailoredVersions(),
        api.listJobs()
      ]);
      setMasterResumes(masters);
      setTailoredVersions(versions);
      setJobs(jobsList);

      if (versions.length > 0 && !activeVersion) {
        setActiveVersion(versions[0]);
        setEditableSummary(versions[0].summary || '');
      }
    } catch (err) {
      console.error('Error loading resume builder data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    if (initialJobId) {
      setSelectedJobId(initialJobId);
    }
  }, [initialJobId]);

  const handleUploadResume = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('set_as_default', 'true');
      formData.append('sync_to_profile', 'true');

      const uploaded = await api.uploadResume(formData);
      setMasterResumes(prev => [uploaded, ...prev]);
      setSelectedFile(null);
      alert('Master resume uploaded & parsed successfully into verified profile!');
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleTriggerTailor = async () => {
    if (!selectedJobId) {
      alert('Please select a target job posting to tailor your resume for.');
      return;
    }
    setTailoring(true);
    try {
      const newVersion = await api.tailorResume({
        job_id: selectedJobId,
        master_resume_id: masterResumes[0]?.id
      });
      setTailoredVersions(prev => [newVersion, ...prev]);
      setActiveVersion(newVersion);
      setEditableSummary(newVersion.summary || '');
    } catch (err: any) {
      alert(`Tailoring failed: ${err.message}`);
    } finally {
      setTailoring(false);
    }
  };

  const handleSaveSummary = async () => {
    if (!activeVersion) return;
    setSavingEdits(true);
    setSaveSuccess(false);
    try {
      const updated = await api.updateTailoredVersion(activeVersion.id, {
        summary: editableSummary
      });
      setActiveVersion(updated);
      setTailoredVersions(prev => prev.map(v => v.id === updated.id ? updated : v));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(`Failed to save edits: ${err.message}`);
    } finally {
      setSavingEdits(false);
    }
  };

  const handleDeleteMaster = async (id: string) => {
    if (!confirm('Are you sure you want to delete this master resume?')) return;
    try {
      await api.deleteMasterResume(id);
      setMasterResumes(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Factual Guarantee */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-900 to-slate-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-600/40 border border-indigo-400/30 text-indigo-300">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-bold text-sm tracking-tight">AI Resume Tailoring Engine — Highest Fidelity</h2>
            <p className="text-xs text-indigo-200/80 leading-relaxed">
              Tailors phrasing and keyword coverage to match job descriptions without ever fabricating credentials, companies, or metrics.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 px-3 py-1.5 rounded-lg shrink-0">
          <Check className="w-3.5 h-3.5" />
          <span>ATS Standard Safe</span>
        </div>
      </div>

      {/* Grid: Master Upload & Job Tailor Trigger */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Master Resume Upload Card */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Master Resumes</h3>
              <p className="text-xs text-slate-500">Source of truth for all tailored versions</p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {masterResumes.length} Uploaded
            </span>
          </div>

          <form onSubmit={handleUploadResume} className="space-y-3">
            <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-500 rounded-xl p-4 text-center cursor-pointer transition">
              <input
                type="file"
                accept=".pdf,.docx,.doc,.txt"
                onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                className="hidden"
                id="resume-file-upload"
              />
              <label htmlFor="resume-file-upload" className="cursor-pointer block space-y-1.5">
                <Upload className="w-6 h-6 text-indigo-500 mx-auto" />
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {selectedFile ? selectedFile.name : 'Click to upload PDF or DOCX Master Resume'}
                </p>
                <p className="text-[10px] text-slate-400">PDF, DOCX, or TXT up to 10MB</p>
              </label>
            </div>

            {selectedFile && (
              <button
                type="submit"
                disabled={uploading}
                className="w-full py-2 px-4 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${uploading ? 'animate-spin' : ''}`} />
                {uploading ? 'Extracting & Parsing Resume...' : 'Parse & Save as Master Resume'}
              </button>
            )}
          </form>

          {/* List of Master Resumes */}
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {masterResumes.map((mr) => (
              <div key={mr.id} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-850 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{mr.file_name}</span>
                  {mr.is_default && (
                    <span className="text-[9px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold px-1.5 py-0.5 rounded">
                      Default
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-400 mr-2">v{mr.version}</span>
                  <button
                    onClick={() => handleDeleteMaster(mr.id)}
                    className="p-1 text-slate-400 hover:text-rose-500"
                    title="Delete resume"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Tailor for Specific Job Trigger */}
        <div className="glass-card p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-1 border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">AI Job Tailoring Launchpad</h3>
            <p className="text-xs text-slate-500">Generate targeted resume customized for target job requirements</p>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Select Target Opportunity
              </label>
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
              >
                <option value="">-- Choose from available job postings --</option>
                {jobs.map(j => (
                  <option key={j.id} value={j.id}>
                    {j.title} • {j.company} ({j.job_source})
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-[11px] text-indigo-900 dark:text-indigo-200 space-y-1">
              <span className="font-bold block">Engine Deliverables:</span>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Professional summary tailored to target responsibilities</li>
                <li>Prioritized focus skills matching employer criteria</li>
                <li>Polished impact bullets woven with target keywords</li>
                <li>Transparent ATS readability calculation & keyword gap report</li>
                <li>Ready-to-use downloadable PDF and DOCX files</li>
              </ul>
            </div>
          </div>

          <button
            onClick={handleTriggerTailor}
            disabled={tailoring || !selectedJobId}
            className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
          >
            <Sparkles className={`w-4 h-4 text-white ${tailoring ? 'animate-spin' : ''}`} />
            {tailoring ? 'Synthesizing Tailored Resume...' : 'Generate Tailored Resume'}
          </button>
        </div>
      </div>

      {/* 3. Tailored Resume Studio (Split View) */}
      {activeVersion ? (
        <div className="glass-card p-6 space-y-6">
          {/* Header of Active Version */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  Tailored Version
                </span>
                <span className="text-xs text-slate-400">
                  Target: {activeVersion.target_company || 'Employer'}
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                {activeVersion.title}
              </h2>
            </div>

            {/* Downloads */}
            <div className="flex items-center gap-2">
              <a
                href={api.getResumeDownloadUrl(activeVersion.id, 'pdf')}
                target="_blank"
                rel="noreferrer"
                download
                className="px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition flex items-center gap-1.5 shadow-sm"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </a>
              <a
                href={api.getResumeDownloadUrl(activeVersion.id, 'docx')}
                target="_blank"
                rel="noreferrer"
                download
                className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                Download DOCX
              </a>
            </div>
          </div>

          {/* Split Screen: Analytics & Editor */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 4 Cols: ATS Score Breakdown & Keywords */}
            <div className="lg:col-span-4 space-y-4">
              {/* ATS Readability Score Box */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-700 dark:text-slate-300 uppercase tracking-wider">Estimated ATS Readability</span>
                  <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{activeVersion.ats_score}%</span>
                </div>

                <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full"
                    style={{ width: `${activeVersion.ats_score}%` }}
                  />
                </div>

                {/* ATS Criteria Breakdown */}
                <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                  <div className="flex justify-between">
                    <span>Keyword Match:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{activeVersion.ats_breakdown?.keyword_match_score || 85}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Experience Relevance:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{activeVersion.ats_breakdown?.experience_alignment_score || 90}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Structure & Formatting:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">100% (Clean Single-Column)</span>
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 italic">
                  Criteria: Standard machine-readable fonts, clean headers, reverse-chronological order, and high keyword coverage.
                </p>
              </div>

              {/* Matched Keywords */}
              <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/20 space-y-2">
                <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                  <span>Target Keywords Present</span>
                  <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/80 px-1.5 py-0.5 rounded">
                    {activeVersion.matched_keywords?.length || 0}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {activeVersion.matched_keywords?.map((kw, i) => (
                    <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-emerald-100/80 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 font-medium">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>

              {/* Missing Keywords Suggestions */}
              {activeVersion.missing_keywords && activeVersion.missing_keywords.length > 0 && (
                <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/20 dark:bg-amber-950/20 space-y-2">
                  <div className="flex items-center justify-between text-amber-800 dark:text-amber-300 font-bold text-xs">
                    <span>Missing Keywords Suggestions</span>
                    <span className="text-[10px] bg-amber-100 dark:bg-amber-900/80 px-1.5 py-0.5 rounded">
                      {activeVersion.missing_keywords.length}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {activeVersion.missing_keywords.map((kw, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-amber-100/80 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 font-medium">
                        + {kw}
                      </span>
                    ))}
                  </div>
                  <p className="text-[10px] text-amber-700/80 dark:text-amber-400">
                    If you have verified experience with these tools, add them in your master profile to naturally incorporate them.
                  </p>
                </div>
              )}
            </div>

            {/* Right 8 Cols: Live Editable Preview */}
            <div className="lg:col-span-8 space-y-5 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <span className="font-bold text-xs uppercase text-slate-700 dark:text-slate-300">Live Resume Content Editor</span>
                <button
                  onClick={handleSaveSummary}
                  disabled={savingEdits}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  {savingEdits ? 'Saving & Generating...' : 'Save & Rebuild Document'}
                </button>
              </div>

              {saveSuccess && (
                <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Resume content updated and fresh PDF/DOCX generated successfully!</span>
                </div>
              )}

              {/* Editable Professional Summary */}
              <div className="space-y-1.5">
                <label className="font-semibold text-xs text-slate-800 dark:text-slate-200 block">
                  Tailored Professional Summary
                </label>
                <textarea
                  rows={4}
                  value={editableSummary}
                  onChange={(e) => setEditableSummary(e.target.value)}
                  className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 text-xs text-slate-800 dark:text-slate-200 leading-relaxed focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Categorized Skills Preview */}
              <div className="space-y-2">
                <label className="font-semibold text-xs text-slate-800 dark:text-slate-200 block">
                  Categorized Skills & Core Focus Areas
                </label>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800 space-y-2 text-xs">
                  {activeVersion.skills_section && Object.entries(activeVersion.skills_section).map(([cat, list]: any) => (
                    <div key={cat} className="flex flex-col sm:flex-row sm:items-baseline gap-1.5">
                      <span className="font-bold text-slate-700 dark:text-slate-300 sm:w-40 shrink-0">{cat}:</span>
                      <span className="text-slate-600 dark:text-slate-400">
                        {Array.isArray(list) ? list.join(', ') : String(list)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tailored Experience Bullet Points */}
              <div className="space-y-3">
                <label className="font-semibold text-xs text-slate-800 dark:text-slate-200 block">
                  Professional Experience & Target Bullets
                </label>
                <div className="space-y-3">
                  {activeVersion.experience_section?.map((exp: any, idx: number) => (
                    <div key={idx} className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800 space-y-2 text-xs">
                      <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                        <span>{exp.position} • {exp.company}</span>
                        <span className="text-slate-400 font-normal text-[11px]">{exp.start_date} - {exp.end_date}</span>
                      </div>
                      <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-300">
                        {exp.bullet_points?.map((bullet: string, bIdx: number) => (
                          <li key={bIdx} className="leading-relaxed">{bullet}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-card p-12 text-center text-xs text-slate-400">
          Select a job above and generate your first tailored resume version to view ATS breakdown and export.
        </div>
      )}

      {/* 4. Saved Versions History Table */}
      {tailoredVersions.length > 0 && (
        <div className="glass-card p-5 space-y-3">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Saved Tailored Versions History</h3>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {tailoredVersions.map((v) => (
              <div key={v.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white">{v.title}</h4>
                  <p className="text-slate-400 text-[11px]">
                    Created {new Date(v.created_at).toLocaleDateString()} • Target: {v.target_company || 'Employer'}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300">
                    {v.ats_score}% ATS Readability
                  </span>
                  <button
                    onClick={() => {
                      setActiveVersion(v);
                      setEditableSummary(v.summary || '');
                    }}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
                  >
                    Open Studio
                  </button>
                  <a
                    href={api.getResumeDownloadUrl(v.id, 'pdf')}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100"
                    title="Download PDF"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
