import React, { useState, useEffect } from 'react';
import {
  Calendar, Clock, CheckCircle2, AlertCircle, Plus, Sparkles,
  ExternalLink, Building, ChevronRight, CheckSquare, Square,
  RefreshCw, MessageSquare, Trash2, X, Award, Send, ThumbsUp, ThumbsDown
} from 'lucide-react';
import { api } from '../../services/api';
import { Interview, Application, InterviewSession, MockInterviewAnswer } from '../../types';
import { useAuth } from '../../context/AuthContext';

export const InterviewsView: React.FC = () => {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<'scheduled' | 'mock_studio'>('scheduled');

  // Scheduled Interviews State
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    application_id: '',
    round_name: 'Technical Round 1',
    scheduled_at: '',
    meeting_url: '',
    notes: ''
  });
  const [scheduling, setScheduling] = useState(false);

  // Mock Interview Studio State
  const [mockSessions, setMockSessions] = useState<InterviewSession[]>([]);
  const [activeSession, setActiveSession] = useState<InterviewSession | null>(null);
  const [targetRoleInput, setTargetRoleInput] = useState('Senior Software Engineer');
  const [currentQuestionInput, setCurrentQuestionInput] = useState(
    'Can you describe how you architect and optimize data workflows or services using modern frameworks?'
  );
  const [candidateAnswerInput, setCandidateAnswerInput] = useState('');
  const [evaluating, setEvaluating] = useState(false);
  const [latestEvaluation, setLatestEvaluation] = useState<MockInterviewAnswer | null>(null);

  const loadData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [ints, apps, sessions] = await Promise.all([
        api.listInterviews(),
        api.listApplications(),
        api.listInterviewSessions()
      ]);
      setInterviews(ints);
      setApplications(apps);
      setMockSessions(sessions);
      if (ints.length > 0 && !selectedInterview) {
        setSelectedInterview(ints[0]);
      }
      if (sessions.length > 0 && !activeSession) {
        setActiveSession(sessions[0]);
      }
    } catch (err) {
      console.error('Failed to load interviews', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleToggleChecklist = async (index: number) => {
    if (!selectedInterview) return;
    const updatedChecklist = [...selectedInterview.preparation_checklist];
    updatedChecklist[index].done = !updatedChecklist[index].done;

    try {
      const updated = await api.updateInterview(selectedInterview.id, {
        preparation_checklist: updatedChecklist
      });
      setSelectedInterview(updated);
      setInterviews(prev => prev.map(i => i.id === updated.id ? updated : i));
    } catch (err) {
      console.error('Error updating checklist', err);
    }
  };

  const handleRegenerateQuestions = async () => {
    if (!selectedInterview) return;
    setRegenerating(true);
    try {
      const updated = await api.regenerateInterviewPrep(selectedInterview.id);
      setSelectedInterview(updated);
      setInterviews(prev => prev.map(i => i.id === updated.id ? updated : i));
    } catch (err) {
      console.error('Error regenerating prep questions', err);
    } finally {
      setRegenerating(false);
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.application_id || !formData.scheduled_at) return;

    setScheduling(true);
    try {
      const created = await api.createInterview({
        application_id: formData.application_id,
        round_name: formData.round_name,
        scheduled_at: new Date(formData.scheduled_at).toISOString(),
        meeting_url: formData.meeting_url || undefined,
        notes: formData.notes || undefined
      });
      setInterviews(prev => [created, ...prev]);
      setSelectedInterview(created);
      setScheduleModalOpen(false);
      setFormData({
        application_id: '',
        round_name: 'Technical Round 1',
        scheduled_at: '',
        meeting_url: '',
        notes: ''
      });
    } catch (err) {
      console.error('Error creating interview schedule', err);
    } finally {
      setScheduling(false);
    }
  };

  const handleUpdateOutcome = async (newOutcome: string) => {
    if (!selectedInterview) return;
    try {
      const updated = await api.updateInterview(selectedInterview.id, { outcome: newOutcome });
      setSelectedInterview(updated);
      setInterviews(prev => prev.map(i => i.id === updated.id ? updated : i));
    } catch (err) {
      console.error('Error updating interview outcome', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this interview record?')) return;
    try {
      await api.deleteInterview(id);
      const remaining = interviews.filter(i => i.id !== id);
      setInterviews(remaining);
      setSelectedInterview(remaining.length > 0 ? remaining[0] : null);
    } catch (err) {
      console.error('Error deleting interview', err);
    }
  };

  // Mock Studio Handlers
  const handleStartMockSession = async () => {
    try {
      const newSession = await api.createInterviewSession({
        target_role: targetRoleInput,
        title: `Mock Interview — ${targetRoleInput}`
      });
      setMockSessions([newSession, ...mockSessions]);
      setActiveSession(newSession);
      setLatestEvaluation(null);
      setCandidateAnswerInput('');
    } catch (err) {
      console.error('Failed to create mock session', err);
    }
  };

  const handleEvaluateMockAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession || !candidateAnswerInput.trim()) return;

    setEvaluating(true);
    try {
      const evalRes = await api.evaluateMockAnswer(activeSession.id, {
        question: currentQuestionInput,
        candidate_answer: candidateAnswerInput,
        category: 'Technical & STAR'
      });
      setLatestEvaluation(evalRes);
      // Refresh active session
      const refreshed = await api.getInterviewSession(activeSession.id);
      setActiveSession(refreshed);
      setMockSessions(mockSessions.map(s => s.id === refreshed.id ? refreshed : s));
    } catch (err) {
      console.error('Evaluation failed', err);
    } finally {
      setEvaluating(false);
    }
  };

  const handleCompleteMockSession = async () => {
    if (!activeSession) return;
    try {
      const completed = await api.completeInterviewSession(activeSession.id);
      setActiveSession(completed);
      setMockSessions(mockSessions.map(s => s.id === completed.id ? completed : s));
    } catch (err) {
      console.error('Error completing session', err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading interview telemetry...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* View Mode Toggle Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Interview Studio & Prep
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time STAR framework evaluation, personalized checklists, and company-specific question rubrics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('scheduled')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'scheduled'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Scheduled Rounds ({interviews.length})
            </button>
            <button
              onClick={() => setViewMode('mock_studio')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                viewMode === 'mock_studio'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3 h-3" /> Interactive Mock Studio
            </button>
          </div>

          {viewMode === 'scheduled' && (
            <button
              onClick={() => setScheduleModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-sm shadow-indigo-600/20"
            >
              <Plus className="w-3.5 h-3.5" /> Schedule Round
            </button>
          )}
        </div>
      </div>

      {/* VIEW 1: Scheduled Interviews */}
      {viewMode === 'scheduled' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Scheduled List */}
          <div className="lg:col-span-4 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Upcoming Rounds</h2>
            {interviews.length === 0 ? (
              <div className="p-6 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
                No interviews currently scheduled. Click 'Schedule Round' to link an interview to an application.
              </div>
            ) : (
              interviews.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedInterview(item)}
                  className={`p-4 rounded-xl cursor-pointer border transition ${
                    selectedInterview?.id === item.id
                      ? 'bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-500/50'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">{item.round_name}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {item.outcome}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                    {item.application?.job?.company || 'Company'} • {item.application?.job?.title || 'Role'}
                  </p>
                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(item.scheduled_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right Column: Active Interview Details & AI Prep */}
          <div className="lg:col-span-8">
            {selectedInterview ? (
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                      {selectedInterview.round_name}
                    </span>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                      {selectedInterview.application?.job?.company} — {selectedInterview.application?.job?.title}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedInterview.outcome}
                      onChange={(e) => handleUpdateOutcome(e.target.value)}
                      className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none"
                    >
                      <option value="Scheduled">Scheduled</option>
                      <option value="Completed">Completed</option>
                      <option value="Passed">Passed Round</option>
                      <option value="Failed">Not Selected</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                    <button
                      onClick={handleRegenerateQuestions}
                      disabled={regenerating}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
                      <span>Regenerate</span>
                    </button>
                    <button
                      onClick={() => handleDelete(selectedInterview.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Checklist Section */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Interactive Preparation Checklist
                  </h3>
                  <div className="space-y-2">
                    {selectedInterview.preparation_checklist?.map((chk, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleToggleChecklist(idx)}
                        className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 transition"
                      >
                        {chk.done ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                        )}
                        <span className={`text-xs ${chk.done ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-300 font-medium'}`}>
                          {chk.item}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI Questions & Rubrics */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Tailored Interview Questions & STAR Rubrics
                  </h3>
                  <div className="space-y-3">
                    {selectedInterview.generated_questions?.map((q, idx) => (
                      <div key={idx} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 uppercase">
                            {q.type || 'Technical'}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">{q.question}</h4>
                        {q.talking_points && (
                          <ul className="list-disc list-inside text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                            {q.talking_points.map((tp, tidx) => (
                              <li key={tidx}>{tp}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 text-sm">
                Select an interview from the left to view tailored prep rubrics.
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: Interactive Mock Interview Studio */}
      {viewMode === 'mock_studio' && (
        <div className="space-y-6">
          {/* Studio Top Control */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  AI Mock Interview Simulator
                </span>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                  Real-Time STAR Response Evaluator
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Submit written or dictated answers to receive comprehensive scoring across Technical Accuracy, STAR alignment, and concise communication.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={targetRoleInput}
                  onChange={(e) => setTargetRoleInput(e.target.value)}
                  placeholder="Target Role (e.g. Data Analyst)"
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white outline-none"
                />
                <button
                  onClick={handleStartMockSession}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition shrink-0"
                >
                  New Session
                </button>
              </div>
            </div>

            {/* Session Stats Bar */}
            {activeSession && (
              <div className="flex flex-wrap items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Active Session: <strong className="text-indigo-600 dark:text-indigo-400">{activeSession.title}</strong>
                  </span>
                  <span className="text-slate-400">Rounds Answered: {activeSession.answers?.length || 0}</span>
                </div>
                {activeSession.status !== 'completed' ? (
                  <button
                    onClick={handleCompleteMockSession}
                    className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition"
                  >
                    Finish Session & Generate Report
                  </button>
                ) : (
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 font-bold">
                    Completed (Score: {activeSession.overall_score}%)
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Interactive Question Practice Box */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-4">
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Current Question</label>
                  <input
                    type="text"
                    value={currentQuestionInput}
                    onChange={(e) => setCurrentQuestionInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-white outline-none"
                  />
                </div>

                {/* Answer form */}
                <form onSubmit={handleEvaluateMockAnswer} className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Your Response (STAR Method: Situation, Task, Action, Result)
                  </label>
                  <textarea
                    rows={6}
                    value={candidateAnswerInput}
                    onChange={(e) => setCandidateAnswerInput(e.target.value)}
                    placeholder="Describe your situation, specific engineering actions taken, and quantified business results achieved..."
                    className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />

                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      Word count: {candidateAnswerInput.trim() ? candidateAnswerInput.trim().split(/\s+/).length : 0}
                    </span>
                    <button
                      type="submit"
                      disabled={evaluating || !candidateAnswerInput.trim()}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {evaluating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      {evaluating ? 'Evaluating STAR...' : 'Submit for AI Evaluation'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Previous session answers list */}
              {activeSession && activeSession.answers && activeSession.answers.length > 0 && (
                <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Evaluated Answers in this Session ({activeSession.answers.length})
                  </h3>
                  <div className="space-y-2">
                    {activeSession.answers.map((ans, idx) => (
                      <div
                        key={ans.id || idx}
                        onClick={() => setLatestEvaluation(ans)}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 cursor-pointer hover:border-indigo-400 transition flex items-center justify-between text-xs"
                      >
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-sm">
                          {ans.question}
                        </span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                          {ans.overall_score}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right 5 Cols: AI Evaluation Scorecard */}
            <div className="lg:col-span-5">
              {latestEvaluation ? (
                <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      STAR Scorecard
                    </span>
                    <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                      {latestEvaluation.overall_score}%
                    </span>
                  </div>

                  {/* 3 Metric Progress Cards */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 font-semibold block">STAR</span>
                      <strong className="text-sm text-slate-900 dark:text-white">{latestEvaluation.star_framework_score}%</strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 font-semibold block">Tech</span>
                      <strong className="text-sm text-slate-900 dark:text-white">{latestEvaluation.technical_accuracy_score}%</strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 font-semibold block">Clarity</span>
                      <strong className="text-sm text-slate-900 dark:text-white">{latestEvaluation.communication_score}%</strong>
                    </div>
                  </div>

                  {/* Strengths */}
                  {latestEvaluation.strengths && latestEvaluation.strengths.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <ThumbsUp className="w-3.5 h-3.5" /> Strengths
                      </span>
                      <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1 list-disc list-inside">
                        {latestEvaluation.strengths.map((s, idx) => (
                          <li key={idx}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Areas for improvement */}
                  {latestEvaluation.areas_for_improvement && latestEvaluation.areas_for_improvement.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <ThumbsDown className="w-3.5 h-3.5" /> Areas for Growth
                      </span>
                      <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1 list-disc list-inside">
                        {latestEvaluation.areas_for_improvement.map((imp, idx) => (
                          <li key={idx}>{imp}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Model Answer using STAR */}
                  {latestEvaluation.improved_model_answer && (
                    <div className="p-3.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-1.5">
                      <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 block">
                        Exemplary STAR Model Answer
                      </span>
                      <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                        {latestEvaluation.improved_model_answer}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
                  Submit an answer on the left to view the AI STAR rubric scorecard.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {scheduleModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Schedule Interview Round</h3>
              <button onClick={() => setScheduleModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Target Application</label>
                <select
                  required
                  value={formData.application_id}
                  onChange={(e) => setFormData({ ...formData, application_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none"
                >
                  <option value="">Select an application...</option>
                  {applications.map((app) => (
                    <option key={app.id} value={app.id}>
                      {app.job?.company} — {app.job?.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Round Name</label>
                <input
                  type="text"
                  required
                  value={formData.round_name}
                  onChange={(e) => setFormData({ ...formData, round_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Scheduled Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={formData.scheduled_at}
                  onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Meeting Link (Optional)</label>
                <input
                  type="url"
                  placeholder="https://meet.google.com/..."
                  value={formData.meeting_url}
                  onChange={(e) => setFormData({ ...formData, meeting_url: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setScheduleModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={scheduling}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 text-white font-semibold disabled:opacity-50"
                >
                  {scheduling ? 'Scheduling...' : 'Save Round'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
