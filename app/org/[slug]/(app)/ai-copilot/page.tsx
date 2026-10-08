'use client';
import { useOrg } from '@/components/layout/OrgProvider';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { CopilotChat } from '@/components/ai/CopilotChat';
import { Zap, Loader2 } from 'lucide-react';

function AiCopilotInner() {
  const { org, plan } = useOrg();
  const searchParams = useSearchParams();
  const initialMessage = searchParams.get('q') ?? undefined;

  return (
    <div className="flex flex-col animate-fade-in" style={{ height: 'calc(100vh - 56px - 48px)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-1 pb-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg"
            style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(99,102,241,0.2))', border: '1px solid rgba(99,102,241,0.3)' }}>
            <Zap size={16} className="text-indigo-400" />
          </div>
          <div>
            <h1 className="text-base font-bold text-[var(--text-primary)]">AI Security Copilot</h1>
            <p className="text-xs text-[var(--text-muted)]">Powered by Groq · {plan} plan</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Online
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
        <CopilotChat orgId={org.id} plan={plan} initialMessage={initialMessage} />
      </div>
    </div>
  );
}

export default function AiCopilotPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-full">
        <Loader2 size={24} className="animate-spin text-blue-400" />
      </div>
    }>
      <AiCopilotInner />
    </Suspense>
  );
}
