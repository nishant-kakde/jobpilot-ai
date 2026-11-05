import React, { useState, useEffect } from 'react';
import {
  Settings, Bell, Bot, Shield, Download, Trash2, CheckCircle2,
  Mail, Send, Save, AlertTriangle, Key, Cpu, Zap, Coins,
  BarChart3, ShieldCheck, RefreshCw, Sparkles, Lock
} from 'lucide-react';
import { api } from '../../services/api';
import { UserPreference, AIProviderSetting, AIUsageStats } from '../../types';
import { useAuth } from '../../context/AuthContext';

export const SettingsView: React.FC = () => {
  const { user, logout } = useAuth();
  const [pref, setPref] = useState<UserPreference | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Preference Form State
  const [dailyEnabled, setDailyEnabled] = useState(true);
  const [dailyTime, setDailyTime] = useState('09:00');
  const [targetTitles, setTargetTitles] = useState('');
  const [targetLocations, setTargetLocations] = useState('');
  const [minMatchScore, setMinMatchScore] = useState(70);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [telegramChatId, setTelegramChatId] = useState('');

  // AI Provider & Settings State
  const [aiSetting, setAiSetting] = useState<AIProviderSetting | null>(null);
  const [aiUsage, setAiUsage] = useState<AIUsageStats | null>(null);
  const [aiProvider, setAiProvider] = useState<'built-in' | 'openai' | 'gemini' | 'anthropic'>('built-in');
  const [openaiModel, setOpenaiModel] = useState('gpt-4o-mini');
  const [geminiModel, setGeminiModel] = useState('gemini-1.5-flash');
  const [anthropicModel, setAnthropicModel] = useState('claude-3-5-haiku-20241022');
  const [customApiKey, setCustomApiKey] = useState('');
  const [savingAI, setSavingAI] = useState(false);
  const [aiSaveSuccess, setAiSaveSuccess] = useState(false);

  const loadData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [prefData, aiSettingData, aiUsageData] = await Promise.all([
        api.getPreferences(),
        api.getAISettings().catch(() => null),
        api.getAIUsageStats().catch(() => null)
      ]);

      if (prefData) {
        setPref(prefData);
        setDailyEnabled(prefData.daily_search_enabled);
        setDailyTime(prefData.daily_search_time || '09:00');
        setTargetTitles(prefData.target_titles ? prefData.target_titles.join(', ') : '');
        setTargetLocations(prefData.target_locations ? prefData.target_locations.join(', ') : '');
        setMinMatchScore(prefData.min_match_score || 70);
        setEmailEnabled(prefData.email_notifications_enabled);
        setTelegramEnabled(prefData.telegram_notifications_enabled);
        setTelegramChatId(prefData.telegram_chat_id || '');
      }

      if (aiSettingData) {
        setAiSetting(aiSettingData);
        setAiProvider(aiSettingData.selected_provider || 'built-in');
        if (aiSettingData.openai_model) setOpenaiModel(aiSettingData.openai_model);
        if (aiSettingData.gemini_model) setGeminiModel(aiSettingData.gemini_model);
        if (aiSettingData.anthropic_model) setAnthropicModel(aiSettingData.anthropic_model);
      }

      if (aiUsageData) {
        setAiUsage(aiUsageData);
      }
    } catch (err) {
      console.error('Error loading settings', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

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

  const handleSaveAISettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAI(true);
    setAiSaveSuccess(false);
    try {
      const updated = await api.updateAISettings({
        selected_provider: aiProvider,
        openai_model: openaiModel,
        gemini_model: geminiModel,
        anthropic_model: anthropicModel,
        custom_api_key: customApiKey.trim() || undefined
      });
      setAiSetting(updated);
      setCustomApiKey(''); // Clear for security
      setAiSaveSuccess(true);
      setTimeout(() => setAiSaveSuccess(false), 3000);
      const usage = await api.getAIUsageStats().catch(() => null);
      if (usage) setAiUsage(usage);
    } catch (err: any) {
      alert(`Failed to save AI configuration: ${err.message}`);
    } finally {
      setSavingAI(false);
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
    return <div className="p-12 text-center text-xs text-slate-400">Loading settings and telemetry...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl pb-12">
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

      {/* 3. AI Provider Engine & Model Configuration */}
      <form onSubmit={handleSaveAISettings} className="glass-card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-600">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Unified AI Intelligence Engine</h3>
              <p className="text-xs text-slate-500">Configure LLM providers, active models, and secure API keys</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/60">
            <Sparkles className="w-3 h-3 text-indigo-500" />
            Active: {aiSetting?.selected_provider?.toUpperCase() || 'BUILT-IN'}
          </div>
        </div>

        <div className="space-y-4 text-xs">
          {/* Provider Selection Cards */}
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-2">Select Primary AI Provider</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {[
                { id: 'built-in', name: 'Built-in AI', desc: 'Deterministic 5-factor matching & heuristic engine. Zero API key needed.', badge: 'No Key Needed' },
                { id: 'openai', name: 'OpenAI', desc: 'GPT-4o & GPT-4o-mini reasoning with structured schema extraction.', badge: 'GPT-4o' },
                { id: 'gemini', name: 'Google Gemini', desc: 'Gemini 1.5 Flash for high-speed multi-turn career context.', badge: '1.5 Flash' },
                { id: 'anthropic', name: 'Anthropic', desc: 'Claude 3.5 Haiku / Sonnet with nuanced analytical resume evaluation.', badge: 'Claude 3.5' },
              ].map((prov) => {
                const isSelected = aiProvider === prov.id;
                return (
                  <button
                    key={prov.id}
                    type="button"
                    onClick={() => setAiProvider(prov.id as any)}
                    className={`p-3 rounded-xl text-left border transition flex flex-col justify-between ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 ring-1 ring-indigo-600'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-900 dark:text-white text-xs">{prov.name}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                          isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}>
                          {prov.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-snug">{prov.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Model Customization */}
          {aiProvider === 'openai' && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 space-y-2">
              <label className="font-semibold text-slate-700 dark:text-slate-300 block">OpenAI Model</label>
              <select
                value={openaiModel}
                onChange={(e) => setOpenaiModel(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                <option value="gpt-4o-mini">gpt-4o-mini (Cost-efficient, ultra fast recommended)</option>
                <option value="gpt-4o">gpt-4o (State-of-the-art multimodal reasoning)</option>
                <option value="o1-mini">o1-mini (Complex step-by-step logic)</option>
              </select>
            </div>
          )}

          {aiProvider === 'gemini' && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 space-y-2">
              <label className="font-semibold text-slate-700 dark:text-slate-300 block">Google Gemini Model</label>
              <select
                value={geminiModel}
                onChange={(e) => setGeminiModel(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                <option value="gemini-1.5-flash">gemini-1.5-flash (Low latency, high throughput recommended)</option>
                <option value="gemini-1.5-pro">gemini-1.5-pro (Extended context window)</option>
              </select>
            </div>
          )}

          {aiProvider === 'anthropic' && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 space-y-2">
              <label className="font-semibold text-slate-700 dark:text-slate-300 block">Anthropic Claude Model</label>
              <select
                value={anthropicModel}
                onChange={(e) => setAnthropicModel(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                <option value="claude-3-5-haiku-20241022">claude-3-5-haiku-20241022 (Fast & crisp)</option>
                <option value="claude-3-5-sonnet-20241022">claude-3-5-sonnet-20241022 (High precision analysis)</option>
              </select>
            </div>
          )}

          {/* Secure Custom Key Input */}
          {aiProvider !== 'built-in' && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Custom {aiProvider.toUpperCase()} API Key (Optional)
                </label>
                {aiSetting?.has_custom_api_key ? (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Custom Key Saved & Encrypted
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400">
                    Using backend .env fallback key if present
                  </span>
                )}
              </div>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  placeholder={aiSetting?.has_custom_api_key ? '••••••••••••••••••••••••••••••••' : 'sk-... or AIza...'}
                  value={customApiKey}
                  onChange={(e) => setCustomApiKey(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-xs"
                />
              </div>
              <p className="text-[10px] text-slate-400">
                User keys are AES-256 encrypted in database and never transmitted to client or third parties.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2">
          {aiSaveSuccess ? (
            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              AI configuration saved and activated!
            </span>
          ) : <span />}

          <button
            type="submit"
            disabled={savingAI}
            className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {savingAI ? 'Saving...' : 'Activate AI Provider'}
          </button>
        </div>
      </form>

      {/* 4. AI Usage Telemetry & Cost Analytics */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-600">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">AI Consumption & Cost Telemetry</h3>
              <p className="text-xs text-slate-500">Live token usage, call metrics, and estimated API expenses</p>
            </div>
          </div>
          <button
            type="button"
            onClick={async () => {
              const usage = await api.getAIUsageStats().catch(() => null);
              if (usage) setAiUsage(usage);
            }}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Refresh Usage Metrics"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <Zap className="w-3.5 h-3.5 text-indigo-500" />
              <span className="text-[11px] font-semibold uppercase">Total AI Calls</span>
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white">
              {aiUsage?.total_generations_count || 0}
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Autonomous orchestrations</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <Cpu className="w-3.5 h-3.5 text-purple-500" />
              <span className="text-[11px] font-semibold uppercase">Tokens Consumed</span>
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white">
              {(aiUsage?.total_tokens_consumed || 0).toLocaleString()}
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Input context + outputs</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <Coins className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-[11px] font-semibold uppercase">Estimated Cost</span>
            </div>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              ${(aiUsage?.total_estimated_cost_usd || 0).toFixed(4)}
            </div>
            <p className="text-[10px] text-slate-500 mt-1">USD equivalent pricing</p>
          </div>
        </div>

        {/* Prompt Type Breakdown */}
        {aiUsage?.breakdown_by_prompt_type && Object.keys(aiUsage.breakdown_by_prompt_type).length > 0 && (
          <div className="pt-2">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-2">Usage by Module</span>
            <div className="flex flex-wrap gap-2">
              {Object.entries(aiUsage.breakdown_by_prompt_type).map(([type, count]) => (
                <div key={type} className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <span className="capitalize">{type.replace(/_/g, ' ')}:</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 5. Privacy, GDPR Data Export & Account Deletion */}
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
