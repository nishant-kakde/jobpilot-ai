import React, { useState, useEffect } from 'react';
import {
  Search, Filter, Bookmark, BookmarkCheck, ExternalLink, Sparkles,
  MapPin, DollarSign, Building, Plus, Info, CheckCircle, AlertTriangle,
  FileText, ArrowUpDown, RefreshCw, X, ShieldAlert, Compass, Lightbulb,
  ArrowRight, Briefcase, Check, Clock, ChevronDown, SlidersHorizontal
} from 'lucide-react';
import { api } from '../../services/api';
import { Job, JobSourceAdapterInfo, JobAnalysis, JobMatch } from '../../types';

interface JobsViewProps {
  initialMode?: 'all' | 'semantic' | 'recommendations';
  onStartTailoring: (jobId: string) => void;
  onStartApplication: (jobId: string) => void;
}

export const JobsView: React.FC<JobsViewProps> = ({
  initialMode = 'all',
  onStartTailoring,
  onStartApplication
}) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [adapters, setAdapters] = useState<JobSourceAdapterInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // Search Mode & Semantic Search
  const [searchMode, setSearchMode] = useState<'all' | 'semantic' | 'recommendations'>(initialMode);
  const [semanticQuery, setSemanticQuery] = useState('');
  const [semanticSearching, setSemanticSearching] = useState(false);

  // Filters State
  const [keywords, setKeywords] = useState('');
  const [location, setLocation] = useState('');
  const [workMode, setWorkMode] = useState('all');
  const [jobSource, setJobSource] = useState('all');
  const [employmentType, setEmploymentType] = useState('all');
  const [minSalary, setMinSalary] = useState('all');
  const [minMatch, setMinMatch] = useState<number>(0);
  const [sortBy, setSortBy] = useState('newest');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [activeSkillFilter, setActiveSkillFilter] = useState<string>('');

  // Modals State
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
        keywords: activeSkillFilter ? `${keywords} ${activeSkillFilter}`.trim() : keywords,
        location,
        work_mode: workMode === 'all' ? undefined : workMode,
        job_type: employmentType === 'all' ? undefined : employmentType,
        job_source: jobSource === 'all' ? undefined : jobSource,
        min_match_score: minMatch > 0 ? minMatch : undefined,
        sort_by: sortBy
      });

      // Filter by minSalary if selected on frontend
      let filtered = data;
      if (minSalary !== 'all') {
        const threshold = Number(minSalary);
        filtered = filtered.filter(j => (j.salary_min || 0) >= threshold || (j.salary_max || 0) >= threshold);
      }

      setJobs(filtered);
    } catch (err) {
      console.error('Failed to fetch jobs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchMode === 'recommendations') {
      handleLoadRecommendations();
    } else if (searchMode === 'all') {
      fetchJobs();
    }
    api.getSourceAdapters().then(setAdapters).catch(() => {});
  }, [searchMode, workMode, jobSource, employmentType, minSalary, sortBy, minMatch, activeSkillFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchMode === 'semantic') {
      handleSemanticSearch();
    } else {
      fetchJobs();
    }
  };

  const handleSemanticSearch = async (queryText?: string) => {
    const q = (queryText !== undefined ? queryText : semanticQuery).trim();
    if (!q) return;
    setLoading(true);
    setSemanticSearching(true);
    try {
      const data = await api.semanticJobSearch(q, { limit: 25 });
      setJobs(data);
    } catch (err) {
      console.error('Semantic search error', err);
    } finally {
      setLoading(false);
      setSemanticSearching(false);
    }
  };

  const handleLoadRecommendations = async () => {
    setLoading(true);
    try {
      const data = await api.getPersonalizedRecommendations(25);
      setJobs(data);
    } catch (err) {
      console.error('Recommendations error', err);
    } finally {
      setLoading(false);
    }
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

  const quickSkillChips = ['Python', 'SQL', 'React', 'TypeScript', 'AWS', 'FastAPI', 'Machine Learning', 'Power BI'];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Header & Source Adapters Row */}
      <div className="glass-card p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-[#1E293B] pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-[#F9FAFB] tracking-tight">
              Connected Career Portals & Sources
            </h2>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
              Verified public aggregators, direct applicant tracking systems, and universal import
            </p>
          </div>
          <button
            onClick={() => setImportModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl btn-primary text-xs font-semibold self-start sm:self-auto shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Import / Paste Job</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {adapters.map((adapter, i) => (
            <div
              key={i}
              className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#111827] border border-slate-200/60 dark:border-[#1E293B] text-xs"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-800 dark:text-slate-200 truncate text-[11px]">{adapter.source_name}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs" />
              </div>
              <p className="text-[10px] text-slate-400 truncate">{adapter.status_label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Search Mode Switcher Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setSearchMode('all');
            fetchJobs();
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition border ${
            searchMode === 'all'
              ? 'bg-[#635BFF] text-white border-[#635BFF] shadow-sm shadow-[#635BFF]/25'
              : 'border-slate-200 dark:border-[#1E293B] bg-white dark:bg-[#151E30] text-slate-600 dark:text-slate-300 hover:border-slate-300'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Keyword & Filter Feeds</span>
        </button>

        <button
          type="button"
          onClick={() => setSearchMode('semantic')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition border ${
            searchMode === 'semantic'
              ? 'bg-[#635BFF] text-white border-[#635BFF] shadow-sm shadow-[#635BFF]/25'
              : 'border-slate-200 dark:border-[#1E293B] bg-white dark:bg-[#151E30] text-slate-600 dark:text-slate-300 hover:border-slate-300'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Natural Language AI Search</span>
          <span className="text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-white/20">RAG</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSearchMode('recommendations');
            handleLoadRecommendations();
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition border ${
            searchMode === 'recommendations'
              ? 'bg-[#635BFF] text-white border-[#635BFF] shadow-sm shadow-[#635BFF]/25'
              : 'border-slate-200 dark:border-[#1E293B] bg-white dark:bg-[#151E30] text-slate-600 dark:text-slate-300 hover:border-slate-300'
          }`}
        >
          <Compass className="w-3.5 h-3.5 text-[#8B7CFF]" />
          <span>AI Profile Matches</span>
          <span className="text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-white/20">5-Factor</span>
        </button>
      </div>

      {/* 3. Natural Language AI Search Panel */}
      {searchMode === 'semantic' && (
        <form onSubmit={handleSearchSubmit} className="glass-card p-6 space-y-4 border border-[#635BFF]/30">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
            <Sparkles className="w-4 h-4 text-[#635BFF]" />
            <span>Semantic Vector Embedding Search</span>
            <span className="text-[11px] text-slate-400 font-normal hidden sm:inline">
              — Uses 128-dimensional cosine vector embeddings to match semantic intent beyond exact keywords.
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="Describe your target role naturally: e.g. 'Remote Python developer with FastAPI and PostgreSQL', or 'Data Analyst with SQL and Power BI'..."
                value={semanticQuery}
                onChange={(e) => setSemanticQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-[#1E293B] bg-white dark:bg-[#111827] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#635BFF]"
              />
            </div>
            <button
              type="submit"
              disabled={semanticSearching || !semanticQuery.trim()}
              className="px-6 py-3 rounded-xl btn-primary text-xs font-semibold flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 shrink-0"
            >
              <Sparkles className="w-4 h-4" />
              <span>{semanticSearching ? 'Searching Vector Space...' : 'Run AI Search'}</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              Example prompts:
            </span>
            {[
              'Remote Python developer with FastAPI and PostgreSQL',
              'Data Analyst jobs requiring SQL and Power BI',
              'Entry level Machine Learning Engineer',
              'Senior React & TypeScript frontend engineer'
            ].map((prompt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setSemanticQuery(prompt);
                  handleSemanticSearch(prompt);
                }}
                className="text-[11px] px-3 py-1 rounded-full bg-slate-100 dark:bg-[#1E293B] text-slate-600 dark:text-slate-300 hover:bg-[#635BFF]/10 hover:text-[#635BFF] dark:hover:text-[#8B7CFF] transition font-medium"
              >
                {prompt}
              </button>
            ))}
          </div>
        </form>
      )}

      {/* 4. AI Recommendations Banner */}
      {searchMode === 'recommendations' && (
        <div className="glass-card p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-[#635BFF]/30 bg-gradient-to-r from-[#635BFF]/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#635BFF]/10 flex items-center justify-center text-[#635BFF] dark:text-[#8B7CFF] shrink-0">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Personalized AI Career Matches</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ranked against your verified profile across 5 dimensions: Skills (35%), Experience (25%), Education (15%), Location (15%), Preferences (10%).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLoadRecommendations}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl btn-primary text-xs font-semibold shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Recalculate Matches</span>
          </button>
        </div>
      )}

      {/* 5. Standard Search & Comprehensive Filters Bar */}
      {searchMode === 'all' && (
        <form onSubmit={handleSearchSubmit} className="glass-card p-5 space-y-3.5">
          {/* Main Search Row */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-5 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Job title, keywords, or company (e.g. Python, Lead Data Analyst)..."
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#1E293B] bg-white dark:bg-[#111827] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#635BFF]"
              />
            </div>

            <div className="md:col-span-4 relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Location (city, country, or 'Remote')..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#1E293B] bg-white dark:bg-[#111827] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#635BFF]"
              />
            </div>

            <div className="md:col-span-3 flex gap-2">
              <button
                type="submit"
                className="flex-1 py-2 px-4 rounded-xl btn-primary text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search</span>
              </button>
              <button
                type="button"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1 transition ${
                  showAdvancedFilters
                    ? 'border-[#635BFF] bg-[#635BFF]/10 text-[#635BFF]'
                    : 'border-slate-200 dark:border-[#1E293B] text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                }`}
                title="Toggle Filters"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setKeywords('');
                  setLocation('');
                  setWorkMode('all');
                  setJobSource('all');
                  setEmploymentType('all');
                  setMinSalary('all');
                  setMinMatch(0);
                  setSortBy('newest');
                  setActiveSkillFilter('');
                }}
                className="p-2 rounded-xl border border-slate-200 dark:border-[#1E293B] text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition"
                title="Reset Filters"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Skill Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] font-semibold text-slate-400">Skills:</span>
            {quickSkillChips.map((skill) => {
              const active = activeSkillFilter === skill;
              return (
                <button
                  key={skill}
                  type="button"
                  onClick={() => setActiveSkillFilter(active ? '' : skill)}
                  className={`text-[10px] px-2.5 py-0.5 rounded-full font-medium transition border ${
                    active
                      ? 'border-[#635BFF] bg-[#635BFF] text-white shadow-xs'
                      : 'border-slate-200 dark:border-[#1E293B] bg-slate-50 dark:bg-[#111827] text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  {skill}
                </button>
              );
            })}
          </div>

          {/* Advanced Filters Expandable Grid */}
          {showAdvancedFilters && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-3 border-t border-slate-100 dark:border-[#1E293B] text-xs">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 block mb-1">Work Mode</label>
                <select
                  value={workMode}
                  onChange={(e) => setWorkMode(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-[#1E293B] bg-white dark:bg-[#111827] text-slate-700 dark:text-slate-300 text-xs"
                >
                  <option value="all">All Modes</option>
                  <option value="Remote">Remote</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="On-site">On-site</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-400 block mb-1">Employment Type</label>
                <select
                  value={employmentType}
                  onChange={(e) => setEmploymentType(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-[#1E293B] bg-white dark:bg-[#111827] text-slate-700 dark:text-slate-300 text-xs"
                >
                  <option value="all">All Types</option>
                  <option value="Full-time">Full-time</option>
                  <option value="Contract">Contract</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Internship">Internship</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-400 block mb-1">Min Salary</label>
                <select
                  value={minSalary}
                  onChange={(e) => setMinSalary(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-[#1E293B] bg-white dark:bg-[#111827] text-slate-700 dark:text-slate-300 text-xs"
                >
                  <option value="all">Any Salary</option>
                  <option value="50000">$50,000+</option>
                  <option value="100000">$100,000+</option>
                  <option value="150000">$150,000+</option>
                  <option value="200000">$200,000+</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-400 block mb-1">Portal Source</label>
                <select
                  value={jobSource}
                  onChange={(e) => setJobSource(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-[#1E293B] bg-white dark:bg-[#111827] text-slate-700 dark:text-slate-300 text-xs"
                >
                  <option value="all">All Portals</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Indeed">Indeed</option>
                  <option value="Naukri">Naukri</option>
                  <option value="Company Career Pages">Company Pages</option>
                  <option value="Google Jobs">Google Jobs</option>
                  <option value="Manual Import">Manual Import</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-400 block mb-1">Sort Order</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-[#1E293B] bg-white dark:bg-[#111827] text-slate-700 dark:text-slate-300 text-xs font-medium"
                >
                  <option value="newest">Newest First</option>
                  <option value="match_score">Highest Match Score</option>
                  <option value="salary">Highest Salary</option>
                </select>
              </div>
            </div>
          )}
        </form>
      )}

      {/* 6. Jobs Listing Grid */}
      {loading ? (
        <div className="p-16 text-center text-xs text-slate-400 flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#635BFF] border-t-transparent rounded-full animate-spin" />
          <span>Searching and ranking matched jobs...</span>
        </div>
      ) : jobs.length === 0 ? (
        <div className="glass-card p-12 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 dark:bg-[#111827] flex items-center justify-center text-slate-400">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">No job postings found matching your criteria</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search query, clearing filters, or import a specific job description URL directly.
          </p>
          <button
            onClick={() => setImportModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl btn-primary text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Import / Paste Job Description</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {jobs.map((job) => {
            const score = job.match?.overall_score || 0;
            const companyInitial = job.company ? job.company.charAt(0).toUpperCase() : 'C';

            return (
              <div
                key={job.id}
                className="glass-card p-5 flex flex-col justify-between hover:border-[#635BFF]/40 transition duration-150 group"
              >
                <div>
                  {/* Top Bar: Company Monogram + Title + Match Score + Save */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-100 to-slate-200 dark:from-[#1E293B] dark:to-[#1B263D] border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-sm text-slate-800 dark:text-slate-200 shrink-0 shadow-xs">
                        {companyInitial}
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#1E293B] text-slate-600 dark:text-slate-300">
                            {job.job_source}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(job.date_posted).toLocaleDateString()}
                          </span>
                        </div>
                        <h3
                          onClick={() => setSelectedJob(job)}
                          className="font-bold text-sm sm:text-base text-slate-900 dark:text-[#F9FAFB] group-hover:text-[#635BFF] dark:group-hover:text-[#8B7CFF] transition cursor-pointer truncate"
                        >
                          {job.title}
                        </h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {score > 0 && (
                        <div
                          onClick={() => setSelectedJob(job)}
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full cursor-pointer transition ${
                            score >= 80
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : score >= 65
                              ? 'bg-[#635BFF]/10 text-[#635BFF] dark:text-[#8B7CFF] border border-[#635BFF]/20'
                              : 'bg-slate-100 dark:bg-[#1E293B] text-slate-700 dark:text-slate-300'
                          }`}
                          title="Click to view explainable 5-factor compatibility breakdown"
                        >
                          {score}% Match
                        </div>
                      )}
                      <button
                        onClick={() => handleToggleSave(job)}
                        className="p-1 text-slate-400 hover:text-amber-500 transition"
                        title={job.is_saved ? 'Unsave job' : 'Save job'}
                      >
                        {job.is_saved ? (
                          <BookmarkCheck className="w-4 h-4 text-amber-500 fill-amber-500" />
                        ) : (
                          <Bookmark className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Company & Details Row */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-[#94A3B8] mb-3">
                    <span className="flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
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

                  {/* Description Snippet */}
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed mb-3">
                    {job.raw_description}
                  </p>

                  {/* Skills tags preview */}
                  {job.analysis?.required_skills && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {job.analysis.required_skills.slice(0, 4).map((sk, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-[#1E293B] text-slate-600 dark:text-slate-300 font-medium"
                        >
                          {sk}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card Action Buttons */}
                <div className="pt-3 border-t border-slate-100 dark:border-[#1E293B] flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSelectedJob(job)}
                    className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-[#635BFF] transition"
                  >
                    View Details & Score
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onStartTailoring(job.id)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#1E293B] bg-white dark:bg-[#111827] text-slate-700 dark:text-slate-300 text-xs font-semibold hover:border-slate-300 transition flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3 text-[#635BFF]" />
                      <span>Tailor</span>
                    </button>

                    <button
                      onClick={() => onStartApplication(job.id)}
                      className="px-3 py-1.5 rounded-lg btn-primary text-xs font-semibold flex items-center gap-1"
                    >
                      <span>Apply</span>
                      <ArrowRight className="w-3 h-3" />
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="glass-card bg-white dark:bg-[#151E30] w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-[#1E293B] space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1E293B] pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#635BFF]" />
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
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#1E293B] bg-white dark:bg-[#111827] text-slate-900 dark:text-white"
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
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#1E293B] bg-white dark:bg-[#111827] text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Company (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Stripe, Linear"
                    value={importForm.company}
                    onChange={(e) => setImportForm({ ...importForm, company: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#1E293B] bg-white dark:bg-[#111827] text-slate-900 dark:text-white"
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
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#1E293B] bg-white dark:bg-[#111827] text-slate-900 dark:text-white font-mono text-[11px]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-[#1E293B]">
                <button
                  type="button"
                  onClick={() => setImportModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-[#1E293B] text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={importing}
                  className="px-4 py-2 rounded-xl btn-primary text-xs font-semibold disabled:opacity-50"
                >
                  {importing ? 'Analyzing Job...' : 'Import & Analyze'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Job Description Analyzer & 5-Factor Match Score Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="glass-card bg-white dark:bg-[#151E30] w-full max-w-3xl max-h-[90vh] rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-[#1E293B] overflow-y-auto space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-[#1E293B] pb-4">
              <div>
                <span className="text-xs font-bold text-[#635BFF] dark:text-[#8B7CFF] uppercase tracking-wider">{selectedJob.job_source}</span>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">{selectedJob.title}</h2>
                <p className="text-xs text-slate-500">{selectedJob.company} • {selectedJob.location || 'Remote'} ({selectedJob.work_mode})</p>
              </div>
              <button onClick={() => setSelectedJob(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Explainable Match Breakdown Section */}
            {selectedJob.match && (
              <div className="p-4 rounded-xl bg-[#635BFF]/5 dark:bg-[#635BFF]/10 border border-[#635BFF]/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#635BFF]" />
                    <span className="font-bold text-sm text-slate-900 dark:text-white">Explainable 5-Factor Job Compatibility</span>
                  </div>
                  <span className="text-lg font-extrabold text-[#635BFF] dark:text-[#8B7CFF]">
                    {selectedJob.match.overall_score}% Match
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-[#1E293B]">
                    <span className="text-[10px] text-slate-400 block font-semibold">Skills (35%)</span>
                    <span className="font-bold text-slate-900 dark:text-white">{selectedJob.match.skills_score}%</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-[#1E293B]">
                    <span className="text-[10px] text-slate-400 block font-semibold">Experience (25%)</span>
                    <span className="font-bold text-slate-900 dark:text-white">{selectedJob.match.experience_score}%</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-[#1E293B]">
                    <span className="text-[10px] text-slate-400 block font-semibold">Education (15%)</span>
                    <span className="font-bold text-slate-900 dark:text-white">{selectedJob.match.education_score}%</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-[#1E293B]">
                    <span className="text-[10px] text-slate-400 block font-semibold">Location (15%)</span>
                    <span className="font-bold text-slate-900 dark:text-white">{selectedJob.match.location_score}%</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-[#1E293B]">
                    <span className="text-[10px] text-slate-400 block font-semibold">Preferences (10%)</span>
                    <span className="font-bold text-slate-900 dark:text-white">{selectedJob.match.preferences_score}%</span>
                  </div>
                </div>

                {selectedJob.match.explanation && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {selectedJob.match.explanation}
                  </p>
                )}
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
                    <span>Skill Gaps ({selectedJob.match.missing_skills.length})</span>
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

            {/* Full Job Description */}
            <div className="space-y-2">
              <h3 className="font-bold text-xs text-slate-800 dark:text-slate-200">Full Job Description</h3>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#111827] border border-slate-200/60 dark:border-[#1E293B] text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-mono whitespace-pre-line max-h-60 overflow-y-auto">
                {selectedJob.raw_description}
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-[#1E293B]">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleSave(selectedJob)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#1E293B] text-xs font-semibold hover:bg-slate-50 flex items-center gap-1.5"
                >
                  {selectedJob.is_saved ? <BookmarkCheck className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> : <Bookmark className="w-3.5 h-3.5" />}
                  <span>{selectedJob.is_saved ? 'Saved' : 'Save Job'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const id = selectedJob.id;
                    setSelectedJob(null);
                    onStartTailoring(id);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-[#1E293B] bg-white dark:bg-[#111827] text-slate-700 dark:text-slate-300 text-xs font-semibold hover:border-slate-300 flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#635BFF]" />
                  <span>Tailor Resume</span>
                </button>

                <button
                  onClick={() => {
                    const id = selectedJob.id;
                    setSelectedJob(null);
                    onStartApplication(id);
                  }}
                  className="px-4 py-2 rounded-xl btn-primary text-xs font-semibold flex items-center gap-1.5"
                >
                  <span>Launch Application</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
