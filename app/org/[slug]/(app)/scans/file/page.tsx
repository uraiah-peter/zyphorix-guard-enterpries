'use client';
import { useState, useRef } from 'react';
import { useOrg } from '@/components/layout/OrgProvider';
import { FileSearch, Upload, X, ArrowRight, Shield } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, SectionHeader } from '@/components/ui';
import { ScanResultCard } from '@/components/scans/ScanResultCard';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

// Server-side (app/api/scans/route.ts createScanSchema) caps the base64
// `input` string at 50,000 characters — roughly 36.6KB of raw file content
// after decoding. This must match that cap, not be a separate, larger
// number: a bigger client-side limit just means files between this size
// and the old 10MB advertised limit would upload successfully client-side
// and then fail server-side with a generic validation error.
const MAX_SIZE = 36 * 1024; // 36KB — keeps base64-encoded size safely under the 50,000 char server cap

export default function FileScanPage() {
  const { org } = useOrg();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);
  const [dragging, setDragging] = useState(false);

  function handleFile(f: File) {
    if (f.size > MAX_SIZE) { setError('File size must be under 36KB'); return; }
    setFile(f); setError(''); setResult(null);
  }

  async function handleScan() {
    if (!file) { setError('Please select a file'); return; }
    setError(''); setLoading(true); setResult(null);
    try {
      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      const res = await fetch('/api/scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: org.id, type: 'FILE', input: base64, filename: file.name, mimeType: file.type }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error?.message ?? 'Scan failed'); return; }
      setResult(json.data);
    } catch { setError('An unexpected error occurred'); }
    finally { setLoading(false); }
  }

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      <SectionHeader title="File Scanner" description="Static analysis for malware, suspicious executables, and dangerous files" />
      <Card>
        <div className="space-y-4">
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            onClick={() => fileRef.current?.click()}
            className={cn('flex flex-col items-center justify-center p-10 rounded-xl border-2 border-dashed cursor-pointer transition-all', dragging ? 'border-blue-500 bg-blue-500/10' : 'border-[var(--border2)] hover:border-blue-500/50 hover:bg-[var(--bg3)]')}
          >
            <input ref={fileRef} type="file" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            {file ? (
              <div className="flex items-center gap-3">
                <FileSearch size={24} className="text-blue-400" />
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{file.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">{(file.size / 1024).toFixed(1)} KB · {file.type || 'unknown type'}</p>
                </div>
                <button onClick={e => { e.stopPropagation(); setFile(null); }} className="ml-2 text-[var(--text-muted)] hover:text-red-400">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <>
                <Upload size={28} className="text-[var(--text-faint)] mb-3" />
                <p className="text-sm text-[var(--text-secondary)]">Drop file here or click to browse</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">Max 36KB · Any file type</p>
              </>
            )}
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="text-xs text-[var(--text-muted)] space-y-1">
            <p>• SHA-256 hash analysis against known malicious file database</p>
            <p>• Magic byte detection — identifies executables disguised as other file types</p>
            <p>• Entropy analysis for packed/encrypted malware detection</p>
          </div>
          <Button onClick={handleScan} loading={loading} disabled={!file} icon={<Shield size={14} />} iconRight={<ArrowRight size={14} />} className="w-full" size="lg">
            Analyze File
          </Button>
        </div>
      </Card>
      {result && <ScanResultCard result={result} onViewFull={() => router.push(`/org/${org.slug}/scans/${result.scanId}`)} />}
    </div>
  );
}
