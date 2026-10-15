import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardView } from './components/dashboard/DashboardView';
import { JobsView } from './components/jobs/JobsView';
import { ResumeBuilderView } from './components/resumes/ResumeBuilderView';
import { ApplicationsTrackerView } from './components/applications/ApplicationsTrackerView';
import { InterviewsView } from './components/interviews/InterviewsView';
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
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <h2 className="text-xl font-bold tracking-tight">JobPilot AI</h2>
          <p className="text-sm text-slate-400">Initializing your career acceleration telemetry...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex transition-colors duration-200">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        onOpenAuth={() => setAuthModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
        <Header
          currentTab={currentTab}
          setMobileOpen={setMobileOpen}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {currentTab === 'dashboard' && <DashboardView onNavigate={setCurrentTab} />}
          {currentTab === 'jobs' && (
            <JobsView
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
          {currentTab === 'applications' && (
            <ApplicationsTrackerView
              onLaunchAutofill={handleLaunchAutofill}
              onNavigateToJob={() => setCurrentTab('jobs')}
            />
          )}
          {currentTab === 'interviews' && <InterviewsView />}
          {currentTab === 'assistant' && <CareerAssistantView onNavigate={setCurrentTab} />}
          {currentTab === 'profile' && <ProfileView />}
          {currentTab === 'settings' && <SettingsView />}
        </main>
      </div>

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
