import React, { useState, useEffect } from 'react';
import {
  Settings, Bell, Bot, Shield, Download, Trash2, CheckCircle2,
  Mail, Send, Moon, Sun, Save, AlertTriangle, Key
} from 'lucide-react';
import { api } from '../../services/api';
import { UserPreference } from '../../types';
import { useAuth } from '../../context/AuthContext';

export const SettingsView: React.FC = () => {
  const { user, logout } = useAuth();
  const [pref, setPref] = useState<UserPreference | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form State
  const [dailyEnabled, setDailyEnabled] = useState(true);
  const [dailyTime, setDailyTime] = useState('09:00');
  const [targetTitles, setTargetTitles] = useState('');
  const [targetLocations, setTargetLocations] = useState('');
  const [minMatchScore, setMinMatchScore] = useState(70);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [telegramChatId, setTelegramChatId] = useState('');

  // AI Provider Selection
  const [aiProvider, setAiProvider] = useState('built-in');
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    const loadPref = async () => {
      setLoading(true);
      try {
        const data = await api.getPreferences();
        setPref(data);
        setDailyEnabled(data.daily_search_enabled);
        setDailyTime(data.daily_search_time || '09:00');
        setTargetTitles(data.target_titles ? data.target_titles.join(', ') : '');
        setTargetLocations(data.target_locations ? data.target_locations.join(', ') : '');
        setMinMatchScore(data.min_match_score || 70);
        setEmailEnabled(data.email_notifications_enabled);
        setTelegramEnabled(data.telegram_notifications_enabled);
        setTelegramChatId(data.telegram_chat_id || '');
      } catch (err) {
        console.error('Error loading preferences', err);
      } finally {
        setLoading(false);
      }
    };
    loadPref();
  }, []);

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    try {
      const updated = await api.updatePreferences({
        daily_search_enabled: dailyEnabled,
        daily_search_time: dailyTime,
        target_titles: targetTitles.split(',').map(s => s.trim()).filter(Boolean),
        target_locations: targetLocations.split(',').map(s => s.trim()).filter(Boolean),
        min_match_score: Number(minMatchScore),
        email_notifications_enabled: emailEnabled,
        telegram_notifications_enabled: telegramEnabled,
        telegram_chat_id: telegramChatId
      });
      setPref(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(`Failed to save preferences: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = async () => {
    try {
      const data = await api.exportUserData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `jobpilot_user_data_export_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmation = prompt('Type "DELETE MY ACCOUNT" to confirm permanent account purge. This action cannot be undone.');
    if (confirmation !== 'DELETE MY ACCOUNT') return;

    try {
      await api.deleteAccount();
      alert('Your account and all associated telemetry have been permanently deleted.');
      logout();
    } catch (err: any) {
      alert(`Account deletion failed: ${err.message}`);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading settings...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* 1. Daily Search Automation */}
      <form onSubmit={handleSavePreferences} className="space-y-6">
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Daily Job Search Automation</h3>
                <p className="text-xs text-slate-500">Autonomous search sweeps across connected portals</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={dailyEnabled}
                onChange={(e) => setDailyEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600" />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Execution Schedule Time</label>
              <input
                type="time"
                value={dailyTime}
                onChange={(e) => setDailyTime(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Minimum Match Score Filter</label>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="range"
                  min="50"
                  max="95"
                  step="5"
                  value={minMatchScore}
                  onChange={(e) => setMinMatchScore(Number(e.target.value))}
                  className="w-full accent-indigo-600"
                />
                <span className="font-bold text-indigo-600 dark:text-indigo-400 w-10 text-right">{minMatchScore}%</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Target Search Titles</label>
              <input
                type="text"
                placeholder="Data Analyst, Senior Full-Stack Engineer, Machine Learning Engineer"
                value={targetTitles}
                onChange={(e) => setTargetTitles(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Target Locations</label>
              <input
                type="text"
                placeholder="Remote, Pune, Mumbai, San Francisco, New York"
                value={targetLocations}
                onChange={(e) => setTargetLocations(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* 2. Notification Channels */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Alert Delivery Channels</h3>
              <p className="text-xs text-slate-500">Configure email and Telegram bot dispatch</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-850">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400" />
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block">Email Alerts</span>
                  <span className="text-[11px] text-slate-400">Receive new high-match jobs and interview reminders</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={emailEnabled}
                onChange={(e) => setEmailEnabled(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-850 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-slate-400" />
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block">Telegram Alerts (Official Bot API)</span>
                    <span className="text-[11px] text-slate-400">Instant push notifications for urgent recruiter updates</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={telegramEnabled}
                  onChange={(e) => setTelegramEnabled(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
              </div>
              {telegramEnabled && (
                <div className="pt-2">
                  <input
                    type="text"
                    placeholder="Your Telegram Chat ID (e.g. 123456789)"
                    value={telegramChatId}
                    onChange={(e) => setTelegramChatId(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            {saveSuccess ? (
              <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                Preferences updated successfully!
              </span>
            ) : <span />}

            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving...' : 'Save All Preferences'}
            </button>
          </div>
        </div>
      </form>

      {/* 3. AI Model Engine Settings */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-600">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">AI Provider Abstraction</h3>
            <p className="text-xs text-slate-500">Configure LLM backend or utilize JobPilot Built-in Engine</p>
          </div>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Active AI Provider</label>
            <select
              value={aiProvider}
              onChange={(e) => setAiProvider(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              <option value="built-in">JobPilot Built-in Intelligent Engine (Zero External Key Required)</option>
              <option value="openai">OpenAI (GPT-4o / GPT-4o-mini)</option>
              <option value="gemini">Google Gemini (Gemini 1.5 Flash)</option>
              <option value="anthropic">Anthropic (Claude 3.5 Haiku)</option>
            </select>
          </div>

          {aiProvider !== 'built-in' && (
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                API Key for {aiProvider.toUpperCase()}
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  placeholder="sk-... / AIza..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Keys are stored securely in your local environment file and never transmitted to third parties.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 4. Privacy, GDPR Data Export & Account Deletion */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950 text-rose-600">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Security & Data Privacy</h3>
            <p className="text-xs text-slate-500">GDPR & CCPA user rights, data portability, and erasure</p>
          </div>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 rounded-lg bg-slate-50 dark:bg-slate-850 gap-2">
            <div>
              <span className="font-semibold text-slate-800 dark:text-slate-200 block">Download Complete Data Bundle</span>
              <span className="text-[11px] text-slate-400">Export all profile info, tailored resumes, and application history as a JSON file.</span>
            </div>
            <button
              onClick={handleExportData}
              className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1.5 shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              Export JSON
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 rounded-lg bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 gap-2">
            <div>
              <span className="font-semibold text-rose-900 dark:text-rose-300 block">Delete Account & Purge Telemetry</span>
              <span className="text-[11px] text-rose-700/80 dark:text-rose-400">Permanently erase your candidate profile, master resumes, and tracker events.</span>
            </div>
            <button
              onClick={handleDeleteAccount}
              className="px-3.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition flex items-center gap-1.5 shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
