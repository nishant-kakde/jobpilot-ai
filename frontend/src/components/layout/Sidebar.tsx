import React from 'react';
import {
  LayoutDashboard, Search, Sparkles, Briefcase, FileText,
  Mail, Calendar, Milestone, Settings, HelpCircle,
  UserCheck, LogOut, ChevronLeft, ChevronRight, ShieldCheck,
  Compass, ExternalLink
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  onOpenHelp?: () => void;
  onOpenAuth?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  mobileOpen,
  setMobileOpen,
  collapsed,
  setCollapsed,
  onOpenHelp,
  onOpenAuth
}) => {
  const { user, logout } = useAuth();

  const mainNav = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'jobs', label: 'Find Jobs', icon: Search, badge: 'Live' },
    { id: 'matches', label: 'AI Job Matches', icon: Sparkles, badge: 'AI' },
    { id: 'applications', label: 'My Applications', icon: Briefcase },
    { id: 'resumes', label: 'Resume Studio', icon: FileText, badge: 'ATS' },
    { id: 'cover-letters', label: 'Cover Letter Generator', icon: Mail },
    { id: 'assistant', label: 'AI Career Copilot', icon: Sparkles, highlight: true },
    { id: 'interviews', label: 'Interview Preparation', icon: Calendar },
    { id: 'roadmap', label: 'Career Roadmap', icon: Milestone, badge: 'Path' },
  ];

  const bottomNav = [
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'profile', label: 'User Profile', icon: UserCheck },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-200"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 bottom-0 z-50 bg-white dark:bg-[#111827] border-r border-slate-200/90 dark:border-[#1E293B]
          flex flex-col transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
          ${mobileOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'}
          ${collapsed ? 'lg:w-[72px]' : 'lg:w-64'}
        `}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-100 dark:border-[#1E293B] flex items-center justify-between min-h-[64px]">
          <div
            onClick={() => {
              setCurrentTab('dashboard');
              setMobileOpen(false);
            }}
            className="flex items-center gap-3 cursor-pointer select-none overflow-hidden"
          >
            {/* Linear-styled Brand Logo Mark */}
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#635BFF] via-[#7B73FF] to-[#8B7CFF] flex items-center justify-center text-white shadow-sm shadow-[#635BFF]/30 shrink-0">
              <Compass className="w-5 h-5 text-white" />
            </div>

            {!collapsed && (
              <div className="transition-opacity duration-200">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-base text-slate-900 dark:text-[#F9FAFB] tracking-tight">JobPilot</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-[#635BFF]/10 text-[#635BFF] dark:text-[#8B7CFF] border border-[#635BFF]/20">AI</span>
                </div>
                <p className="text-[11px] text-slate-400 dark:text-[#94A3B8] font-medium leading-none">Autonomous Career</p>
              </div>
            )}
          </div>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1E293B] transition"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto overflow-x-hidden">
          {!collapsed && (
            <div className="px-2 pb-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Navigation
            </div>
          )}

          {mainNav.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentTab(item.id);
                  setMobileOpen(false);
                }}
                title={collapsed ? item.label : undefined}
                className={`
                  w-full flex items-center rounded-xl text-xs font-semibold transition-all duration-150 group relative
                  ${collapsed ? 'justify-center px-0 py-2.5' : 'justify-between px-3 py-2.5'}
                  ${isActive
                    ? 'bg-[#635BFF] text-white shadow-sm shadow-[#635BFF]/30'
                    : 'text-slate-600 dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-[#151E30] hover:text-slate-900 dark:hover:text-[#F9FAFB]'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 shrink-0 ${
                    isActive
                      ? 'text-white'
                      : item.highlight
                        ? 'text-[#635BFF] dark:text-[#8B7CFF]'
                        : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300'
                  }`} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </div>

                {!collapsed && item.badge && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 dark:bg-[#1E293B] text-slate-500 dark:text-slate-400'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Section Divider */}
          <div className="pt-2 pb-1 border-t border-slate-100 dark:border-[#1E293B]/70 my-2" />

          {!collapsed && (
            <div className="px-2 pb-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Preferences
            </div>
          )}

          {bottomNav.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentTab(item.id);
                  setMobileOpen(false);
                }}
                title={collapsed ? item.label : undefined}
                className={`
                  w-full flex items-center rounded-xl text-xs font-semibold transition-all duration-150 group
                  ${collapsed ? 'justify-center px-0 py-2.5' : 'justify-between px-3 py-2.5'}
                  ${isActive
                    ? 'bg-[#635BFF] text-white shadow-sm shadow-[#635BFF]/30'
                    : 'text-slate-600 dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-[#151E30] hover:text-slate-900 dark:hover:text-[#F9FAFB]'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300'}`} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </div>
              </button>
            );
          })}

          {/* Help & Support Trigger */}
          <button
            onClick={() => {
              if (onOpenHelp) onOpenHelp();
              setMobileOpen(false);
            }}
            title={collapsed ? 'Help & Support' : undefined}
            className={`
              w-full flex items-center rounded-xl text-xs font-semibold transition-all duration-150 group
              ${collapsed ? 'justify-center px-0 py-2.5' : 'justify-between px-3 py-2.5'}
              text-slate-600 dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-[#151E30] hover:text-slate-900 dark:hover:text-[#F9FAFB]
            `}
          >
            <div className="flex items-center gap-3">
              <HelpCircle className="w-4 h-4 shrink-0 text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300" />
              {!collapsed && <span className="truncate">Help & Support</span>}
            </div>
            {!collapsed && (
              <kbd className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#1E293B] text-slate-400">
                ⌘K
              </kbd>
            )}
          </button>
        </nav>

        {/* User Card & Authentication */}
        <div className="p-3 border-t border-slate-100 dark:border-[#1E293B]">
          <div className={`flex items-center rounded-xl bg-slate-50 dark:bg-[#151E30] border border-slate-200/60 dark:border-[#1E293B] ${collapsed ? 'p-2 justify-center' : 'p-2.5 justify-between'}`}>
            <div
              onClick={() => setCurrentTab('profile')}
              className="flex items-center gap-2.5 overflow-hidden cursor-pointer flex-1"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#635BFF] to-[#8B7CFF] text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-sm shadow-[#635BFF]/30">
                {user ? user.full_name.charAt(0).toUpperCase() : 'G'}
              </div>
              {!collapsed && (
                <div className="truncate">
                  <p className="text-xs font-bold text-slate-900 dark:text-[#F9FAFB] truncate">
                    {user ? user.full_name : 'Guest User'}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-[#94A3B8] truncate">
                    {user ? user.email : 'Click to Sign In'}
                  </p>
                </div>
              )}
            </div>

            {!collapsed && (
              user ? (
                <button
                  onClick={logout}
                  title="Sign out"
                  className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-white dark:hover:bg-[#1E293B] transition shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={onOpenAuth}
                  className="text-xs font-semibold text-[#635BFF] hover:underline shrink-0"
                >
                  Sign In
                </button>
              )
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
