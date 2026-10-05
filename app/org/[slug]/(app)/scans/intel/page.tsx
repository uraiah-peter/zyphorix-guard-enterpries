'use client';
import { useState } from 'react';
import { useOrg } from '@/components/layout/OrgProvider';
import { Globe, ArrowRight, Shield } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, Card, SectionHeader } from '@/components/ui';
import { ScanResultCard } from '@/components/scans/ScanResultCard';
import { useRouter } from 'next/navigation';

export default function IntelScanPage() {
  const { org } = useOrg();
  const router = useRouter();
  const [target, setTarget] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  async function handleScan() {
    if (!target.trim()) { setError('Please enter a domain or IP'); return; }
    setError(''); setLoading(true); setResult(null);
    try {
      const res = await fetch('/api/scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: org.id, type: 'DOMAIN_IP', input: target.trim() }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error?.message ?? 'Scan failed'); return; }
      setResult(json.data);
    } catch { setError('An unexpected error occurred'); }
    finally { setLoading(false); }
  }

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      <SectionHeader title="Threat Intelligence" description="Analyze domains and IP addresses for reputation and risk" />
      <Card>
        <div className="space-y-4">
          <Input label="Domain or IP address" placeholder="malicious-site.xyz or 185.220.101.1"
            value={target} onChange={e => { setTarget(e.target.value); setError(''); }}
            leftIcon={<Globe size={14} />} error={error}
            onKeyDown={e => e.key === 'Enter' && handleScan()} />
          <div className="text-xs text-[var(--text-muted)] space-y-1">
            <p>• DGA domain detection, TLD risk scoring, subdomain analysis</p>
            <p>• IP reputation: Tor exit nodes, cloud hosting, private ranges</p>
            <p>• Disposable email domain detection</p>
          </div>
          <Button onClick={handleScan} loading={loading} icon={<Shield size={14} />} iconRight={<ArrowRight size={14} />} className="w-full" size="lg">
            Analyze Target
          </Button>
        </div>
      </Card>
      {result && <ScanResultCard result={result} onViewFull={() => router.push(`/org/${org.slug}/scans/${result.scanId}`)} />}
    </div>
  );
}
