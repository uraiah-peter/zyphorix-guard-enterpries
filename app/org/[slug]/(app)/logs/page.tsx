'use client';
import { useEffect, useState, useRef } from 'react';
import { useOrg } from '@/components/layout/OrgProvider';
import { Terminal, RefreshCw, Search, Copy, Check, Filter } from 'lucide-react';
import { Card, SectionHeader, Badge, Skeleton } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui';
import { cn } from '@/lib/utils';

const LEVEL_COLORS: Record<string, { text: string; bg: string; dot: string }> = {
  debug:    { text:'text-[var(--text-muted)]',  bg:'bg-[var(--border)]',        dot:'bg-[var(--text-muted)]' },
  info:     { text:'text-blue-400',   bg:'bg-blue-500/10',       dot:'bg-blue-400' },
  warn:     { text:'text-amber-400',  bg:'bg-amber-500/10',      dot:'bg-amber-400' },
  error:    { text:'text-red-400',    bg:'bg-red-500/10',        dot:'bg-red-400' },
  critical: { text:'text-red-400',    bg:'bg-red-700/20',        dot:'bg-red-300' },
};

const CODE_SNIPPET = (orgId: string) => `# Ship logs to Zyphorix Guard
# Replace YOUR_API_KEY with a key from Settings → API Keys

# Single log entry
curl -X POST https://yourapp.com/api/logs/ingest \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"source":"app","level":"error","message":"Payment failed","metadata":{"userId":"123"}}'

# Batch (up to 500 per request)
curl -X POST https://yourapp.com/api/logs/ingest \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"logs":[{"source":"auth","level":"warn","message":"Failed login attempt"},{"source":"app","level":"error","message":"DB timeout"}]}'

# Node.js / JavaScript
fetch('/api/logs/ingest', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer YOUR_API_KEY', 'Content-Type': 'application/json' },
  body: JSON.stringify({ source: 'app', level: 'error', message: 'Something failed', metadata: { requestId: req.id } })
})`;

export default function LogsPage() {
  const { org } = useOrg();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('');
  const [source, setSource] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string|undefined>();
  const [loadingMore, setLoadingMore] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [copied, setCopied] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  async function fetchLogs(reset = true) {
    if (reset) setLoading(true); else setLoadingMore(true);
    const p = new URLSearchParams({ orgId: org.id, limit: '100' });
    if (level) p.append('level', level);
    if (source) p.append('source', source);
    if (query) p.append('q', query);
    if (!reset && cursor) p.append('cursor', cursor);
    const res = await fetch(`/api/logs/query?${p}`);
    const json = await res.json();
    if (json.data) {
      const { items, hasMore: more, nextCursor } = json.data;
      if (reset) setLogs(items); else setLogs(prev => [...prev, ...items]);
      setHasMore(more);
      if (nextCursor) setCursor(nextCursor);
    }
    setLoading(false); setLoadingMore(false);
  }

  useEffect(() => { setCursor(undefined); fetchLogs(true); }, [org.id, level, source]);
  useEffect(() => {
    if (autoRefresh) { intervalRef.current = setInterval(() => fetchLogs(true), 5000); }
    else if (intervalRef.current) clearInterval(intervalRef.current);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, level, source]);

  async function copySetup() {
    await navigator.clipboard.writeText(CODE_SNIPPET(org.id));
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  const sources = [...new Set(logs.map(l => l.source))].filter(Boolean);

  return (
    <div className="space-y-5 animate-fade-in">
      <SectionHeader title="Log Ingestion" description="Ingest and search logs from any source — servers, apps, auth systems"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowSetup(v => !v)}>
              {showSetup ? 'Hide setup' : 'Setup guide'}
            </Button>
            <Button variant={autoRefresh ? 'primary' : 'secondary'} size="sm"
              icon={<RefreshCw size={13} className={cn(autoRefresh && 'animate-spin')} />}
              onClick={() => setAutoRefresh(v => !v)}>
              {autoRefresh ? 'Live' : 'Auto-refresh'}
            </Button>
          </div>
        }
      />

      {/* Setup guide */}
      {showSetup && (
        <div className="rounded-xl overflow-hidden" style={{ background:'var(--card)', border:'1px solid var(--border)' }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom:'1px solid var(--border)' }}>
            <p className="text-xs font-semibold" style={{ color:'var(--text-muted)' }}>QUICK SETUP — ship logs in 30 seconds</p>
            <button onClick={copySetup} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-400">
              {copied ? <><Check size={12} className="text-emerald-400"/>Copied</> : <><Copy size={12}/>Copy all</>}
            </button>
          </div>
          <pre className="px-4 py-4 text-xs font-mono overflow-x-auto whitespace-pre" style={{ color:'#10b981' }}>
            {CODE_SNIPPET(org.id)}
          </pre>
          <div className="px-4 py-3 flex gap-4 text-xs" style={{ borderTop:'1px solid var(--border)', color:'var(--text-muted)' }}>
            <span>✅ Batch up to 500 events/request</span>
            <span>✅ Critical patterns auto-detected</span>
            <span>✅ HMAC signature verification supported</span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-48">
          <Input placeholder="Search logs..." value={query} onChange={e => setQuery(e.target.value)}
            leftIcon={<Search size={13}/>}
            onKeyDown={e => e.key === 'Enter' && fetchLogs(true)} />
        </div>
        <div className="w-36">
          <Select value={level} onChange={e => setLevel(e.target.value)} options={[
            {value:'',label:'All levels'},{value:'critical',label:'Critical'},{value:'error',label:'Error'},
            {value:'warn',label:'Warn'},{value:'info',label:'Info'},{value:'debug',label:'Debug'},
          ]} />
        </div>
        {sources.length > 0 && (
          <div className="w-36">
            <Select value={source} onChange={e => setSource(e.target.value)}
              options={[{value:'',label:'All sources'}, ...sources.map(s => ({value:s,label:s}))]} />
          </div>
        )}
        {(level||source||query) && <Button variant="ghost" size="sm" onClick={() => { setLevel(''); setSource(''); setQuery(''); }}>Clear</Button>}
        <p className="text-xs ml-auto" style={{ color:'var(--text-faint)' }}>{logs.length} entries</p>
      </div>

      {/* Log terminal */}
      <div className="rounded-xl overflow-hidden" style={{ background:'var(--card)', border:'1px solid var(--border)' }}>
        <div className="flex items-center gap-2 px-4 py-2.5" style={{ background:'var(--card)', borderBottom:'1px solid var(--border)' }}>
          <Terminal size={14} className="text-[var(--text-muted)]"/>
          <p className="text-xs font-mono" style={{ color:'var(--text-muted)' }}>Log stream · {org.name}</p>
          <div className="flex gap-1 ml-auto">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background:'#ff5f57' }}/>
            <span className="w-2.5 h-2.5 rounded-full" style={{ background:'#ffbd2e' }}/>
            <span className="w-2.5 h-2.5 rounded-full" style={{ background:'#28c840' }}/>
          </div>
        </div>
        <div className="h-[480px] overflow-y-auto font-mono text-xs">
          {loading ? (
            <div className="p-4 space-y-2">{Array.from({length:10}).map((_,i) => <Skeleton key={i} className="h-5 rounded"/>)}</div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color:'var(--text-faint)' }}>
              <Terminal size={32}/>
              <p>No logs yet — use the setup guide to start shipping logs</p>
            </div>
          ) : (
            <div>
              {logs.map((log: any) => {
                const lc = LEVEL_COLORS[log.level] ?? LEVEL_COLORS['info'];
                const ts = new Date(log.timestamp).toLocaleTimeString('en-US',{hour12:false,hour:'2-digit',minute:'2-digit',second:'2-digit'});
                return (
                  <div key={log.id} className="flex items-start gap-3 px-4 py-1.5 hover:bg-blue-500/10 transition-colors border-b border-[var(--border)]">
                    <span className="flex-shrink-0 w-20" style={{ color:'var(--text-faint)' }}>{ts}</span>
                    <span className={cn('flex-shrink-0 w-16 text-center px-1.5 py-0.5 rounded text-xs font-bold uppercase', lc.bg, lc.text)}>{log.level}</span>
                    <span className="flex-shrink-0 w-24 truncate" style={{ color:'#6366f1' }}>[{log.source}]</span>
                    <span className="flex-1 break-all" style={{ color: log.level==='error'||log.level==='critical' ? '#fca5a5' : 'var(--text-primary)' }}>{log.message}</span>
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <span className="flex-shrink-0 text-xs" style={{ color:'var(--text-faint)' }}>{JSON.stringify(log.metadata).slice(0,60)}</span>
                    )}
                  </div>
                );
              })}
              {hasMore && (
                <div className="flex justify-center py-3">
                  <Button size="sm" variant="secondary" loading={loadingMore} onClick={() => fetchLogs(false)}>Load more</Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stats bar */}
      {logs.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 animate-stagger">
          {(['critical','error','warn','info','debug'] as const).map(lvl => {
            const count = logs.filter(l => l.level === lvl).length;
            const lc = LEVEL_COLORS[lvl];
            return (
              <button key={lvl} onClick={() => setLevel(level===lvl?'':lvl)}
                className={cn('p-3 rounded-xl text-center transition-all', level===lvl && 'ring-1 ring-current')}
                style={{ background:'var(--card)', border:`1px solid ${count>0?'#2563eb':'var(--border)'}` }}>
                <p className={cn('text-xl font-black', lc.text)}>{count}</p>
                <p className="text-xs capitalize mt-0.5" style={{ color:'var(--text-muted)' }}>{lvl}</p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
