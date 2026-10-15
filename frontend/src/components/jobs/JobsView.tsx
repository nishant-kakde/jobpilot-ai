import React, { useState, useEffect } from 'react';
import {
  Search, Filter, Bookmark, BookmarkCheck, ExternalLink, Sparkles,
  MapPin, DollarSign, Building, Plus, Info, CheckCircle, AlertTriangle,
  FileText, ArrowUpDown, RefreshCw, X, ShieldAlert
} from 'lucide-react';
import { api } from '../../services/api';
import { Job, JobSourceAdapterInfo, JobAnalysis, JobMatch } from '../../types';

interface JobsViewProps {
  onStartTailoring: (jobId: string) => void;
  onStartApplication: (jobId: string) => void;
}

export const JobsView: React.FC<JobsViewProps> = ({ onStartTailoring, onStartApplication }) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [adapters, setAdapters] = useState<JobSourceAdapterInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [keywords, setKeywords] = useState('');
  const [location, setLocation] = useState('');
  const [workMode, setWorkMode] = useState('all');
  const [jobSource, setJobSource] = useState('all');
  const [minMatch, setMinMatch] = useState<number>(0);
  const [sortBy, setSortBy] = useState('newest');

  // Modals
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importForm, setImportForm] = useState({
    title: '',
    company: '',
    location: '',
    url: '',
    raw_description: '',
    work_mode: 'Remote'
  });
  const [importing, setImporting] = useState(false);

  // Active Job Detail / Analysis Modal
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [analyzingJob, setAnalyzingJob] = useState(false);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const data = await api.listJobs({
        keywords,
        location,
        work_mode: workMode === 'all' ? undefined : workMode,
        job_source: jobSource === 'all' ? undefined : jobSource,
        min_match_score: minMatch > 0 ? minMatch : undefined,
        sort_by: sortBy
      });
      setJobs(data);
    } catch (err) {
      console.error('Failed to fetch jobs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    api.getSourceAdapters().then(setAdapters).catch(() => {});
  }, [workMode, jobSource, sortBy, minMatch]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchJobs();
  };

  const handleToggleSave = async (job: Job) => {
    try {
      if (job.is_saved) {
        await api.unsaveJob(job.id);
        setJobs(prev => prev.map(j => j.id === job.id ? { ...j, is_saved: false } : j));
      } else {
        await api.saveJob(job.id);
        setJobs(prev => prev.map(j => j.id === job.id ? { ...j, is_saved: true } : j));
      }
    } catch (err) {
      console.error('Error toggling save', err);
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importForm.raw_description.trim()) return;
    setImporting(true);
    try {
      const created = await api.importJob(importForm);
      setImportModalOpen(false);
      setImportForm({ title: '', company: '', location: '', url: '', raw_description: '', work_mode: 'Remote' });
      fetchJobs();
      setSelectedJob(created);
    } catch (err: any) {
      alert(`Import failed: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  const handleTriggerAnalysis = async (jobId: string) => {
    setAnalyzingJob(true);
    try {
      await api.analyzeJob(jobId);
      await api.matchJob(jobId);
      const updated = await api.getJob(jobId);
      setSelectedJob(updated);
      setJobs(prev => prev.map(j => j.id === jobId ? updated : j));
    } catch (err) {
      console.error('Analysis error', err);
    } finally {
      setAnalyzingJob(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Adapters Status Bar */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Connected Job Sources & Adapters</span>
            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold px-2 py-0.5 rounded-full">
              {adapters.length} Modules
            </span>
          </div>
          <button
            onClick={() => setImportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Import / Paste Job
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {adapters.map((adapter, i) => (
            <div key={i} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800 text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-900 dark:text-white truncate">{adapter.source_name}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{adapter.status_label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <form onSubmit={handleSearchSubmit} className="glass-card p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Job title, keywords, or skills (e.g. Python, Data Analyst)..."
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="md:col-span-4 relative">
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="City, state, or 'Remote'..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="md:col-span-3 flex gap-2">
            <button
              type="submit"
              className="flex-1 py-2 px-4 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Search className="w-3.5 h-3.5" />
              Search
            </button>
            <button
              type="button"
              onClick={() => { setKeywords(''); setLocation(''); setWorkMode('all'); setJobSource('all'); setMinMatch(0); setSortBy('newest'); }}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Reset Filters"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Quick Filter Selects */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 font-medium">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          <select
            value={workMode}
            onChange={(e) => setWorkMode(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs focus:ring-indigo-500"
          >
            <option value="all">Work Mode: All</option>
            <option value="Remote">Remote</option>
            <option value="Hybrid">Hybrid</option>
            <option value="On-site">On-site</option>
          </select>

          <select
            value={jobSource}
            onChange={(e) => setJobSource(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs focus:ring-indigo-500"
          >
            <option value="all">Source: All Portals</option>
            <option value="LinkedIn">LinkedIn</option>
            <option value="Indeed">Indeed</option>
            <option value="Naukri">Naukri</option>
            <option value="Company Career Pages">Company Career Pages</option>
            <option value="Google Jobs">Google Jobs</option>
            <option value="Manual Import">Manual Import</option>
          </select>

          <select
            value={minMatch}
            onChange={(e) => setMinMatch(Number(e.target.value))}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs focus:ring-indigo-500"
          >
            <option value={0}>Min Match: Any</option>
            <option value={70}>Min Match: ≥70%</option>
            <option value={80}>Min Match: ≥80%</option>
            <option value={90}>Min Match: ≥90%</option>
          </select>

          <div className="ml-auto flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-medium focus:ring-indigo-500"
            >
              <option value="newest">Newest First</option>
              <option value="match_score">Highest Match Score</option>
              <option value="salary">Highest Salary</option>
            </select>
          </div>
        </div>
      </form>

      {/* Jobs Listing Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading matched job feeds...</div>
      ) : jobs.length === 0 ? (
        <div className="glass-card p-12 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">No job postings found matching your criteria</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try broadening your keywords or location filter, or import a specific job description URL directly.
          </p>
          <button
            onClick={() => setImportModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Import / Paste Job Description
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {jobs.map((job) => {
            const score = job.match?.overall_score || 0;
            const scoreColor =
              score >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800' :
              score >= 65 ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800' :
              'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';

            return (
              <div
                key={job.id}
                className="glass-card p-5 flex flex-col justify-between hover:border-indigo-300 dark:hover:border-indigo-700 transition-all duration-200 group"
              >
                <div>
                  {/* Top Bar: Source badge, Match score, Save button */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {job.job_source}
                      </span>
                      <span className="text-[10px] font-medium text-slate-400">
                        {new Date(job.date_posted).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {score > 0 && (
                        <div
                          onClick={() => setSelectedJob(job)}
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full border cursor-pointer hover:scale-105 transition ${scoreColor}`}
                          title="Click to view explainable criteria breakdown"
                        >
                          {score}% Match
                        </div>
                      )}
                      <button
                        onClick={() => handleToggleSave(job)}
                        className="p-1 text-slate-400 hover:text-amber-500 transition"
                        title={job.is_saved ? 'Unsave job' : 'Save job'}
                      >
                        {job.is_saved ? <BookmarkCheck className="w-4 h-4 text-amber-500 fill-amber-500" /> : <Bookmark className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Title & Company */}
                  <h3
                    onClick={() => setSelectedJob(job)}
                    className="font-bold text-base text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition cursor-pointer mb-1"
                  >
                    {job.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mb-3">
                    <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                      <Building className="w-3.5 h-3.5 text-slate-400" />
                      {job.company}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {job.location || 'Remote'} ({job.work_mode})
                    </span>
                    {job.salary_min && (
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                        <DollarSign className="w-3.5 h-3.5" />
                        {job.salary_currency === 'INR' ? '₹' : '$'}
                        {job.salary_min.toLocaleString()} - {job.salary_max?.toLocaleString()}
                      </span>
                    )}
                  </div>

                  {/* Snippet */}
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed mb-4">
                    {job.raw_description}
                  </p>

                  {/* Skills tags preview */}
                  {job.analysis?.required_skills && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {job.analysis.required_skills.slice(0, 4).map((sk, idx) => (
                        <span key={idx} className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                          {sk}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSelectedJob(job)}
                    className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1"
                  >
                    <Info className="w-3.5 h-3.5" />
                    Analyze JD
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onStartTailoring(job.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold flex items-center gap-1 transition"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                      Tailor Resume
                    </button>
                    <button
                      onClick={() => onStartApplication(job.id)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold transition shadow-sm"
                    >
                      Apply Workflow
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Manual Job Import Modal */}
      {importModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Import Job Posting</h3>
              </div>
              <button onClick={() => setImportModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleImportSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Job URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://company.com/careers/job-123"
                  value={importForm.url}
                  onChange={(e) => setImportForm({ ...importForm, url: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Job Title (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Lead Data Analyst"
                    value={importForm.title}
                    onChange={(e) => setImportForm({ ...importForm, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Company (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Health"
                    value={importForm.company}
                    onChange={(e) => setImportForm({ ...importForm, company: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Full Job Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={6}
                  placeholder="Paste the full job description text here... JobPilot will extract requirements, technical keywords, and match against your profile."
                  value={importForm.raw_description}
                  onChange={(e) => setImportForm({ ...importForm, raw_description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-[11px]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setImportModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={importing}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {importing ? 'Analyzing Job...' : 'Import & Analyze'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Job Description Analyzer & Match Score Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card bg-white dark:bg-slate-900 w-full max-w-3xl max-h-[90vh] rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-y-auto space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">{selectedJob.job_source}</span>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">{selectedJob.title}</h2>
                <p className="text-xs text-slate-500">{selectedJob.company} • {selectedJob.location || 'Remote'} ({selectedJob.work_mode})</p>
              </div>
              <button onClick={() => setSelectedJob(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Explainable Match Breakdown Section */}
            {selectedJob.match && (
              <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="font-bold text-sm text-slate-900 dark:text-white">Explainable Job Compatibility</span>
                  </div>
                  <span className="text-base font-extrabold text-indigo-700 dark:text-indigo-300">
                    {selectedJob.match.overall_score}% Match
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                  <div className="p-2 rounded bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-950">
                    <span className="text-[10px] text-slate-400 block">Skills</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{selectedJob.match.skills_score}%</span>
                  </div>
                  <div className="p-2 rounded bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-950">
                    <span className="text-[10px] text-slate-400 block">Experience</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{selectedJob.match.experience_score}%</span>
                  </div>
                  <div className="p-2 rounded bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-950">
                    <span className="text-[10px] text-slate-400 block">Education</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{selectedJob.match.education_score}%</span>
                  </div>
                  <div className="p-2 rounded bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-950">
                    <span className="text-[10px] text-slate-400 block">Location</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{selectedJob.match.location_score}%</span>
                  </div>
                  <div className="p-2 rounded bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-950">
                    <span className="text-[10px] text-slate-400 block">Preferences</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{selectedJob.match.preferences_score}%</span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {selectedJob.match.explanation}
                </p>

                {/* Disclaimer */}
                <p className="text-[10px] text-slate-400 italic">
                  Note: Compatibility scores are illustrative estimations based on transparent matching criteria, not official employer ATS metrics.
                </p>
              </div>
            )}

            {/* Matched vs Missing Skills Breakdown */}
            {selectedJob.match && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/30 dark:bg-emerald-950/20">
                  <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-bold text-xs mb-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Matched Qualifications ({selectedJob.match.matched_skills.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {selectedJob.match.matched_skills.map((s, idx) => (
                      <span key={idx} className="text-[11px] px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 font-medium">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/30 dark:bg-amber-950/20">
                  <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-bold text-xs mb-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Skill Gaps / Missing ({selectedJob.match.missing_skills.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {selectedJob.match.missing_skills.map((s, idx) => (
                      <span key={idx} className="text-[11px] px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 font-medium">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* JD Analysis Section */}
            {selectedJob.analysis && (
              <div className="space-y-3">
                <h4 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                  Deep Job Description Extraction
                </h4>
                <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block mb-1">Key Responsibilities:</span>
                    <ul className="list-disc pl-4 space-y-1">
                      {selectedJob.analysis.responsibilities.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>
                  {selectedJob.analysis.key_takeaways.length > 0 && (
                    <div className="pt-2">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 block mb-1">Key Takeaways:</span>
                      <ul className="list-disc pl-4 space-y-1">
                        {selectedJob.analysis.key_takeaways.map((t, i) => <li key={i}>{t}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Raw Description Collapsible */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="font-semibold text-xs text-slate-700 dark:text-slate-300 block mb-1">Original Listing Text</span>
              <div className="max-h-40 overflow-y-auto p-3 rounded-lg bg-slate-50 dark:bg-slate-850 font-mono text-[11px] text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                {selectedJob.raw_description}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => handleTriggerAnalysis(selectedJob.id)}
                disabled={analyzingJob}
                className="text-xs text-slate-600 dark:text-slate-300 hover:text-indigo-600 flex items-center gap-1 font-semibold"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${analyzingJob ? 'animate-spin' : ''}`} />
                {analyzingJob ? 'Re-analyzing...' : 'Refresh AI Analysis'}
              </button>

              <div className="flex items-center gap-2">
                {selectedJob.original_url && (
                  <a
                    href={selectedJob.original_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 flex items-center gap-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open Source Listing
                  </a>
                )}
                <button
                  onClick={() => {
                    const id = selectedJob.id;
                    setSelectedJob(null);
                    onStartTailoring(id);
                  }}
                  className="px-4 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 text-indigo-700 dark:text-indigo-300 text-xs font-bold hover:bg-indigo-100 flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Tailor Resume for Job
                </button>
                <button
                  onClick={() => {
                    const id = selectedJob.id;
                    setSelectedJob(null);
                    onStartApplication(id);
                  }}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-sm"
                >
                  Apply Workflow
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
