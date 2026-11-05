import React, { useState, useEffect } from 'react';
import {
  Compass, Target, Sparkles, CheckCircle2, Circle, ArrowRight,
  Clock, BookOpen, Layers, Award, RefreshCw, ChevronRight, Plus
} from 'lucide-react';
import { api } from '../../services/api';
import { CareerRoadmap } from '../../types';

export const CareerRoadmapView: React.FC = () => {
  const [roadmaps, setRoadmaps] = useState<CareerRoadmap[]>([]);
  const [selectedRoadmap, setSelectedRoadmap] = useState<CareerRoadmap | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [generating, setGenerating] = useState<boolean>(false);
  const [targetRoleInput, setTargetRoleInput] = useState<string>('Senior Data Analyst');
  const [weeklyHours, setWeeklyHours] = useState<number>(10);
  const [error, setError] = useState<string | null>(null);

  const popularRoles = [
    'Senior Data Analyst',
    'Data Scientist',
    'Machine Learning Engineer',
    'Python Backend Engineer',
    'Full-Stack Developer',
    'Cloud DevOps Engineer'
  ];

  useEffect(() => {
    loadRoadmaps();
  }, []);

  const loadRoadmaps = async () => {
    try {
      setLoading(true);
      const data = await api.listRoadmaps();
      setRoadmaps(data);
      if (data.length > 0) {
        setSelectedRoadmap(data[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load roadmaps.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRoleInput.trim()) return;

    try {
      setGenerating(true);
      setError(null);
      const newRoadmap = await api.generateRoadmap(targetRoleInput.trim(), weeklyHours);
      setRoadmaps([newRoadmap, ...roadmaps]);
      setSelectedRoadmap(newRoadmap);
    } catch (err: any) {
      setError(err.message || 'Generation failed.');
    } finally {
      setGenerating(false);
    }
  };

  const handleUpdateProgress = async (newPct: number) => {
    if (!selectedRoadmap) return;
    try {
      const updated = await api.updateRoadmapProgress(selectedRoadmap.id, newPct);
      setSelectedRoadmap(updated);
      setRoadmaps(roadmaps.map(r => r.id === updated.id ? updated : r));
    } catch (err: any) {
      console.error('Progress update failed', err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading your AI career roadmaps...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl p-6 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-xs font-semibold mb-3">
            <Compass className="w-3.5 h-3.5" /> Autonomous AI Career Roadmap
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
            Personalized Skill & Career Trajectory
          </h1>
          <p className="text-sm text-indigo-200">
            Synthesized against your verified candidate profile, realistic market requirements,
            and 30/60/90-day actionable study plans.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-sm">
          {error}
        </div>
      )}

      {/* Generator Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-500" /> Generate New Career Roadmap
        </h2>
        <form onSubmit={handleGenerate} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-6 space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Target Role</label>
            <input
              type="text"
              value={targetRoleInput}
              onChange={(e) => setTargetRoleInput(e.target.value)}
              placeholder="e.g. Senior Data Analyst, Python Architect"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div className="md:col-span-3 space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Weekly Commitment</label>
            <select
              value={weeklyHours}
              onChange={(e) => setWeeklyHours(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value={5}>5 Hours / week (Paced)</option>
              <option value={10}>10 Hours / week (Balanced)</option>
              <option value={15}>15 Hours / week (Intensive)</option>
              <option value={20}>20+ Hours / week (Full Immersion)</option>
            </select>
          </div>
          <div className="md:col-span-3">
            <button
              type="submit"
              disabled={generating}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition shadow-md shadow-indigo-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {generating ? 'Synthesizing...' : 'Generate Roadmap'}
            </button>
          </div>
        </form>

        {/* Popular chips */}
        <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
          <span className="text-xs text-slate-400 py-1">Quick Select:</span>
          {popularRoles.map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => setTargetRoleInput(role)}
              className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950 dark:hover:text-indigo-300 transition"
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      {/* Main Roadmap Display */}
      {selectedRoadmap ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Saved roadmaps selector */}
          {roadmaps.length > 1 && (
            <div className="lg:col-span-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Your Roadmaps</h3>
              <div className="space-y-2">
                {roadmaps.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRoadmap(r)}
                    className={`w-full p-4 rounded-xl text-left transition border ${
                      selectedRoadmap.id === r.id
                        ? 'bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-500/50'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-slate-900 dark:text-white">{r.target_role}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {r.progress_percentage}%
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3">
                      <span>{r.weekly_hours}h/wk</span>
                      <span>Readiness: {r.readiness_score}%</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Right/Center: Roadmap Detail */}
          <div className={roadmaps.length > 1 ? "lg:col-span-8 space-y-6" : "lg:col-span-12 space-y-6"}>
            {/* Overview Card */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">{selectedRoadmap.target_role}</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Estimated {selectedRoadmap.weekly_hours} hours/week study commitment
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-xs font-semibold text-slate-400 uppercase">Profile Readiness</span>
                    <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                      {selectedRoadmap.readiness_score}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Slider */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Mastery Progress</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{selectedRoadmap.progress_percentage}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${selectedRoadmap.progress_percentage}%` }}
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  {[25, 50, 75, 100].map((step) => (
                    <button
                      key={step}
                      type="button"
                      onClick={() => handleUpdateProgress(step)}
                      className="text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-slate-600 dark:text-slate-300 transition"
                    >
                      Mark {step}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Critical Skill Gaps */}
              {selectedRoadmap.critical_skill_gaps.length > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 block">
                    Priority Skill Gaps to Bridge
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {selectedRoadmap.critical_skill_gaps.map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Milestones Sections: 30 / 60 / 90 */}
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-500" /> Milestone Phases
              </h3>

              {/* Phase 1: 30 Days */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-xs">1</span>
                  First 30 Days — Core Foundations & Syntax Mastery
                </div>
                {selectedRoadmap.milestones_30_days.map((m, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{m.week}</span>
                      <span className="text-xs text-slate-500 font-medium">{m.focus}</span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300">{m.deliverables}</p>
                    {m.recommended_topics && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {m.recommended_topics.map((t, tidx) => (
                          <span key={tidx} className="text-[10px] px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Phase 2: 60 Days */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-xs">2</span>
                  60 Days — Production Hardening & Architecture
                </div>
                {selectedRoadmap.milestones_60_days.map((m, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{m.week}</span>
                      <span className="text-xs text-slate-500 font-medium">{m.focus}</span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300">{m.deliverables}</p>
                  </div>
                ))}
              </div>

              {/* Phase 3: 90 Days */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-xs">3</span>
                  90 Days — Portfolio Capstone & Interview Readiness
                </div>
                {selectedRoadmap.milestones_90_days.map((m, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{m.week}</span>
                      <span className="text-xs text-slate-500 font-medium">{m.focus}</span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300">{m.deliverables}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Portfolio Capstone Recommendations */}
            {selectedRoadmap.portfolio_projects.length > 0 && (
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-500" /> Recommended Portfolio Project
                </h3>
                {selectedRoadmap.portfolio_projects.map((proj, pidx) => (
                  <div key={pidx} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 space-y-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{proj.title}</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300">{proj.description}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {proj.tech_stack.map((t, idx) => (
                        <span key={idx} className="text-[10px] px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <Compass className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">No Roadmap Generated Yet</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Choose your target career role above to generate a customized 30/60/90-day learning roadmap.
          </p>
        </div>
      )}
    </div>
  );
};

