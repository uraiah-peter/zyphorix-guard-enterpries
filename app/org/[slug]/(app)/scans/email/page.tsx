'use client';
import { useState } from 'react';
import { useOrg } from '@/components/layout/OrgProvider';
import { Mail, ArrowRight, Shield } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, SectionHeader } from '@/components/ui';
import { ScanResultCard } from '@/components/scans/ScanResultCard';
import { useRouter } from 'next/navigation';

export default function EmailScanPage() {
  const { org } = useOrg();
  const router = useRouter();
  const [emailContent, setEmailContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  async function handleScan() {
    if (!emailContent.trim()) { setError('Please paste email content'); return; }
    setError(''); setLoading(true); setResult(null);
    try {
      const res = await fetch('/api/scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: org.id, type: 'EMAIL', input: emailContent.trim() }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error?.message ?? 'Scan failed'); return; }
      setResult(json.data);
    } catch { setError('An unexpected error occurred'); }
    finally { setLoading(false); }
  }

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      <SectionHeader title="Email Scanner" description="Detect phishing, BEC, and social engineering in emails" />
      <Card>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[var(--text-secondary)]">Email content (headers + body)</label>
            <textarea
              value={emailContent}
              onChange={e => { setEmailContent(e.target.value); setError(''); }}
              placeholder={`From: "CEO" <ceo@company-domain.com>\nTo: finance@yourcompany.com\nSubject: Urgent Wire Transfer Required\nReply-To: attacker@gmail.com\n\nPlease process this wire transfer immediately...`}
              rows={10}
              className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--bg3)] border border-[var(--border2)] text-[var(--text-primary)] placeholder:text-[var(--text-faint)] transition-colors outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-y font-mono"
            />
            {error && <p className="text-xs text-red-400">{error}</p>}
          </div>
          <div className="text-xs text-[var(--text-muted)] space-y-1">
            <p>• Paste raw email headers and body for best results</p>
            <p>• Detects From/Reply-To mismatches, urgency language, BEC patterns, credential harvesting</p>
            <p>• Homograph and Unicode obfuscation detection</p>
          </div>
          <Button onClick={handleScan} loading={loading} icon={<Mail size={14} />} iconRight={<ArrowRight size={14} />} className="w-full" size="lg">
            Analyze Email
          </Button>
        </div>
      </Card>
      {result && <ScanResultCard result={result} onViewFull={() => router.push(`/org/${org.slug}/scans/${result.scanId}`)} />}
    </div>
  );
}
