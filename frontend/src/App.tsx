import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { HelpModal } from './components/layout/HelpModal';
import { DashboardView } from './components/dashboard/DashboardView';
import { JobsView } from './components/jobs/JobsView';
import { ResumeBuilderView } from './components/resumes/ResumeBuilderView';
import { CoverLetterView } from './components/coverletter/CoverLetterView';
import { ApplicationsTrackerView } from './components/applications/ApplicationsTrackerView';
import { InterviewsView } from './components/interviews/InterviewsView';
import { CareerRoadmapView } from './components/roadmap/CareerRoadmapView';
import { CareerAssistantView } from './components/assistant/CareerAssistantView';
import { ProfileView } from './components/profile/ProfileView';
import { SettingsView } from './components/settings/SettingsView';
import { AutofillModal } from './components/autofill/AutofillModal';
import { AuthModal } from './components/auth/AuthModal';
import { Application } from './types';

const MainApp: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('jobpilot_sidebar_collapsed') === 'true';
  });
  const [helpModalOpen, setHelpModalOpen] = useState<boolean>(false);

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('jobpilot_theme') === 'dark' ||
      (!('jobpilot_theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  // Cross-Tab Navigation States
  const [selectedJobIdForTailoring, setSelectedJobIdForTailoring] = useState<string | null>(null);
  const [activeAutofillApp, setActiveAutofillApp] = useState<Application | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('jobpilot_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('jobpilot_theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('jobpilot_sidebar_collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K: Help & Shortcuts
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setHelpModalOpen(prev => !prev);
      }
      // Cmd/Ctrl + J: AI Assistant
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setCurrentTab('assistant');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      setAuthModalOpen(true);
    }
  }, [loading, user]);

  const handleStartTailoring = (jobId: string) => {
    setSelectedJobIdForTailoring(jobId);
    setCurrentTab('resumes');
  };

  const handleStartApplication = (jobId: string) => {
    setSelectedJobIdForTailoring(jobId);
    setCurrentTab('applications');
  };

  const handleLaunchAutofill = (app: Application) => {
    setActiveAutofillApp(app);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B1020] flex flex-col items-center justify-center text-white p-4">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="w-12 h-12 border-4 border-[#635BFF] border-t-transparent rounded-full animate-spin" />
          <h2 className="text-xl font-bold tracking-tight">JobPilot AI</h2>
          <p className="text-sm text-slate-400">Initializing your career acceleration telemetry...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1020] flex transition-colors duration-200">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        onOpenHelp={() => setHelpModalOpen(true)}
        onOpenAuth={() => setAuthModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-64'}`}>
        <Header
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          setMobileOpen={setMobileOpen}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          onOpenSearch={() => setCurrentTab('jobs')}
          onOpenAuth={() => setAuthModalOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {currentTab === 'dashboard' && <DashboardView onNavigate={setCurrentTab} />}
          {currentTab === 'jobs' && (
            <JobsView
              initialMode="all"
              onStartTailoring={handleStartTailoring}
              onStartApplication={handleStartApplication}
            />
          )}
          {currentTab === 'matches' && (
            <JobsView
              initialMode="recommendations"
              onStartTailoring={handleStartTailoring}
              onStartApplication={handleStartApplication}
            />
          )}
          {currentTab === 'resumes' && (
            <ResumeBuilderView
              initialJobId={selectedJobIdForTailoring}
              onNavigateToJob={() => setCurrentTab('jobs')}
            />
          )}
          {currentTab === 'cover-letters' && <CoverLetterView />}
          {currentTab === 'applications' && (
            <ApplicationsTrackerView
              onLaunchAutofill={handleLaunchAutofill}
              onNavigateToJob={() => setCurrentTab('jobs')}
            />
          )}
          {currentTab === 'interviews' && <InterviewsView />}
          {currentTab === 'roadmap' && <CareerRoadmapView />}
          {currentTab === 'assistant' && <CareerAssistantView onNavigate={setCurrentTab} />}
          {currentTab === 'profile' && <ProfileView />}
          {currentTab === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Help & Shortcuts Modal */}
      <HelpModal
        isOpen={helpModalOpen}
        onClose={() => setHelpModalOpen(false)}
      />

      {/* Autofill Modal */}
      {activeAutofillApp && (
        <AutofillModal
          application={activeAutofillApp}
          onClose={() => setActiveAutofillApp(null)}
          onSuccess={() => {
            setActiveAutofillApp(null);
          }}
        />
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
};

export default App;
