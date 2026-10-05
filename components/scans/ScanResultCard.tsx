'use client';
import { Card, CardHeader, CardTitle, RiskBadge } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { ChevronRight, Clock, AlertTriangle } from 'lucide-react';
import { RISK_COLORS, cn } from '@/lib/utils';
import type { RiskLevel } from '@/types';

interface ScanResultCardProps {
  result: {
    scanId: string;
    riskScore: number;
    riskLevel: string;
    classification: string;
    summary: string;
    findingsCount: number;
    durationMs: number;
  };
  onViewFull?: () => void;
}

export function ScanResultCard({ result, onViewFull }: ScanResultCardProps) {
  const colors = RISK_COLORS[result.riskLevel as RiskLevel] ?? RISK_COLORS['SAFE'];
  const isThreat = ['HIGH', 'CRITICAL', 'MEDIUM'].includes(result.riskLevel);

  return (
    <Card className={cn('border animate-fade-in', isThreat ? colors.border : 'border-emerald-500/25')}>
      <div className={cn('absolute top-0 left-0 right-0 h-0.5 rounded-t-xl', isThreat ? colors.bg : 'bg-emerald-500/30')} style={{ position:'relative', height:3, borderRadius:'12px 12px 0 0', marginTop:-20, marginLeft:-20, marginRight:-20, marginBottom:16, background: isThreat ? undefined : '#10b981' }} />

      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <RiskBadge level={result.riskLevel as RiskLevel} />
            <span className="text-sm font-semibold text-[var(--text-primary)]">{result.classification}</span>
          </div>
          <p className="text-sm text-[var(--text-muted)]">{result.summary}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-2xl font-black" style={{ color: isThreat ? (result.riskLevel === 'CRITICAL' ? '#dc2626' : result.riskLevel === 'HIGH' ? '#ef4444' : '#f97316') : '#10b981' }}>
            {result.riskScore}
          </p>
          <p className="text-xs text-[var(--text-muted)]">/ 100</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
          {result.findingsCount > 0 && (
            <span className="flex items-center gap-1">
              <AlertTriangle size={11} />
              {result.findingsCount} finding{result.findingsCount !== 1 ? 's' : ''}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock size={11} />
            {result.durationMs < 1000 ? `${result.durationMs}ms` : `${(result.durationMs / 1000).toFixed(1)}s`}
          </span>
        </div>
        {onViewFull && (
          <Button variant="ghost" size="sm" iconRight={<ChevronRight size={14} />} onClick={onViewFull}>
            View full report
          </Button>
        )}
      </div>
    </Card>
  );
}
