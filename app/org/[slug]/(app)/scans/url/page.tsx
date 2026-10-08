'use client';
import { useState } from 'react';
import { useOrg } from '@/components/layout/OrgProvider';
import { Link2, ArrowRight, Shield } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, Card, SectionHeader } from '@/components/ui';
import { ScanResultCard } from '@/components/scans/ScanResultCard';
import { useRouter } from 'next/navigation';

export default function UrlScanPage() {
  const { org } = useOrg();
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  async function handleScan() {
    if (!url.trim()) { setError('Please enter a URL'); return; }
    setError(''); setLoading(true); setResult(null);
    try {
      const res = await fetch('/api/scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: org.id, type: 'URL', input: url.trim() }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error?.message ?? 'Scan failed'); return; }
      setResult(json.data);
    } catch { setError('An unexpected error occurred'); }
    finally { setLoading(false); }
  }

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      <SectionHeader title="URL Scanner" description="Analyze URLs for phishing, malware, and suspicious patterns" />
      <Card>
        <div className="space-y-4">
          <Input
            label="URL to analyze"
            placeholder="https://example.com/page"
            value={url}
            onChange={e => { setUrl(e.target.value); setError(''); }}
            leftIcon={<Link2 size={14} />}
            error={error}
            onKeyDown={e => e.key === 'Enter' && handleScan()}
          />
          <div className="text-xs text-[var(--text-muted)] space-y-1">
            <p>• URLs are analyzed structurally — never fetched directly</p>
            <p>• Checks for phishing patterns, brand impersonation, suspicious TLDs, malicious extensions</p>
            <p>• MITRE ATT&CK mapping included in full report</p>
          </div>
          <Button onClick={handleScan} loading={loading} icon={<Shield size={14} />} iconRight={<ArrowRight size={14} />} className="w-full" size="lg">
            Analyze URL
          </Button>
        </div>
      </Card>
      {result && (
        <ScanResultCard result={result} onViewFull={() => router.push(`/org/${org.slug}/scans/${result.scanId}`)} />
      )}
    </div>
  );
}
