import React, { useState, useEffect } from 'react';
import {
  Briefcase, Kanban, Table as TableIcon, Download, Plus, Search,
  Filter, Calendar, DollarSign, Building, MapPin, CheckCircle2,
  Clock, AlertCircle, Sparkles, ExternalLink, MoreVertical, Edit2, Trash2, X
} from 'lucide-react';
import { api } from '../../services/api';
import { Application, Job } from '../../types';

interface ApplicationsTrackerViewProps {
  onLaunchAutofill: (app: Application) => void;
  onNavigateToJob: (jobId: string) => void;
}

const ALL_STATUSES = [
  'Saved', 'Interested', 'Preparing', 'Ready to Apply',
  'Applied', 'Assessment', 'Interview', 'Shortlisted', 'Offer', 'Rejected', 'Withdrawn'
];

export const ApplicationsTrackerView: React.FC<ApplicationsTrackerViewProps> = ({
  onLaunchAutofill,
  onNavigateToJob
}) => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Selected Detail Modal
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [editingNotes, setEditingNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchApps = async () => {
    setLoading(true);
    try {
      const data = await api.listApplications(statusFilter === 'all' ? undefined : statusFilter, search);
      setApplications(data);
    } catch (err) {
      console.error('Error fetching applications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchApps();
  };

  const handleUpdateStatus = async (appId: string, newStatus: string) => {
    try {
      const updated = await api.updateApplication(appId, { status: newStatus });
      setApplications(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus } : a));
      if (selectedApp && selectedApp.id === appId) {
        setSelectedApp({ ...selectedApp, status: newStatus });
      }
    } catch (err) {
      console.error('Status update failed', err);
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedApp) return;
    setUpdating(true);
    try {
      const updated = await api.updateApplication(selectedApp.id, { notes: editingNotes });
      setSelectedApp(updated);
      setApplications(prev => prev.map(a => a.id === updated.id ? updated : a));
    } catch (err) {
      console.error('Notes save error', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tracked application?')) return;
    try {
      await api.deleteApplication(id);
      setApplications(prev => prev.filter(a => a.id !== id));
      if (selectedApp?.id === id) setSelectedApp(null);
    } catch (err) {
      console.error('Delete application error', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Offer': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300';
      case 'Interview': case 'Shortlisted': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-300';
      case 'Applied': case 'Assessment': return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300';
      case 'Ready to Apply': return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300 border-cyan-300';
      case 'Preparing': return 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-300';
      case 'Rejected': case 'Withdrawn': return 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300';
      default: return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="glass-card p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-base text-slate-900 dark:text-white">Application Pipeline Tracker</h2>
            <p className="text-xs text-slate-500">11-stage career telemetry with verified submission tracking</p>
          </div>
        </div>

        {/* View Switcher & Export */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {/* Kanban / Table toggle */}
          <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 p-0.5 text-xs">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition ${viewMode === 'kanban' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
            >
              <Kanban className="w-3.5 h-3.5" />
              Kanban
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition ${viewMode === 'table' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              Table
            </button>
          </div>

          <a
            href={api.getApplicationExportCsvUrl()}
            target="_blank"
            rel="noreferrer"
            download
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition shadow-sm ml-auto sm:ml-0"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </a>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <form onSubmit={handleSearchSubmit} className="glass-card p-3 flex flex-wrap items-center gap-3 text-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by company or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-medium"
        >
          <option value="all">All Pipeline Stages</option>
          {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </form>

      {/* View Content */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading application pipeline...</div>
      ) : applications.length === 0 ? (
        <div className="glass-card p-12 text-center space-y-3">
          <p className="text-xs text-slate-400">No applications tracked in this view.</p>
        </div>
      ) : viewMode === 'kanban' ? (
        /* Kanban Board View */
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-[1200px]">
            {ALL_STATUSES.map((status) => {
              const columnApps = applications.filter(a => a.status === status);
              return (
                <div key={status} className="w-72 shrink-0 bg-slate-50 dark:bg-slate-850/80 rounded-xl p-3 border border-slate-200/60 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200">{status}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      {columnApps.length}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {columnApps.map((app) => (
                      <div
                        key={app.id}
                        onClick={() => {
                          setSelectedApp(app);
                          setEditingNotes(app.notes || '');
                        }}
                        className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 cursor-pointer transition shadow-sm space-y-2"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1">
                            {app.job?.title || 'Target Position'}
                          </h4>
                        </div>
                        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Building className="w-3 h-3 text-slate-400" />
                          {app.job?.company || 'Organization'}
                        </p>

                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                          <span>{app.job?.location || 'Remote'}</span>
                          {app.submission_verified && (
                            <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                              <CheckCircle2 className="w-3 h-3" />
                              Verified
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Table List View */
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-850 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3.5">Company & Role</th>
                  <th className="p-3.5">Portal Source</th>
                  <th className="p-3.5">Status Stage</th>
                  <th className="p-3.5">Applied Date</th>
                  <th className="p-3.5">Follow-up</th>
                  <th className="p-3.5">Verified</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900 dark:text-white">{app.job?.title}</div>
                      <div className="text-slate-500 text-[11px]">{app.job?.company} • {app.job?.location}</div>
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-400">{app.job?.job_source}</td>
                    <td className="p-3.5">
                      <select
                        value={app.status}
                        onChange={(e) => handleUpdateStatus(app.id, e.target.value)}
                        className={`text-xs font-semibold px-2 py-1 rounded-md border ${getStatusColor(app.status)}`}
                      >
                        {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="p-3.5 text-slate-500">
                      {app.applied_date ? new Date(app.applied_date).toLocaleDateString() : '—'}
                    </td>
                    <td className="p-3.5 text-slate-500">
                      {app.follow_up_date ? new Date(app.follow_up_date).toLocaleDateString() : '—'}
                    </td>
                    <td className="p-3.5">
                      {app.submission_verified ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                          Verified
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Pending</span>
                      )}
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => {
                          setSelectedApp(app);
                          setEditingNotes(app.notes || '');
                        }}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 rounded"
                        title="View details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Application Details Drawer Modal */}
      {selectedApp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[90vh] rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-y-auto space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Application File</span>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">{selectedApp.job?.title}</h3>
                <p className="text-xs text-slate-500">{selectedApp.job?.company} • {selectedApp.job?.location}</p>
              </div>
              <button onClick={() => setSelectedApp(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stage Selector */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-850 text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Pipeline Stage:</span>
              <select
                value={selectedApp.status}
                onChange={(e) => handleUpdateStatus(selectedApp.id, e.target.value)}
                className={`font-semibold px-3 py-1 rounded-lg border ${getStatusColor(selectedApp.status)}`}
              >
                {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Autofill Trigger Banner */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-900 to-indigo-950 text-white flex items-center justify-between text-xs">
              <div>
                <span className="font-bold block">Browser-Assisted Autofill Assistant</span>
                <p className="text-[11px] text-indigo-200">Prepare form fields, review, and approve before submission.</p>
              </div>
              <button
                onClick={() => {
                  const target = selectedApp;
                  setSelectedApp(null);
                  onLaunchAutofill(target);
                }}
                className="px-3 py-1.5 rounded-lg bg-white text-indigo-950 font-bold hover:bg-indigo-50 transition"
              >
                Launch Assistant
              </button>
            </div>

            {/* Notes Section */}
            <div className="space-y-1.5 text-xs">
              <label className="font-semibold text-slate-800 dark:text-slate-200 block">Candidate Notes & Next Steps</label>
              <textarea
                rows={3}
                value={editingNotes}
                onChange={(e) => setEditingNotes(e.target.value)}
                placeholder="Interview notes, recruiter feedback, follow-up milestones..."
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
              <button
                onClick={handleSaveNotes}
                disabled={updating}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 disabled:opacity-50"
              >
                {updating ? 'Saving...' : 'Save Notes'}
              </button>
            </div>

            {/* Audit Timeline */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
              <span className="font-bold text-slate-800 dark:text-slate-200 block">Event Audit Timeline</span>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {selectedApp.events && selectedApp.events.map((ev, i) => (
                  <div key={i} className="p-2 rounded bg-slate-50 dark:bg-slate-850 border border-slate-200/50 dark:border-slate-800">
                    <div className="flex justify-between font-semibold text-slate-800 dark:text-slate-200">
                      <span>{ev.description}</span>
                      <span className="text-[10px] text-slate-400">{new Date(ev.event_date).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => handleDelete(selectedApp.id)}
                className="text-rose-500 hover:text-rose-700 text-xs font-semibold flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Application
              </button>
              <button
                onClick={() => setSelectedApp(null)}
                className="px-4 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
