import React from 'react';
import {
  X, HelpCircle, Keyboard, BookOpen, ShieldCheck, Mail, Sparkles, ExternalLink
} from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: '⌘ + K / Ctrl + K', description: 'Open universal search and quick commands' },
    { key: '⌘ + J / Ctrl + J', description: 'Launch AI Career Copilot assistant' },
    { key: 'Esc', description: 'Close any active modal or quick drawer' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="glass-card bg-white dark:bg-[#151E30] w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-[#1E293B] space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1E293B] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#635BFF]/10 text-[#635BFF] dark:text-[#8B7CFF]">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Help & Keyboard Shortcuts</h3>
              <p className="text-xs text-slate-500">JobPilot AI platform guide and quick navigation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1E293B] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shortcuts */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Keyboard className="w-4 h-4 text-[#635BFF]" />
            Keyboard Shortcuts
          </span>
          <div className="divide-y divide-slate-100 dark:divide-[#1E293B] rounded-xl border border-slate-200/80 dark:border-[#1E293B] overflow-hidden text-xs">
            {shortcuts.map((sc, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-50/50 dark:bg-[#111827]/40">
                <span className="text-slate-600 dark:text-slate-400">{sc.description}</span>
                <kbd className="px-2 py-1 rounded bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-[11px] font-mono font-bold text-slate-800 dark:text-slate-200 shadow-sm">
                  {sc.key}
                </kbd>
              </div>
            ))}
          </div>
        </div>

        {/* Core Principles */}
        <div className="p-3.5 rounded-xl bg-[#635BFF]/5 dark:bg-[#635BFF]/10 border border-[#635BFF]/20 space-y-1.5 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-[#635BFF] dark:text-[#8B7CFF]">
            <ShieldCheck className="w-4 h-4" />
            <span>Anti-Hallucination Guard Policy</span>
          </div>
          <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
            Every tailored resume, cover letter, and interview response strictly sources credentials from your verified candidate profile. No synthetic degrees or unverified skills are generated.
          </p>
        </div>

        {/* Contact Support */}
        <div className="pt-2 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 dark:border-[#1E293B]">
          <span className="flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-slate-400" />
            Support: <a href="mailto:support@jobpilot.ai" className="text-[#635BFF] hover:underline">support@jobpilot.ai</a>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg btn-primary text-xs font-semibold"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

