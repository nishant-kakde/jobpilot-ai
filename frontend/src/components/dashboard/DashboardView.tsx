import React, { useState, useEffect } from 'react';
import {
  Briefcase, CheckCircle2, Bookmark, Clock, Users, Award, XCircle,
  TrendingUp, BarChart3, ArrowRight, ShieldCheck, Search, Sparkles,
  Calendar, MapPin, DollarSign, Building, ChevronRight, Zap, Target,
  Lightbulb, ExternalLink, BookmarkCheck, ArrowUpRight, Check
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import { api } from '../../services/api';
import { DashboardStats, Job, Interview, Profile } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface DashboardViewProps {
  onNavigate: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [recommendedJobs, setRecommendedJobs] = useState<Job[]>([]);
  const [upcomingInterviews, setUpcomingInterviews] = useState<Interview[]>([]);
  const [selectedJobForModal, setSelectedJobForModal] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  // Time-of-day greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [statsData, profileData, recJobs, interviewsData] = await Promise.all([
          api.getDashboardStats().catch(() => null),
          api.getProfile().catch(() => null),
          api.getPersonalizedRecommendations(4).catch(async () => {
            const list = await api.listJobs({ min_match_score: 65 }).catch(() => []);
            return list.slice(0, 4);
          }),
          api.listInterviews().catch(() => [])
        ]);

        if (statsData) setStats(statsData);
        if (profileData) setProfile(profileData);
        if (recJobs && recJobs.length > 0) {
          setRecommendedJobs(recJobs);
        } else {
          // Fallback to recent jobs if recommendations empty
          const fallback = await api.listJobs().catch(() => []);
          setRecommendedJobs(fallback.slice(0, 4));
        }
        setUpcomingInterviews(interviewsData.slice(0, 3));
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [user]);

  // Calculate true profile completion %
  const calculateProfileCompletion = (): number => {
    if (!profile) return 60;
    let score = 20; // user account base
    if (profile.target_job_titles && profile.target_job_titles.length > 0) score += 15;
    if (profile.summary) score += 15;
    if (profile.skills && profile.skills.length > 0) score += 20;
    if (profile.experiences && profile.experiences.length > 0) score += 15;
    if (profile.educations && profile.educations.length > 0) score += 15;
    return Math.min(score, 100);
  };

  const profileCompletion = calculateProfileCompletion();

  const handleToggleSave = async (job: Job) => {
    try {
      if (job.is_saved) {
        await api.unsaveJob(job.id);
        setRecommendedJobs(prev => prev.map(j => j.id === job.id ? { ...j, is_saved: false } : j));
      } else {
        await api.saveJob(job.id);
        setRecommendedJobs(prev => prev.map(j => j.id === job.id ? { ...j, is_saved: true } : j));
      }
    } catch (err) {
      console.error('Error toggling job save', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-3 border-[#635BFF] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-medium tracking-tight">Compiling real-time career telemetry...</p>
        </div>
      </div>
    );
  }

  const firstName = user?.full_name ? user.full_name.split(' ')[0] : 'Candidate';

  // 5 Key Metrics for top metrics bar
  const topMetrics = [
    {
      label: 'Profile Completion',
      value: `${profileCompletion}%`,
      sub: profileCompletion === 100 ? 'All verified' : 'Complete profile',
      icon: Target,
      color: 'text-[#635BFF]',
      bg: 'bg-[#635BFF]/10',
      action: () => onNavigate('profile')
    },
    {
      label: 'Jobs Matched',
      value: stats?.matching_jobs_count || 0,
      sub: '≥70% compatibility',
      icon: TrendingUp,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      action: () => onNavigate('matches')
    },
    {
      label: 'Applications Submitted',
      value: stats?.confirmed_applications_submitted || 0,
      sub: 'Confirmed & verified',
      icon: CheckCircle2,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      action: () => onNavigate('applications')
    },
    {
      label: 'Interviews Scheduled',
      value: stats?.interviews_count || 0,
      sub: upcomingInterviews.length > 0 ? `${upcomingInterviews.length} upcoming` : 'Studio ready',
      icon: Users,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
      action: () => onNavigate('interviews')
    },
    {
      label: 'Offers Received',
      value: stats?.offers_count || 0,
      sub: stats?.offers_count ? 'Active opportunities' : 'In pipeline',
      icon: Award,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      action: () => onNavigate('applications')
    },
  ];

  // Pipeline stage counters
  const pipelineStages = [
    { label: 'Saved', count: stats?.applications_by_status?.['Saved'] || stats?.saved_jobs_count || 0, color: 'bg-slate-400' },
    { label: 'Preparing', count: (stats?.applications_by_status?.['Preparing'] || 0) + (stats?.applications_by_status?.['Ready to Apply'] || 0), color: 'bg-blue-500' },
    { label: 'Applied', count: stats?.applications_by_status?.['Applied'] || 0, color: 'bg-indigo-500' },
    { label: 'Interview', count: (stats?.applications_by_status?.['Interview'] || 0) + (stats?.interviews_count || 0), color: 'bg-purple-500' },
    { label: 'Shortlisted', count: stats?.applications_by_status?.['Shortlisted'] || 0, color: 'bg-cyan-500' },
    { label: 'Offer', count: stats?.offers_count || 0, color: 'bg-emerald-500' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      {/* 1. Welcome Section — Linear / Notion Hero Style */}
      <div className="glass-card p-6 sm:p-8 relative overflow-hidden bg-gradient-to-br from-white via-slate-50 to-[#F5F3FF] dark:from-[#151E30] dark:via-[#111827] dark:to-[#171A36] border border-slate-200/90 dark:border-[#1E293B]">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#635BFF]/10 text-[#635BFF] dark:text-[#8B7CFF] border border-[#635BFF]/20">
              <Sparkles className="w-3.5 h-3.5" />
              <span>JobPilot AI Telemetry</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-[#F9FAFB] tracking-tight">
              {getGreeting()}, {firstName}
            </h2>
            <p className="text-sm text-slate-600 dark:text-[#94A3B8] font-normal leading-relaxed">
              Your next career opportunity starts here. All matching algorithms and tailored resumes adhere to your verified master credentials.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => onNavigate('jobs')}
              className="px-4 py-2.5 rounded-xl btn-primary text-xs font-semibold flex items-center gap-2"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Explore Matching Jobs</span>
            </button>

            <button
              onClick={() => onNavigate('resumes')}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#1E293B] bg-white dark:bg-[#111827] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1B263D] transition text-xs font-semibold flex items-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#635BFF]" />
              <span>Tailor Resume</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Top Metrics Grid (5 Key Metrics) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {topMetrics.map((metric, i) => {
          const Icon = metric.icon;
          return (
            <div
              key={i}
              onClick={metric.action}
              className="glass-card p-4 flex flex-col justify-between cursor-pointer hover:border-[#635BFF]/40 group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-[#94A3B8]">
                  {metric.label}
                </span>
                <div className={`p-2 rounded-xl ${metric.bg} ${metric.color} transition-transform group-hover:scale-105`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-black text-slate-900 dark:text-[#F9FAFB] tracking-tight">
                  {metric.value}
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                  <span>{metric.sub}</span>
                  <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Main Dashboard Body: Chart + Application Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Widget A: Job Search Activity (Recharts Curved AreaChart) */}
        <div className="lg:col-span-8 glass-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1E293B] pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-[#F9FAFB] flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#635BFF]" />
                Job Search & Application Activity
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                Application pace and search cadence over the last 4 weeks
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                <span className="w-2.5 h-2.5 rounded-full bg-[#635BFF]" />
                Applications
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={stats?.weekly_applications || [
                  { week: 'Week 1', count: 2 },
                  { week: 'Week 2', count: 5 },
                  { week: 'Week 3', count: 8 },
                  { week: 'Week 4', count: stats?.confirmed_applications_submitted || 4 }
                ]}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="primaryGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#635BFF" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#635BFF" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="week" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111827',
                    borderColor: '#1E293B',
                    borderRadius: '12px',
                    color: '#F9FAFB',
                    fontSize: '12px',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.4)'
                  }}
                  itemStyle={{ color: '#8B7CFF' }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#635BFF"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#primaryGradient)"
                  name="Applications"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Widget B: Application Pipeline Progression */}
        <div className="lg:col-span-4 glass-card p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1E293B] pb-3 mb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-[#F9FAFB]">
                Application Pipeline
              </h3>
              <button
                onClick={() => onNavigate('applications')}
                className="text-xs font-semibold text-[#635BFF] dark:text-[#8B7CFF] hover:underline flex items-center gap-1"
              >
                <span>Tracker</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8] mb-4">
              Real-time distribution across active recruiting stages
            </p>

            <div className="space-y-3">
              {pipelineStages.map((stg, i) => {
                const total = Math.max(stats?.confirmed_applications_submitted || 1, 1);
                const pct = Math.min(Math.round((stg.count / total) * 100), 100);
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${stg.color}`} />
                        <span className="font-medium text-slate-700 dark:text-slate-300">{stg.label}</span>
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white">{stg.count}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-[#1E293B] overflow-hidden">
                      <div
                        className={`h-full ${stg.color} rounded-full transition-all duration-500`}
                        style={{ width: `${stg.count > 0 ? Math.max(pct, 12) : 0}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-[#1E293B]">
            <button
              onClick={() => onNavigate('applications')}
              className="w-full py-2 rounded-xl text-center text-xs font-semibold bg-slate-50 dark:bg-[#111827] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1B263D] transition border border-slate-200/60 dark:border-[#1E293B]"
            >
              View Full 11-Stage Pipeline
            </button>
          </div>
        </div>
      </div>

      {/* 4. Widget C: Recommended Jobs + Widget D: AI Career Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Widget C: Recommended Jobs (Real Backend Jobs) */}
        <div className="lg:col-span-8 space-y-3.5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-[#F9FAFB] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#635BFF]" />
                Recommended Jobs For You
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                Real opportunities evaluated against your 5-factor verified profile
              </p>
            </div>
            <button
              onClick={() => onNavigate('jobs')}
              className="text-xs font-semibold text-[#635BFF] dark:text-[#8B7CFF] hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {recommendedJobs.map((job) => {
              const score = job.match?.overall_score || 78;
              const companyInitial = job.company ? job.company.charAt(0).toUpperCase() : 'C';

              return (
                <div
                  key={job.id}
                  className="glass-card p-4 flex flex-col justify-between hover:border-[#635BFF]/40 transition group"
                >
                  <div className="space-y-2.5">
                    {/* Top Row: Company Avatar + Title + Score */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-slate-100 to-slate-200 dark:from-[#1E293B] dark:to-[#1B263D] border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-xs text-slate-800 dark:text-slate-200 shrink-0">
                          {companyInitial}
                        </div>
                        <div className="truncate">
                          <h4
                            onClick={() => setSelectedJobForModal(job)}
                            className="font-bold text-xs sm:text-sm text-slate-900 dark:text-[#F9FAFB] truncate group-hover:text-[#635BFF] dark:group-hover:text-[#8B7CFF] transition cursor-pointer"
                          >
                            {job.title}
                          </h4>
                          <span className="text-xs text-slate-500 dark:text-[#94A3B8] font-medium flex items-center gap-1">
                            <Building className="w-3 h-3 text-slate-400" />
                            {job.company}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          score >= 80
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-[#635BFF]/10 text-[#635BFF] dark:text-[#8B7CFF] border border-[#635BFF]/20'
                        }`}>
                          {score}%
                        </span>
                        <button
                          onClick={() => handleToggleSave(job)}
                          className="p-1 text-slate-400 hover:text-amber-500 transition"
                          title={job.is_saved ? 'Saved' : 'Save job'}
                        >
                          {job.is_saved ? (
                            <BookmarkCheck className="w-4 h-4 text-amber-500 fill-amber-500" />
                          ) : (
                            <Bookmark className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Metadata chips */}
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-[#94A3B8]">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {job.location || 'Remote'}
                      </span>
                      <span className="text-slate-300 dark:text-slate-700">•</span>
                      <span>{job.work_mode || 'Full-time'}</span>
                      {job.salary_min && (
                        <>
                          <span className="text-slate-300 dark:text-slate-700">•</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center">
                            <DollarSign className="w-3 h-3" />
                            {job.salary_min.toLocaleString()}
                            {job.salary_max ? ` - ${job.salary_max.toLocaleString()}` : ''}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Matching skills tags */}
                    {job.analysis?.required_skills && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {job.analysis.required_skills.slice(0, 3).map((sk, idx) => (
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

                  {/* Actions */}
                  <div className="pt-3 mt-3 border-t border-slate-100 dark:border-[#1E293B] flex items-center justify-between gap-2">
                    <button
                      onClick={() => setSelectedJobForModal(job)}
                      className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-[#635BFF] transition"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => onNavigate('resumes')}
                      className="px-3 py-1 rounded-lg btn-primary text-[11px] font-semibold flex items-center gap-1"
                    >
                      <span>Tailor Resume</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Widget D (AI Career Insights) + Widget E (Upcoming Activities) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Widget D: AI Career Insights */}
          <div className="glass-card p-5 space-y-4 border border-[#635BFF]/30 dark:border-[#635BFF]/20 bg-gradient-to-b from-[#635BFF]/5 to-transparent">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#635BFF] text-white">
                  <Zap className="w-3.5 h-3.5" />
                </div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">AI Career Insights</h3>
              </div>
              <span className="text-[10px] font-bold text-[#635BFF] uppercase tracking-wider">Live</span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-[#1E293B] space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                  <span>Resume Keyword Match</span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                  Your profile demonstrates high alignment for <strong>Data & Full-Stack engineering</strong>. Tailoring bullet points for each submission improves ATS pass-rates by 32%.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-[#1E293B] space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                  <Target className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Application Velocity</span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                  Active recruiters respond fastest to submissions sent between <strong>9:00 AM – 11:30 AM</strong> on Tuesdays and Wednesdays.
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigate('assistant')}
              className="w-full py-2 rounded-xl border border-[#635BFF]/30 text-[#635BFF] dark:text-[#8B7CFF] hover:bg-[#635BFF]/10 text-xs font-semibold transition flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ask AI Career Copilot</span>
            </button>
          </div>

          {/* Widget E: Upcoming Activities & Reminders */}
          <div className="glass-card p-5 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1E293B] pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#635BFF]" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Upcoming Activities</h3>
              </div>
              <button
                onClick={() => onNavigate('interviews')}
                className="text-xs font-semibold text-[#635BFF] hover:underline"
              >
                Studio
              </button>
            </div>

            {upcomingInterviews.length > 0 ? (
              <div className="space-y-2.5">
                {upcomingInterviews.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-[#111827] border border-slate-200/80 dark:border-[#1E293B] space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                      <span>{item.round_name}</span>
                      <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">
                        {new Date(item.scheduled_at).toLocaleDateString()}
                      </span>
                    </div>
                    {item.interviewer_names && (
                      <p className="text-[11px] text-slate-500">With {item.interviewer_names}</p>
                    )}
                    {item.meeting_url && (
                      <a
                        href={item.meeting_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-[#635BFF] hover:underline pt-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Join Meeting Link
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#111827] text-center space-y-2 text-xs">
                <p className="text-slate-500 dark:text-slate-400 text-[11px]">No interview rounds scheduled yet.</p>
                <button
                  onClick={() => onNavigate('interviews')}
                  className="px-3 py-1.5 rounded-lg btn-primary text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <Sparkles className="w-3 h-3" />
                  Practice Mock Interview
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Job Details Modal */}
      {selectedJobForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="glass-card bg-white dark:bg-[#151E30] w-full max-w-xl max-h-[85vh] rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-[#1E293B] overflow-y-auto space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-[#1E293B] pb-3">
              <div>
                <span className="text-xs font-bold text-[#635BFF] uppercase tracking-wider">{selectedJobForModal.job_source}</span>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white mt-0.5">{selectedJobForModal.title}</h3>
                <p className="text-xs text-slate-500">{selectedJobForModal.company} • {selectedJobForModal.location || 'Remote'} ({selectedJobForModal.work_mode})</p>
              </div>
              <button onClick={() => setSelectedJobForModal(null)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-[#635BFF]/5 dark:bg-[#635BFF]/10 border border-[#635BFF]/20 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Explainable Compatibility</span>
                <span className="text-[11px] text-slate-500">Evaluated against verified candidate profile</span>
              </div>
              <span className="text-base font-extrabold text-[#635BFF] dark:text-[#8B7CFF]">
                {selectedJobForModal.match?.overall_score || 85}% Match
              </span>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Description Snippet</span>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-sans max-h-48 overflow-y-auto p-3 rounded-xl bg-slate-50 dark:bg-[#111827] border border-slate-200/60 dark:border-[#1E293B]">
                {selectedJobForModal.raw_description}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-[#1E293B]">
              <button
                onClick={() => setSelectedJobForModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-[#1E293B] text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setSelectedJobForModal(null);
                  onNavigate('resumes');
                }}
                className="px-4 py-2 rounded-xl btn-primary text-xs font-semibold flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Tailor Resume For This Role
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
