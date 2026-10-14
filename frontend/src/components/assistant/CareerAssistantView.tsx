import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles, Send, Bot, User, ArrowRight, BookOpen, FileText,
  Briefcase, CheckCircle2, RefreshCw
} from 'lucide-react';
import { api } from '../../services/api';
import { Job } from '../../types';

interface CareerAssistantViewProps {
  onNavigate: (tab: string, contextId?: string) => void;
}

interface Message {
  sender: 'user' | 'assistant';
  text: string;
  actionSuggestions?: string[];
  actionType?: string;
  time: string;
}

export const CareerAssistantView: React.FC<CareerAssistantViewProps> = ({ onNavigate }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'assistant',
      text: "Hello! I am your JobPilot AI Career Copilot. I have analyzed your verified master profile. I can help you find high-match opportunities, explain score criteria, prioritize missing skills with study plans, tailor resumes, and generate STAR interview responses. What would you like to explore?",
      actionSuggestions: [
        'Find the best jobs for my profile',
        'Explain why my match score is low',
        'Identify missing skills & study roadmap',
        'Prepare interview talking points'
      ],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeJobId, setActiveJobId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.listJobs().then(setJobs).catch(() => {});
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || sending) return;

    const userMsg: Message = {
      sender: 'user',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setSending(true);

    try {
      const history = messages.map(m => ({ role: m.sender, content: m.text }));
      const res: any = await api.chatWithAssistant(text, activeJobId || undefined, history);

      const aiMsg: Message = {
        sender: 'assistant',
        text: res.reply,
        actionSuggestions: res.action_suggestions || [],
        actionType: res.action_type,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          sender: 'assistant',
          text: `I encountered an issue processing that request: ${err.message}. Please try again.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setSending(false);
    }
  };

  const handlePromptChipClick = (prompt: string) => {
    handleSendMessage(prompt);
  };

  const handleExecuteAction = (actionType: string) => {
    if (actionType === 'analyze_match') onNavigate('jobs');
    else if (actionType === 'generate_cover_letter') onNavigate('resumes');
    else if (actionType === 'interview_prep') onNavigate('interviews');
    else onNavigate('jobs');
  };

  return (
    <div className="glass-card flex flex-col h-[78vh] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
      {/* Top Bar: Job Context Selector */}
      <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/70 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-xs text-slate-900 dark:text-white">AI Career Copilot</h3>
            <p className="text-[10px] text-slate-500">Connected to your verified master telemetry</p>
          </div>
        </div>

        {/* Anchor Job Selector */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 text-[11px] font-medium hidden sm:inline">Focus Job Context:</span>
          <select
            value={activeJobId}
            onChange={(e) => setActiveJobId(e.target.value)}
            className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs"
          >
            <option value="">General Career Guidance (No Job Selected)</option>
            {jobs.map(j => (
              <option key={j.id} value={j.id}>
                {j.title} • {j.company}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 lg:p-6 overflow-y-auto space-y-4">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.sender === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div className={`max-w-[85%] sm:max-w-[75%] space-y-2`}>
              <div
                className={`p-4 rounded-2xl text-xs leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-none'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none border border-slate-200/60 dark:border-slate-700'
                }`}
              >
                <p className="whitespace-pre-wrap">{m.text}</p>
                <span className={`text-[10px] block mt-1.5 ${m.sender === 'user' ? 'text-indigo-200' : 'text-slate-400'}`}>
                  {m.time}
                </span>
              </div>

              {/* Action Suggestion Chips for Assistant Messages */}
              {m.sender === 'assistant' && m.actionSuggestions && m.actionSuggestions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {m.actionSuggestions.map((action, aIdx) => (
                    <button
                      key={aIdx}
                      onClick={() => handlePromptChipClick(action)}
                      className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition flex items-center gap-1 shadow-sm"
                    >
                      <Sparkles className="w-2.5 h-2.5 text-indigo-500" />
                      {action}
                    </button>
                  ))}
                  {m.actionType && (
                    <button
                      onClick={() => handleExecuteAction(m.actionType!)}
                      className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition flex items-center gap-1 shadow-sm"
                    >
                      <span>Jump to Module</span>
                      <ArrowRight className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {m.sender === 'user' && (
              <div className="w-8 h-8 rounded-full bg-slate-700 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}
        {sending && (
          <div className="flex items-center gap-2 text-xs text-slate-400 pl-11">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-500" />
            <span>JobPilot Copilot is reasoning...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            placeholder="Ask anything: 'How can I optimize my resume for Senior Full-Stack role?'..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={sending}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || sending}
            className="p-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition disabled:opacity-50 shadow-sm"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
