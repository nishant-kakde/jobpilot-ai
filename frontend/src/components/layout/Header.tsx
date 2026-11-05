import React, { useState, useEffect, useRef } from 'react';
import {
  Menu, Bell, Moon, Sun, RefreshCw, CheckCheck, Sparkles,
  Search, User, Settings, LogOut, ChevronDown, Check, ExternalLink
} from 'lucide-react';
import { api } from '../../services/api';
import { NotificationItem } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  setMobileOpen: (open: boolean) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  onOpenSearch?: () => void;
  onOpenAuth?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  setMobileOpen,
  darkMode,
  setDarkMode,
  onOpenSearch,
  onOpenAuth
}) => {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

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

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifMenu(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const tabTitles: Record<string, { title: string; subtitle: string }> = {
    dashboard: { title: 'Overview', subtitle: 'Career command telemetry & metrics' },
    jobs: { title: 'Find Jobs', subtitle: 'Multi-portal job discovery with explainable scoring' },
    matches: { title: 'AI Job Matches', subtitle: 'Curated roles evaluated against your 5-factor profile' },
    resumes: { title: 'Resume Studio', subtitle: 'Truth-preserving ATS optimization & export' },
    'cover-letters': { title: 'Cover Letter Generator', subtitle: 'Personalized letters grounded in verified experience' },
    applications: { title: 'My Applications', subtitle: '11-stage pipeline tracking with timeline audit logs' },
    interviews: { title: 'Interview Preparation', subtitle: 'Interactive studio with real-time STAR evaluation' },
    roadmap: { title: 'Career Roadmap', subtitle: 'Personalized 30/60/90-day learning & portfolio paths' },
    assistant: { title: 'AI Career Copilot', subtitle: 'Autonomous conversational career advisor' },
    profile: { title: 'User Profile', subtitle: 'Verified candidate credentials & compensation targets' },
    settings: { title: 'Platform Settings', subtitle: 'AI provider selection, automated sweep & security' },
  };

  const activeMeta = tabTitles[currentTab] || { title: 'JobPilot AI', subtitle: 'Autonomous AI Career Platform' };

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-[#111827]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-[#1E293B] px-4 lg:px-8 py-3 transition-colors">
      <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto w-full">
        {/* Left: Mobile Toggle & Page Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1E293B] transition"
            title="Open Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-[#F9FAFB] tracking-tight">
                {activeMeta.title}
              </h1>
            </div>
            <p className="hidden md:block text-[11px] text-slate-500 dark:text-[#94A3B8]">
              {activeMeta.subtitle}
            </p>
          </div>
        </div>

        {/* Center: Search Bar (Linear / Vercel style) */}
        <div className="hidden md:flex flex-1 max-w-md mx-4">
          <button
            onClick={() => {
              if (onOpenSearch) onOpenSearch();
              else setCurrentTab('jobs');
            }}
            className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-xl border border-slate-200/90 dark:border-[#1E293B] bg-slate-50/80 dark:bg-[#151E30]/70 text-slate-400 dark:text-slate-500 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-[#151E30] transition text-xs group"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition" />
              <span>Search jobs, skills, or ask AI...</span>
            </div>
            <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-700 text-slate-500 shadow-xs">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right: Actions, AI Copilot shortcut, Theme, Notifications, Profile */}
        <div className="flex items-center gap-2">
          {/* Automated sweep trigger */}
          <button
            onClick={handleTriggerDailySweep}
            disabled={syncing}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-[#151E30] text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-[#1E293B] hover:bg-slate-200/70 dark:hover:bg-[#1E293B] transition disabled:opacity-50"
            title="Execute daily automated search sweep"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#635BFF] dark:text-[#8B7CFF] ${syncing ? 'animate-spin' : ''}`} />
            <span className="hidden lg:inline">{syncing ? 'Sweeping...' : 'Daily Sweep'}</span>
          </button>

          {/* AI Career Copilot Shortcut */}
          <button
            onClick={() => setCurrentTab('assistant')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition ${
              currentTab === 'assistant'
                ? 'bg-[#635BFF] text-white border-[#635BFF] shadow-sm shadow-[#635BFF]/30'
                : 'bg-[#635BFF]/10 text-[#635BFF] dark:text-[#8B7CFF] border-[#635BFF]/20 hover:bg-[#635BFF]/15'
            }`}
            title="Launch AI Career Copilot"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ask AI</span>
          </button>

          {/* Dark / Light Mode Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1E293B] rounded-xl transition"
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* Notifications Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifMenu(!showNotifMenu)}
              className="relative p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1E293B] rounded-xl transition"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#635BFF] animate-pulse" />
              )}
            </button>

            {showNotifMenu && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-[#151E30] border border-slate-200 dark:border-[#1E293B] shadow-2xl z-50 overflow-hidden animate-in fade-in duration-150">
                <div className="p-3.5 border-b border-slate-100 dark:border-[#1E293B] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                      Notifications
                    </span>
                    {unreadCount > 0 && (
                      <span className="text-[10px] bg-[#635BFF]/10 text-[#635BFF] dark:text-[#8B7CFF] font-bold px-2 py-0.5 rounded-full">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs text-[#635BFF] dark:text-[#8B7CFF] hover:underline flex items-center gap-1 font-semibold"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      Mark read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-[#1E293B]/60 text-xs">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`p-3.5 transition flex gap-3 ${
                          notif.is_read
                            ? 'bg-transparent text-slate-500'
                            : 'bg-[#635BFF]/5 dark:bg-[#635BFF]/10 text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        <div className="w-2 h-2 rounded-full bg-[#635BFF] mt-1.5 shrink-0" />
                        <div className="flex-1 space-y-0.5">
                          <p className="font-semibold text-xs leading-snug">{notif.title}</p>
                          <p className="text-[11px] text-slate-500 leading-normal">{notif.message}</p>
                          <span className="text-[9px] text-slate-400 block pt-1">
                            {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 p-1 pl-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-[#1E293B] transition"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#635BFF] to-[#8B7CFF] text-white font-bold flex items-center justify-center text-xs shadow-xs">
                {user ? user.full_name.charAt(0).toUpperCase() : 'G'}
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-[#151E30] border border-slate-200 dark:border-[#1E293B] shadow-2xl z-50 overflow-hidden animate-in fade-in duration-150">
                <div className="p-3.5 border-b border-slate-100 dark:border-[#1E293B]">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {user ? user.full_name : 'Guest User'}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {user ? user.email : 'guest@jobpilot.ai'}
                  </p>
                </div>

                <div className="p-1.5 space-y-0.5 text-xs">
                  <button
                    onClick={() => {
                      setCurrentTab('profile');
                      setShowProfileMenu(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1E293B] transition font-medium"
                  >
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>My Profile</span>
                  </button>

                  <button
                    onClick={() => {
                      setCurrentTab('settings');
                      setShowProfileMenu(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1E293B] transition font-medium"
                  >
                    <Settings className="w-3.5 h-3.5 text-slate-400" />
                    <span>Settings</span>
                  </button>
                </div>

                <div className="p-1.5 border-t border-slate-100 dark:border-[#1E293B]">
                  {user ? (
                    <button
                      onClick={() => {
                        logout();
                        setShowProfileMenu(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition font-medium text-xs"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        if (onOpenAuth) onOpenAuth();
                        setShowProfileMenu(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[#635BFF] hover:bg-[#635BFF]/10 transition font-semibold text-xs"
                    >
                      <span>Sign In</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sync Notification Banner */}
      {syncMessage && (
        <div className="max-w-7xl mx-auto px-4 mt-2">
          <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800 text-xs text-indigo-700 dark:text-indigo-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#635BFF]" />
              <span>{syncMessage}</span>
            </div>
            <button onClick={() => setSyncMessage(null)} className="text-slate-400 hover:text-slate-600">
              Dismiss
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
