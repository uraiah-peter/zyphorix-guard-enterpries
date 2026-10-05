'use client';
import { useEffect, useState } from 'react';
import { ExternalLink, CheckCircle2, XCircle, Zap } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui';
import { cn } from '@/lib/utils';

export function ThreatIntelPanel() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/intel/status').then(r => r.json()).then(j => setData(j));
  }, []);

  if (!data) return null;

  const accuracyColor =
    data.configuredCount === 3 ? 'text-emerald-400' :
    data.configuredCount === 2 ? 'text-blue-400' :
    data.configuredCount === 1 ? 'text-amber-400' : 'text-red-400';

  return (
    <Card>
      <CardHeader><CardTitle>Threat Intelligence APIs</CardTitle></CardHeader>
      <div className="mb-4 p-3 rounded-lg" style={{ background:'var(--card)', border:'1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <Zap size={14} className={accuracyColor} />
          <p className={cn('text-sm font-semibold', accuracyColor)}>{data.accuracyLevel}</p>
        </div>
        <p className="text-xs mt-1" style={{ color:'var(--text-muted)' }}>
          Adding API keys transforms scanners from heuristic pattern matching to real-world threat intelligence with 70+ antivirus engines and millions of known malicious indicators.
        </p>
      </div>
      <div className="space-y-3">
        {Object.entries(data.status).map(([key, api]: [string, any]) => (
          <div key={key} className="flex items-start gap-4 p-4 rounded-xl"
            style={{ background:'var(--card)', border:`1px solid ${api.configured ? 'rgba(16,185,129,0.25)' : 'var(--border)'}` }}>
            <div className="flex-shrink-0 mt-0.5">
              {api.configured ? <CheckCircle2 size={18} className="text-emerald-400" /> : <XCircle size={18} className="text-[var(--text-faint)]" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-sm font-semibold text-white">{api.label}</p>
                <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: api.configured ? 'rgba(16,185,129,0.15)' : 'rgba(100,116,139,0.15)', color: api.configured ? '#10b981' : 'var(--text-muted)' }}>
                  {api.configured ? 'Active' : 'Not configured'}
                </span>
              </div>
              <p className="text-xs" style={{ color:'var(--text-muted)' }}>{api.description}</p>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className="text-xs" style={{ color:'var(--text-faint)' }}>Free limit: {api.freeLimit}</span>
                <span className="text-xs" style={{ color:'var(--text-faint)' }}>Covers: {api.covers.join(', ')}</span>
                {api.signupUrl && !api.configured && (
                  <a href={api.signupUrl} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:text-blue-400 flex items-center gap-1">
                    Get free API key <ExternalLink size={10} />
                  </a>
                )}
              </div>
              {!api.configured && api.signupUrl && (
                <div className="mt-2 p-2 rounded-lg text-xs font-mono" style={{ background:'var(--card)', color:'var(--text-muted)', border:'1px solid var(--border)' }}>
                  {key === 'virustotal' ? 'VIRUSTOTAL_API_KEY' : 'ABUSEIPDB_API_KEY'}=your_key_here
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
