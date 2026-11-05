import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles, Send, Bot, User, ArrowRight, BookOpen, FileText,
  Briefcase, CheckCircle2, RefreshCw, MessageSquare, Plus, Clock
} from 'lucide-react';
import { api } from '../../services/api';
import { Job, Conversation, ConversationMessage } from '../../types';

interface CareerAssistantViewProps {
  onNavigate: (tab: string, contextId?: string) => void;
}

export const CareerAssistantView: React.FC<CareerAssistantViewProps> = ({ onNavigate }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeJobId, setActiveJobId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [
    'Which jobs are best suited to my profile?',
    'Why am I not getting interview calls?',
    'Analyze my resume against this job description',
    'What salary should I expect based on my experience?',
    'How can I improve my ATS score?',
    'Prepare a 30-day job preparation plan'
  ];

  useEffect(() => {
    initData();
  }, []);

  const initData = async () => {
    try {
      setLoading(true);
      const [convs, jobList] = await Promise.all([
        api.listConversations(),
        api.listJobs()
      ]);
      setConversations(convs);
      setJobs(jobList);

      if (convs.length > 0) {
        setActiveConversation(convs[0]);
        setMessages(convs[0].messages || []);
      } else {
        // Create initial conversation
        const newConv = await api.createConversation('Career Copilot');
        setConversations([newConv]);
        setActiveConversation(newConv);
        setMessages(newConv.messages || []);
      }
    } catch (err) {
      console.error('Error loading assistant conversations', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const handleSelectConversation = async (conv: Conversation) => {
    try {
      const fullConv = await api.getConversation(conv.id);
      setActiveConversation(fullConv);
      setMessages(fullConv.messages || []);
      if (fullConv.job_id) {
        setActiveJobId(fullConv.job_id);
      }
    } catch (err) {
      console.error('Error loading conversation', err);
    }
  };

  const handleCreateNewConversation = async () => {
    try {
      const newConv = await api.createConversation(
        activeJobId ? `Job Discussion — ${jobs.find(j => j.id === activeJobId)?.company || 'Role'}` : 'New Career Discussion',
        activeJobId || undefined
      );
      setConversations([newConv, ...conversations]);
      setActiveConversation(newConv);
      setMessages(newConv.messages || []);
    } catch (err) {
      console.error('Error creating conversation', err);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || sending) return;

    if (!textToSend) setInputText('');
    setSending(true);

    let convId = activeConversation?.id;
    if (!convId) {
      const created = await api.createConversation('Career Discussion');
      setConversations([created, ...conversations]);
      setActiveConversation(created);
      convId = created.id;
    }
    const currentConvId: string = convId || '';

    // Optimistically add user message
    const tempUserMsg: ConversationMessage = {
      id: 'temp-' + Date.now(),
      conversation_id: currentConvId,
      role: 'user',
      content: text,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const assistantMsg = await api.sendConversationMessage(currentConvId, text);
      setMessages(prev => [...prev.filter(m => m.id !== tempUserMsg.id), tempUserMsg, assistantMsg]);
    } catch (err: any) {
      console.error('Failed to send message', err);
      // Fallback to legacy chat endpoint if conversation endpoint fails
      try {
        const legacyRes: any = await api.chatWithAssistant(text, activeJobId || undefined);
        const fallbackMsg: ConversationMessage = {
          id: 'fb-' + Date.now(),
          conversation_id: currentConvId,
          role: 'assistant',
          content: legacyRes?.reply || 'I am ready to assist you with your career goals.',
          provider_used: 'built-in',
          created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, fallbackMsg]);
      } catch (legacyErr) {
        console.error('Legacy fallback error', legacyErr);
      }
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Initializing your AI Career Copilot...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)] min-h-[600px]">
      {/* Left 3 Cols: Conversation History Sidebar */}
      <div className="lg:col-span-3 flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-indigo-500" /> Chat Sessions
          </span>
          <button
            onClick={handleCreateNewConversation}
            className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition"
            title="Start new chat session"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => handleSelectConversation(c)}
              className={`w-full p-2.5 rounded-xl text-left text-xs transition flex items-center justify-between ${
                activeConversation?.id === c.id
                  ? 'bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-800/60'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="truncate pr-2">
                <span className="block truncate">{c.title || 'Career Discussion'}</span>
                <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                  <Clock className="w-2.5 h-2.5" />
                  {new Date(c.updated_at || c.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Active Job grounding selector */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 space-y-1.5">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Target Job Context
          </label>
          <select
            value={activeJobId}
            onChange={(e) => setActiveJobId(e.target.value)}
            className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none truncate"
          >
            <option value="">General Career Advisory</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.company} — {j.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Right 9 Cols: Chat Studio */}
      <div className="lg:col-span-9 flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {activeConversation?.title || 'AI Career Copilot'}
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-semibold">
                  Profile Grounded
                </span>
              </h2>
              <p className="text-[11px] text-slate-500">
                Multi-turn conversational counseling anchored in verified candidate profile facts
              </p>
            </div>
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map((m, idx) => (
            <div
              key={m.id || idx}
              className={`flex items-start gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div className={`max-w-2xl rounded-2xl p-4 text-xs leading-relaxed ${
                m.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-none'
                  : 'bg-slate-50 dark:bg-slate-950/70 border border-slate-100 dark:border-slate-800/80 text-slate-800 dark:text-slate-200 rounded-tl-none space-y-2'
              }`}>
                <div className="whitespace-pre-line prose-xs">
                  {m.content}
                </div>

                {m.provider_used && (
                  <div className="text-[9px] text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-1 flex items-center gap-2">
                    <span>Engine: {m.provider_used}</span>
                    {m.model_name && <span>• {m.model_name}</span>}
                  </div>
                )}
              </div>

              {m.role === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-slate-700 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {sending && (
            <div className="flex items-center gap-2 text-xs text-slate-400 pl-10">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-500" />
              <span>JobPilot Copilot is reasoning with candidate facts...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Prompt Chips */}
        <div className="px-4 py-2 bg-slate-50/70 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Suggestions:</span>
          {quickPrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(p)}
              disabled={sending}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-indigo-500 hover:text-indigo-600 transition shrink-0 disabled:opacity-50"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Chat Input */}
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
              placeholder="Ask anything: 'What skills should I learn for Senior Data Analyst?', 'Review my resume'..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={sending}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
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
    </div>
  );
};
