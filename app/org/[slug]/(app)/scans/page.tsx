'use client';
import { useEffect, useState } from 'react';
import { useOrg } from '@/components/layout/OrgProvider';
import { useRouter } from 'next/navigation';
import { Link2, Mail, FileSearch, Globe, ChevronDown, Filter } from 'lucide-react';
import { Card, SectionHeader, RiskBadge, Badge, EmptyState, Skeleton } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui';
import { timeAgo, cn } from '@/lib/utils';

const TYPE_ICONS: Record<string, React.ElementType> = { URL: Link2, EMAIL: Mail, FILE: FileSearch, DOMAIN_IP: Globe };
const TYPE_COLORS: Record<string, string> = { URL: '#3b82f6', EMAIL: '#6366f1', FILE: '#8b5cf6', DOMAIN_IP: '#06b6d4' };

const QUICK_ACTIONS = [
  { label: 'Scan URL', href: 'scans/url', icon: Link2, color: '#3b82f6' },
  { label: 'Scan Email', href: 'scans/email', icon: Mail, color: '#6366f1' },
  { label: 'Scan File', href: 'scans/file', icon: FileSearch, color: '#8b5cf6' },
  { label: 'Threat Intel', href: 'scans/intel', icon: Globe, color: '#06b6d4' },
];

export default function ScansPage() {
  const { org } = useOrg();
  const router = useRouter();
  const [scans, setScans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [cursor, setCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  async function fetchScans(reset = true) {
    if (reset) setLoading(true); else setLoadingMore(true);
    const params = new URLSearchParams({ orgId: org.id, limit: '20' });
    if (typeFilter) params.append('type', typeFilter);
    if (riskFilter) params.append('riskLevel', riskFilter);
    if (!reset && cursor) params.append('cursor', cursor);
    const res = await fetch(`/api/scans?${params}`);
    const json = await res.json();
    if (json.data) {
      const { items, nextCursor, hasMore: more } = json.data;
      if (reset) setScans(items); else setScans(p => [...p, ...items]);
      setHasMore(more);
      if (nextCursor) setCursor(nextCursor);
    }
    setLoading(false); setLoadingMore(false);
  }

  useEffect(() => { setCursor(undefined); fetchScans(true); }, [org.id, typeFilter, riskFilter]);

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader title="Scan History" description={`Security analysis history for ${org.name}`} />

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-stagger">
        {QUICK_ACTIONS.map(a => {
          const Icon = a.icon;
          return (
            <button key={a.label} onClick={() => router.push(`/org/${org.slug}/${a.href}`)}
              className="card-lift flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--card2)] hover:border-opacity-60 transition-all group"
              style={{ borderColor: `${a.color}25` }}>
              <div className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0" style={{ background: `${a.color}18` }}>
                <Icon size={15} style={{ color: a.color }} />
              </div>
              <span className="text-sm font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">{a.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="w-40">
          <Select options={[{ value:'',label:'All types' },{ value:'URL',label:'URL' },{ value:'EMAIL',label:'Email' },{ value:'FILE',label:'File' },{ value:'DOMAIN_IP',label:'Domain/IP' }]} value={typeFilter} onChange={e => setTypeFilter(e.target.value)} />
        </div>
        <div className="w-44">
          <Select options={[{ value:'',label:'All risk levels' },{ value:'CRITICAL',label:'Critical' },{ value:'HIGH',label:'High' },{ value:'MEDIUM',label:'Medium' },{ value:'LOW',label:'Low' },{ value:'SAFE',label:'Safe' }]} value={riskFilter} onChange={e => setRiskFilter(e.target.value)} />
        </div>
        {(typeFilter || riskFilter) && (
          <Button variant="ghost" size="sm" onClick={() => { setTypeFilter(''); setRiskFilter(''); }}>Clear filters</Button>
        )}
        <p className="text-xs text-[var(--text-muted)] ml-auto">{scans.length} scan{scans.length !== 1 ? 's' : ''} shown</p>
      </div>

      {/* Scans table */}
      <Card padding={false}>
        {loading ? (
          <div className="p-5 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="w-8 h-8 rounded-lg" />
                <div className="flex-1 space-y-2"><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-32" /></div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
        ) : scans.length === 0 ? (
          <EmptyState icon={<FileSearch size={32} />} title="No scans yet" description="Run your first scan using the Quick Actions above."
            action={<Button size="sm" onClick={() => router.push(`/org/${org.slug}/scans/url`)}>Start scanning</Button>} />
        ) : (
          <>
            <div className="divide-y divide-[var(--border)]">
              {scans.map(scan => {
                const Icon = TYPE_ICONS[scan.type] ?? Globe;
                const color = TYPE_COLORS[scan.type] ?? 'var(--text-muted)';
                return (
                  <button key={scan.id} onClick={() => router.push(`/org/${org.slug}/scans/${scan.id}`)}
                    className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-[var(--card2)] transition-colors text-left">
                    <div className="flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0" style={{ background:`${color}18`, border:`1px solid ${color}25` }}>
                      <Icon size={15} style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">{scan.input.substring(0, 80)}</p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">{scan.classification ?? scan.status} · {timeAgo(scan.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {scan._count?.findings > 0 && (
                        <span className="text-xs text-[var(--text-muted)]">{scan._count.findings} finding{scan._count.findings !== 1 ? 's' : ''}</span>
                      )}
                      {scan.riskLevel ? <RiskBadge level={scan.riskLevel} /> : <Badge variant="outline">{scan.status}</Badge>}
                      {scan.riskScore !== null && (
                        <span className="text-sm font-bold w-8 text-right" style={{ color: scan.riskScore >= 66 ? '#ef4444' : scan.riskScore >= 41 ? '#f97316' : '#10b981' }}>
                          {scan.riskScore}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            {hasMore && (
              <div className="flex justify-center p-4 border-t border-[var(--border)]">
                <Button variant="secondary" size="sm" loading={loadingMore} onClick={() => fetchScans(false)} iconRight={<ChevronDown size={14} />}>Load more</Button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
