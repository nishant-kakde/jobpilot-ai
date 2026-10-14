import React, { useState, useEffect } from 'react';
import {
  Calendar, Clock, CheckCircle2, AlertCircle, Plus, Sparkles,
  ExternalLink, Building, ChevronRight, CheckSquare, Square,
  RefreshCw, MessageSquare, Trash2, X
} from 'lucide-react';
import { api } from '../../services/api';
import { Interview, Application } from '../../types';

export const InterviewsView: React.FC = () => {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Interview Studio
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  // New Interview Modal
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    application_id: '',
    round_name: 'Technical Round 1',
    scheduled_at: '',
    meeting_url: '',
    notes: ''
  });
  const [scheduling, setScheduling] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ints, apps] = await Promise.all([
        api.listInterviews(),
        api.listApplications()
      ]);
      setInterviews(ints);
      setApplications(apps);
      if (ints.length > 0 && !selectedInterview) {
        setSelectedInterview(ints[0]);
      }
    } catch (err) {
      console.error('Failed to load interviews', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
    } catch (err: any) {
      alert(`Regeneration failed: ${err.message}`);
    } finally {
      setRegenerating(false);
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.application_id || !formData.scheduled_at) {
      alert('Please select an application and schedule date/time.');
      return;
    }
    setScheduling(true);
    try {
      const created = await api.createInterview(formData);
      setInterviews(prev => [...prev, created]);
      setSelectedInterview(created);
      setScheduleModalOpen(false);
      setFormData({ application_id: '', round_name: 'Technical Round 1', scheduled_at: '', meeting_url: '', notes: '' });
    } catch (err: any) {
      alert(`Scheduling failed: ${err.message}`);
    } finally {
      setScheduling(false);
    }
  };

  const handleUpdateOutcome = async (outcome: string) => {
    if (!selectedInterview) return;
    try {
      const updated = await api.updateInterview(selectedInterview.id, { outcome });
      setSelectedInterview(updated);
      setInterviews(prev => prev.map(i => i.id === updated.id ? updated : i));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this interview record?')) return;
    try {
      await api.deleteInterview(id);
      setInterviews(prev => prev.filter(i => i.id !== id));
      if (selectedInterview?.id === id) {
        setSelectedInterview(interviews.find(i => i.id !== id) || null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="glass-card p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-base text-slate-900 dark:text-white">Interview Preparation Assistant</h2>
            <p className="text-xs text-slate-500">AI-generated STAR behavioral questions, technical deep dives & checklists</p>
          </div>
        </div>

        <button
          onClick={() => setScheduleModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          Schedule Interview Round
        </button>
      </div>

      {/* Main Grid: Scheduled Rounds & Interview Prep Studio */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 4 Cols: Scheduled Interviews List */}
        <div className="lg:col-span-4 space-y-3">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Scheduled Rounds ({interviews.length})
          </h3>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading interview rounds...</div>
          ) : interviews.length === 0 ? (
            <div className="glass-card p-8 text-center space-y-2">
              <Calendar className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs text-slate-500 font-medium">No interviews scheduled yet.</p>
              <button
                onClick={() => setScheduleModalOpen(true)}
                className="text-xs text-indigo-600 font-bold hover:underline"
              >
                Schedule an upcoming round
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {interviews.map((item) => {
                const isSelected = selectedInterview?.id === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedInterview(item)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition ${
                      isSelected
                        ? 'bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-500 shadow-sm'
                        : 'glass-card hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                        {item.round_name}
                      </h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.outcome === 'Passed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                        item.outcome === 'Scheduled' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                        'bg-slate-100 text-slate-700 dark:bg-slate-800'
                      }`}>
                        {item.outcome}
                      </span>
                    </div>

                    <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1 mb-2">
                      <Building className="w-3 h-3 text-slate-400" />
                      {item.application?.job?.company || 'Organization'} • {item.application?.job?.title}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-1.5">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(item.scheduled_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {item.meeting_url && (
                        <a
                          href={item.meeting_url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-indigo-600 font-semibold hover:underline flex items-center gap-0.5"
                        >
                          Join Meeting
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 8 Cols: Prep Studio */}
        <div className="lg:col-span-8">
          {selectedInterview ? (
            <div className="glass-card p-6 space-y-6">
              {/* Studio Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                      {selectedInterview.round_name}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(selectedInterview.scheduled_at).toLocaleString()}
                    </span>
                  </div>
                  <h3 className="font-extrabold text-lg text-slate-900 dark:text-white mt-1">
                    {selectedInterview.application?.job?.company} — {selectedInterview.application?.job?.title}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedInterview.outcome}
                    onChange={(e) => handleUpdateOutcome(e.target.value)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
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
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1"
                    title="Generate fresh AI questions"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
                    <span>Regenerate Prep</span>
                  </button>

                  <button
                    onClick={() => handleDelete(selectedInterview.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 rounded"
                    title="Delete interview"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Interactive Preparation Checklist */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Pre-Interview Checklist
                  </h4>
                  <span className="text-[10px] text-slate-400">
                    {selectedInterview.preparation_checklist?.filter(c => c.done).length} of {selectedInterview.preparation_checklist?.length} Completed
                  </span>
                </div>

                <div className="space-y-1.5">
                  {selectedInterview.preparation_checklist?.map((chk, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleToggleChecklist(idx)}
                      className={`p-2.5 rounded-lg border flex items-center gap-2.5 cursor-pointer text-xs transition ${
                        chk.done
                          ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900 line-through text-slate-400'
                          : 'bg-slate-50 dark:bg-slate-850 border-slate-200/60 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {chk.done ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                      <span>{chk.item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Tailored Interview Questions & STAR Answers */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    High-Probability Interview Questions & STAR Talking Points
                  </h4>
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    AI Customized
                  </span>
                </div>

                <div className="space-y-3.5">
                  {selectedInterview.generated_questions?.map((q, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/70 dark:border-slate-800 space-y-2.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                          {q.type}
                        </span>
                        <span className="text-[10px] text-slate-400">Question {idx + 1}</span>
                      </div>

                      <h5 className="font-bold text-sm text-slate-900 dark:text-white leading-snug">
                        {q.question}
                      </h5>

                      {/* Talking Points */}
                      {q.talking_points && (
                        <div className="space-y-1 pt-1">
                          <span className="font-semibold text-slate-700 dark:text-slate-300 block text-[11px]">Recommended Talking Points:</span>
                          <ul className="list-disc pl-4 space-y-0.5 text-slate-600 dark:text-slate-400 text-[11px]">
                            {q.talking_points.map((tp, tIdx) => <li key={tIdx}>{tp}</li>)}
                          </ul>
                        </div>
                      )}

                      {/* Sample STAR Answer */}
                      {q.sample_answer && (
                        <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                          <span className="font-bold text-indigo-600 dark:text-indigo-400 block mb-1">Model STAR Answer:</span>
                          {q.sample_answer}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-card p-12 text-center text-xs text-slate-400">
              Select or schedule an interview round to open the preparation studio.
            </div>
          )}
        </div>
      </div>

      {/* Schedule Interview Modal */}
      {scheduleModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Schedule Interview Round</h3>
              <button onClick={() => setScheduleModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Target Application <span className="text-rose-500">*</span></label>
                <select
                  required
                  value={formData.application_id}
                  onChange={(e) => setFormData({ ...formData, application_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="">-- Choose Application --</option>
                  {applications.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.job?.company} • {a.job?.title} ({a.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Round Name</label>
                <input
                  type="text"
                  placeholder="e.g. Technical Round 1, System Design, HR Screening"
                  value={formData.round_name}
                  onChange={(e) => setFormData({ ...formData, round_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Scheduled Date & Time <span className="text-rose-500">*</span></label>
                <input
                  type="datetime-local"
                  required
                  value={formData.scheduled_at}
                  onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Meeting Link (Zoom, Meet, Teams)</label>
                <input
                  type="url"
                  placeholder="https://meet.google.com/abc-defg-hij"
                  value={formData.meeting_url}
                  onChange={(e) => setFormData({ ...formData, meeting_url: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setScheduleModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={scheduling}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {scheduling ? 'Generating Questions...' : 'Schedule & Build Prep'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
