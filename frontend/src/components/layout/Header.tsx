import React, { useState, useEffect } from 'react';
import {
  Menu, Bell, Moon, Sun, RefreshCw, CheckCheck, Sparkles, ExternalLink
} from 'lucide-react';
import { api } from '../../services/api';
import { NotificationItem } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  currentTab: string;
  setMobileOpen: (open: boolean) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setMobileOpen,
  darkMode,
  setDarkMode
}) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const fetchNotifs = async () => {
    if (!user) return;
    try {
      const data = await api.listNotifications();
      setNotifications(data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 45000);
    return () => clearInterval(interval);
  }, [user]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch {
      // ignore
    }
  };

  const handleTriggerDailySweep = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res: any = await api.triggerScheduledRun();
      setSyncMessage(`Sweep complete! Found ${res.search_summary?.found_jobs || 0} jobs, ${res.search_summary?.new_matches || 0} high matches.`);
      fetchNotifs();
      setTimeout(() => setSyncMessage(null), 6000);
    } catch (err: any) {
      setSyncMessage(`Sweep failed: ${err.message}`);
      setTimeout(() => setSyncMessage(null), 5000);
    } finally {
      setSyncing(false);
    }
  };

  const tabTitles: Record<string, string> = {
    dashboard: 'Platform Dashboard & Analytics',
    jobs: 'Find & Match Jobs across Portals',
    resumes: 'Master Resumes & AI Tailoring Engine',
    applications: 'Job Application Pipeline Tracker',
    interviews: 'Interview Schedule & Preparation Assistant',
    assistant: 'JobPilot AI Career Copilot',
    profile: 'Verified Master Profile & Credentials',
    settings: 'Settings, Automation & Security',
  };

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 lg:px-8 py-3.5">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Mobile Toggle & Page Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg lg:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              {tabTitles[currentTab] || 'JobPilot AI'}
            </h1>
            <p className="hidden md:block text-xs text-slate-500 dark:text-slate-400">
              Verified career telemetry • ATS optimization • Consent-gated application workflows
            </p>
          </div>
        </div>

        {/* Right: Actions, Notifications, Dark Mode */}
        <div className="flex items-center gap-2.5">
          {/* Automated sweep trigger */}
          <button
            onClick={handleTriggerDailySweep}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition disabled:opacity-50"
            title="Execute daily automated search sweep"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{syncing ? 'Scanning...' : 'Trigger Daily Sweep'}</span>
          </button>

          {/* Dark Mode Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowNotifMenu(!showNotifMenu)}
              className="relative p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
              )}
            </button>

            {showNotifMenu && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 overflow-hidden">
                <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-900 dark:text-white">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 font-bold px-1.5 py-0.5 rounded-full">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      Mark read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map(notif => (
                      <div
                        key={notif.id}
                        className={`p-3 text-xs transition hover:bg-slate-50 dark:hover:bg-slate-800/40 ${notif.is_read ? 'opacity-70' : 'bg-indigo-50/30 dark:bg-indigo-950/20'}`}
                      >
                        <p className="font-semibold text-slate-900 dark:text-white mb-0.5">{notif.title}</p>
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{notif.message}</p>
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sync Banner */}
      {syncMessage && (
        <div className="mt-2 py-1.5 px-3 rounded-lg bg-indigo-600 text-white text-xs flex items-center justify-between animate-fade-in shadow-md">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{syncMessage}</span>
          </div>
          <button onClick={() => setSyncMessage(null)} className="text-indigo-200 hover:text-white text-xs">Dismiss</button>
        </div>
      )}
    </header>
  );
};
