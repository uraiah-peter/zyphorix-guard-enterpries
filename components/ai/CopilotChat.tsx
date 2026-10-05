'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Square, Zap, FileText, Loader2, AlertTriangle, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CopilotMessage } from './CopilotMessage';
import { cn } from '@/lib/utils';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface CopilotChatProps {
  orgId: string;
  plan: string;
  initialMessage?: string;
}

const STARTERS = [
  { icon: '🔍', text: 'Summarize the recent threats detected in this organization' },
  { icon: '🛡️', text: 'What are the highest priority security actions I should take right now?' },
  { icon: '📚', text: 'Explain MITRE ATT&CK technique T1566.001 and how to defend against it' },
  { icon: '☁️', text: 'What are the most common AWS security misconfigurations I should check for?' },
  { icon: '🚨', text: 'Walk me through the steps to respond to a phishing incident' },
  { icon: '📊', text: 'What does our current security score mean and how can we improve it?' },
];

export function CopilotChat({ orgId, plan, initialMessage }: CopilotChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [reportText, setReportText] = useState('');
  const [copied, setCopied] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const isLocked = plan === 'FREE';

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming]);

  // Send initial message if provided
  useEffect(() => {
    if (initialMessage && !isLocked) {
      setInput(initialMessage);
      setTimeout(() => sendMessage(initialMessage), 100);
    }
  }, []);

  const sendMessage = useCallback(async (overrideText?: string) => {
    const text = overrideText ?? input.trim();
    if (!text || streaming || isLocked) return;

    setInput('');
    setError('');
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text };
    const assistantId = (Date.now() + 1).toString();
    const assistantMsg: Message = { id: assistantId, role: 'assistant', content: '' };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message ?? 'AI service unavailable');
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        setMessages(prev =>
          prev.map(m => m.id === assistantId ? { ...m, content: accumulated } : m)
        );
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      const errMsg = err.message ?? 'AI service temporarily unavailable';
      setError(errMsg);
      setMessages(prev => prev.filter(m => m.id !== assistantId));
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [input, messages, orgId, streaming, isLocked]);

  function handleStop() {
    abortRef.current?.abort();
    setStreaming(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  async function generateReport() {
    setReportLoading(true); setReportText(''); setError('');
    try {
      const res = await fetch('/api/ai/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, reportType: 'executive' }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error?.message ?? 'Report generation failed'); return; }
      setReportText(json.data.report);
    } finally {
      setReportLoading(false);
    }
  }

  async function copyReport() {
    await navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Locked state (FREE plan) ──────────────────────────────────────────
  if (isLocked) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
          style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(99,102,241,0.15))', border: '1px solid rgba(99,102,241,0.3)' }}>
          🤖
        </div>
        <h3 className="text-base font-bold text-[var(--text-primary)]">AI Security Copilot</h3>
        <p className="text-sm text-[var(--text-muted)] max-w-sm">
          Upgrade to Starter or higher to unlock AI-powered threat investigation, incident guidance, and executive report generation.
        </p>
        <Button onClick={() => window.location.href = 'settings/billing'} icon={<Zap size={14} />}>
          Upgrade to unlock
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && !reportText && (
          <div className="space-y-6">
            {/* Welcome */}
            <div className="text-center pt-8">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl font-black"
                style={{ background: 'linear-gradient(135deg, #1d4ed8, #7c3aed)', color: '#fff', fontFamily: 'monospace', boxShadow: '0 0 20px rgba(59,130,246,0.3)' }}>
                Z
              </div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">Zyphorix AI Copilot</h2>
              <p className="text-sm text-[var(--text-muted)] mt-1">Ask me anything about your security posture</p>
            </div>

            {/* Starters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-2xl mx-auto animate-stagger">
              {STARTERS.map((s) => (
                <button
                  key={s.text}
                  onClick={() => { setInput(s.text); sendMessage(s.text); }}
                  className="card-lift flex items-start gap-2.5 p-3 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--card2)] hover:border-blue-500/30 transition-all text-left"
                >
                  <span className="text-base flex-shrink-0">{s.icon}</span>
                  <span className="text-xs text-[var(--text-secondary)]">{s.text}</span>
                </button>
              ))}
            </div>

            {/* Report button */}
            <div className="flex justify-center">
              <Button variant="secondary" size="sm" icon={<FileText size={14} />}
                loading={reportLoading} onClick={generateReport}>
                Generate executive security report
              </Button>
            </div>
          </div>
        )}

        {/* Executive report */}
        {reportText && (
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Executive Security Report</h3>
              <Button variant="ghost" size="sm"
                icon={copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                onClick={copyReport}>
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
              <pre className="whitespace-pre-wrap text-sm text-[var(--text-secondary)] leading-relaxed font-sans">{reportText}</pre>
            </div>
            <button className="mt-3 text-xs text-blue-400 hover:text-blue-400" onClick={() => setReportText('')}>
              ← Back to chat
            </button>
          </div>
        )}

        {/* Chat messages */}
        {messages.map((msg, idx) => (
          <CopilotMessage
            key={msg.id}
            role={msg.role}
            content={msg.content}
            isStreaming={streaming && idx === messages.length - 1 && msg.role === 'assistant'}
          />
        ))}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm max-w-2xl mx-auto">
            <AlertTriangle size={14} className="flex-shrink-0" />
            {error}
            <button onClick={() => setError('')} className="ml-auto opacity-60 hover:opacity-100">✕</button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="border-t border-[var(--border)] px-4 py-3 bg-[var(--bg2)]">
        <div className="flex items-end gap-3 max-w-4xl mx-auto">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about threats, incidents, CVEs, compliance..."
              rows={1}
              disabled={streaming}
              className={cn(
                'w-full px-4 py-3 pr-12 rounded-xl text-sm resize-none',
                'bg-[var(--bg3)] border border-[var(--border2)]',
                'text-[var(--text-primary)] placeholder:text-[var(--text-faint)]',
                'transition-colors outline-none',
                'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
                'disabled:opacity-50 max-h-40 overflow-y-auto'
              )}
              style={{ lineHeight: '1.5' }}
              onInput={e => {
                const t = e.currentTarget;
                t.style.height = 'auto';
                t.style.height = Math.min(t.scrollHeight, 160) + 'px';
              }}
            />
          </div>

          {streaming ? (
            <Button variant="danger" size="icon" onClick={handleStop} className="flex-shrink-0 mb-0.5">
              <Square size={14} />
            </Button>
          ) : (
            <Button size="icon" onClick={() => sendMessage()} disabled={!input.trim()} className="flex-shrink-0 mb-0.5">
              <Send size={14} />
            </Button>
          )}
        </div>
        <p className="text-xs text-[var(--text-faint)] text-center mt-2">
          Shift+Enter for new line · Enter to send · AI responses are for guidance only
        </p>
      </div>
    </div>
  );
}
