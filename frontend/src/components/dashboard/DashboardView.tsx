import React, { useState, useEffect } from 'react';
import {
  Briefcase, CheckCircle2, Bookmark, Clock, Users, Award, XCircle,
  TrendingUp, BarChart3, ArrowRight, ShieldCheck, Search, Sparkles
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { api } from '../../services/api';
import { DashboardStats } from '../../types';

interface DashboardViewProps {
  onNavigate: (tab: string) => void;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6'];

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await api.getDashboardStats();
        setStats(data);
      } catch (err) {
        console.error('Failed to load dashboard stats', err);
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Compiling career telemetry...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Jobs Tracked', value: stats?.total_jobs_found || 0, icon: Briefcase, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40' },
    { label: 'High Matches (≥70%)', value: stats?.matching_jobs_count || 0, icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' },
    { label: 'Saved Opportunities', value: stats?.saved_jobs_count || 0, icon: Bookmark, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40' },
    { label: 'Applications Prepared', value: stats?.applications_prepared || 0, icon: Clock, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40', note: 'Pre-filled / In Progress' },
    { label: 'Confirmed Submissions', value: stats?.confirmed_applications_submitted || 0, icon: CheckCircle2, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40', note: 'Verified by User' },
    { label: 'Active Interviews', value: stats?.interviews_count || 0, icon: Users, color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-950/40' },
    { label: 'Job Offers', value: stats?.offers_count || 0, icon: Award, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' },
    { label: 'Rejections', value: stats?.rejections_count || 0, icon: XCircle, color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40' },
  ];

  const sourceData = stats?.applications_by_source
    ? Object.entries(stats.applications_by_source).map(([name, value]) => ({ name, value }))
    : [];

  return (
    <div className="space-y-6">
      {/* Welcome / Verification Header */}
      <div className="glass-card p-6 relative overflow-hidden bg-gradient-to-r from-indigo-900 via-indigo-850 to-slate-900 text-white">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Autonomous AI Job Pipeline</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight mb-2">Welcome to your JobPilot Command Center</h2>
          <p className="text-sm text-indigo-100/80 leading-relaxed mb-4">
            Search permitted job portals, evaluate explainable compatibility scores, generate tailored ATS-compliant resumes,
            and manage verified applications under complete user consent.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('jobs')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-indigo-900 text-xs font-bold hover:bg-indigo-50 transition shadow-sm"
            >
              <Search className="w-3.5 h-3.5" />
              Explore Matching Jobs
            </button>
            <button
              onClick={() => onNavigate('resumes')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600/60 border border-indigo-400/40 text-white text-xs font-semibold hover:bg-indigo-600 transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Tailor Resume with ATS AI
            </button>
          </div>
        </div>
      </div>

      {/* 8 Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="glass-card p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{card.label}</span>
                <div className={`p-2 rounded-lg ${card.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {card.value}
                </span>
                {card.note && (
                  <span className="text-[10px] text-slate-400 font-medium">{card.note}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Applications Activity */}
        <div className="lg:col-span-2 glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Weekly Application Cadence</h3>
              <p className="text-xs text-slate-500">Pipeline progression over the last 4 weeks</p>
            </div>
            <BarChart3 className="w-4 h-4 text-slate-400" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.weekly_applications || []}>
                <XAxis dataKey="week" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name="Applications" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Applications by Portal Source */}
        <div className="glass-card p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Applications by Job Source</h3>
            <p className="text-xs text-slate-500 mb-4">Distribution across connected adapters</p>
            <div className="h-48">
              {sourceData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={sourceData} innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">
                      {sourceData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  No source telemetry recorded yet
                </div>
              )}
            </div>
          </div>
          <div className="space-y-1.5 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
            {sourceData.map((entry, idx) => (
              <div key={idx} className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  <span>{entry.name}</span>
                </div>
                <span className="font-semibold">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Match Score Distribution & Conversion Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Match Score Distribution */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Match Score Distribution</h3>
          <p className="text-xs text-slate-500 mb-4">Compatibility breakdown against your verified profile</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.match_score_distribution || []}>
                <XAxis dataKey="bracket" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} name="Jobs in Range" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Funnel Conversion */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Application Funnel Conversion</h3>
          <p className="text-xs text-slate-500 mb-4">End-to-end telemetry from discovery to job offer</p>
          <div className="space-y-3.5">
            {stats?.funnel_stages.map((stage, i) => {
              const maxVal = stats.funnel_stages[0]?.count || 1;
              const pct = Math.round((stage.count / Math.max(maxVal, 1)) * 100);
              return (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{stage.stage}</span>
                    <span className="font-bold text-slate-900 dark:text-white">{stage.count} ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(pct, 4)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
