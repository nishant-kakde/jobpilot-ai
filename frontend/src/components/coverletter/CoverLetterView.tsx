import React, { useState, useEffect } from 'react';
import {
  FileText, Sparkles, Copy, Check, Trash2, Edit3, Save, Download,
  Building, Briefcase, Plus, RefreshCw, Send, ShieldCheck
} from 'lucide-react';
import { api } from '../../services/api';
import { CoverLetter, Job } from '../../types';
import { useAuth } from '../../context/AuthContext';

export const CoverLetterView: React.FC = () => {
  const { user } = useAuth();
  const [letters, setLetters] = useState<CoverLetter[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLetter, setSelectedLetter] = useState<CoverLetter | null>(null);

  // Form State
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [company, setCompany] = useState<string>('');
  const [position, setPosition] = useState<string>('');
  const [tone, setTone] = useState<string>('Professional');
  const [customInstructions, setCustomInstructions] = useState<string>('');
  const [generating, setGenerating] = useState(false);

  // Edit / Copy State
  const [editText, setEditText] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [lettersData, jobsData] = await Promise.all([
        api.listCoverLetters().catch(() => []),
        api.listJobs().catch(() => [])
      ]);
      setLetters(lettersData);
      setJobs(jobsData);
      if (lettersData.length > 0 && !selectedLetter) {
        setSelectedLetter(lettersData[0]);
        setEditText(lettersData[0].letter_text);
      }
    } catch (err) {
      console.error('Error loading cover letters', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    if (selectedJobId) {
      const found = jobs.find(j => j.id === selectedJobId);
      if (found) {
        setCompany(found.company);
        setPosition(found.title);
      }
    }
  }, [selectedJobId, jobs]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim() || !position.trim()) return;
    setGenerating(true);
    try {
      const payload: any = {
        tone,
        custom_instructions: customInstructions.trim() || undefined
      };
      if (selectedJobId) {
        payload.job_id = selectedJobId;
      }
      const created = await api.generateCoverLetter(payload);
      setLetters([created, ...letters]);
      setSelectedLetter(created);
      setEditText(created.letter_text);
    } catch (err: any) {
      alert(`Cover letter generation error: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedLetter) return;
    setSaving(true);
    try {
      const updated = await api.updateCoverLetter(selectedLetter.id, {
        letter_text: editText
      });
      setSelectedLetter(updated);
      setLetters(prev => prev.map(l => l.id === updated.id ? updated : l));
      alert('Cover letter saved!');
    } catch (err: any) {
      alert(`Save error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this cover letter?')) return;
    try {
      await api.deleteCoverLetter(id);
      const remaining = letters.filter(l => l.id !== id);
      setLetters(remaining);
      if (selectedLetter?.id === id) {
        setSelectedLetter(remaining[0] || null);
        setEditText(remaining[0]?.letter_text || '');
      }
    } catch (err: any) {
      alert(`Delete error: ${err.message}`);
    }
  };

  const handleCopy = () => {
    if (!editText) return;
    navigator.clipboard.writeText(editText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!selectedLetter || !editText) return;
    const blob = new Blob([editText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Cover_Letter_${selectedLetter.company.replace(/\s+/g, '_')}_${selectedLetter.position.replace(/\s+/g, '_')}.txt`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-3 border-[#635BFF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header Card */}
      <div className="glass-card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-[#635BFF]/10 text-[#635BFF] dark:text-[#8B7CFF]">
              <FileText className="w-4 h-4" />
            </span>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">AI Cover Letter Generator</h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-[#635BFF]/10 text-[#635BFF] dark:text-[#8B7CFF]">
              Grounded in Master Profile
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Create tailored, persuasive cover letters matching job descriptions with authentic verified credentials.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Anti-Hallucination Guard Active</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Generator Form & History */}
        <div className="lg:col-span-5 space-y-6">
          {/* Generation Form */}
          <form onSubmit={handleGenerate} className="glass-card p-5 space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#635BFF]" />
              Generate New Letter
            </h3>

            {/* Select from indexed jobs */}
            {jobs.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Select Target Job (Optional)
                </label>
                <select
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#1E293B] bg-white dark:bg-[#111827] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#635BFF]"
                >
                  <option value="">-- Choose from indexed jobs --</option>
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title} • {j.company} {j.match ? `(${j.match.overall_score}% match)` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Company</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Stripe, Linear"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#1E293B] bg-white dark:bg-[#111827] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#635BFF]"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Position</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Data Analyst"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#1E293B] bg-white dark:bg-[#111827] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#635BFF]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Letter Tone</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {['Professional', 'Conversational', 'Enthusiastic', 'Executive'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTone(t)}
                    className={`py-2 px-3 rounded-lg border text-left font-medium transition ${
                      tone === t
                        ? 'border-[#635BFF] bg-[#635BFF]/10 text-[#635BFF] dark:text-[#8B7CFF]'
                        : 'border-slate-200 dark:border-[#1E293B] text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Custom Focus / Instructions (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Highlight my leadership on scalable ETL pipelines and cross-functional dashboard delivery..."
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#1E293B] bg-white dark:bg-[#111827] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#635BFF]"
              />
            </div>

            <button
              type="submit"
              disabled={generating}
              className="w-full py-2.5 rounded-xl btn-primary flex items-center justify-center gap-2 text-xs font-semibold disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {generating ? 'Drafting Cover Letter...' : 'Generate Grounded Cover Letter'}
            </button>
          </form>

          {/* Saved Letters List */}
          <div className="glass-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Saved Cover Letters</h3>
              <span className="text-[11px] text-slate-400">{letters.length} saved</span>
            </div>

            {letters.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">No cover letters generated yet.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {letters.map((letItem) => {
                  const isSelected = selectedLetter?.id === letItem.id;
                  return (
                    <div
                      key={letItem.id}
                      onClick={() => {
                        setSelectedLetter(letItem);
                        setEditText(letItem.letter_text);
                      }}
                      className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                        isSelected
                          ? 'border-[#635BFF] bg-[#635BFF]/5 dark:bg-[#635BFF]/10'
                          : 'border-slate-200/80 dark:border-[#1E293B] hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="overflow-hidden mr-2">
                        <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white truncate">
                          <span>{letItem.company}</span>
                          <span className="text-slate-400 font-normal">• {letItem.position}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-slate-400">
                            {new Date(letItem.created_at).toLocaleDateString()}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium">
                            {letItem.tone}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(letItem.id);
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-500 transition rounded"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Letter Editor & Actions */}
        <div className="lg:col-span-7 space-y-4">
          {selectedLetter ? (
            <div className="glass-card p-5 space-y-4">
              {/* Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-[#1E293B] pb-3">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    {selectedLetter.company} — {selectedLetter.position}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Tone: <span className="font-semibold">{selectedLetter.tone}</span> • Word count: {editText.split(/\s+/).filter(Boolean).length}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#1E293B] bg-white dark:bg-[#111827] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>

                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#1E293B] bg-white dark:bg-[#111827] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>TXT</span>
                  </button>

                  <button
                    onClick={handleSaveEdit}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg btn-primary text-xs font-semibold"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </div>
              </div>

              {/* Key points highlighted */}
              {selectedLetter.key_points_highlighted && selectedLetter.key_points_highlighted.length > 0 && (
                <div className="p-3 rounded-xl bg-[#635BFF]/5 dark:bg-[#635BFF]/10 border border-[#635BFF]/20 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[#635BFF] dark:text-[#8B7CFF] block">
                    Verified Competencies Highlighted:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedLetter.key_points_highlighted.map((kp, idx) => (
                      <span key={idx} className="text-[11px] px-2 py-0.5 rounded bg-white dark:bg-[#151E30] text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-slate-800 font-medium">
                        {kp}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Textarea */}
              <div className="relative">
                <textarea
                  rows={18}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full p-4 rounded-xl border border-slate-200 dark:border-[#1E293B] bg-white dark:bg-[#111827] text-slate-900 dark:text-white font-mono text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#635BFF]"
                />
              </div>
            </div>
          ) : (
            <div className="glass-card p-12 text-center text-slate-400 space-y-2">
              <FileText className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700" />
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">No cover letter selected</h4>
              <p className="text-xs">Select a saved letter or generate a new tailored draft from the left panel.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

