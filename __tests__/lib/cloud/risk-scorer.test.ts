import { describe, it, expect } from 'vitest';
import { calculateCloudRiskScore, summarizeFindings } from '@/lib/cloud/risk-scorer';
import type { CloudFinding } from '@/lib/cloud/types';

function makeFinding(severity: CloudFinding['severity'], id = Math.random().toString()): CloudFinding {
  return {
    id,
    service: 'IAM',
    resourceType: 'AWS::IAM::User',
    resourceId: 'arn:aws:iam::123456789:user/test',
    resourceName: 'test-user',
    title: `Test finding (${severity})`,
    description: 'Test description',
    severity,
    category: 'IAM_MISCONFIGURATION',
    recommendation: 'Fix it',
    evidence: {},
  };
}

describe('calculateCloudRiskScore', () => {
  it('returns 0 for no findings', () => {
    expect(calculateCloudRiskScore([])).toBe(0);
  });

  it('returns high score for CRITICAL findings', () => {
    const score = calculateCloudRiskScore([makeFinding('CRITICAL'), makeFinding('CRITICAL')]);
    expect(score).toBeGreaterThanOrEqual(80);
  });

  it('returns moderate score for HIGH findings', () => {
    const score = calculateCloudRiskScore([makeFinding('HIGH'), makeFinding('HIGH')]);
    expect(score).toBeGreaterThan(30);
    expect(score).toBeLessThan(100);
  });

  it('returns low score for LOW findings only', () => {
    const score = calculateCloudRiskScore([makeFinding('LOW'), makeFinding('LOW'), makeFinding('LOW')]);
    expect(score).toBeLessThan(20);
  });

  it('never exceeds 100', () => {
    const manyFindings = Array.from({ length: 20 }, () => makeFinding('CRITICAL'));
    expect(calculateCloudRiskScore(manyFindings)).toBeLessThanOrEqual(100);
  });

  it('scores CRITICAL higher than HIGH', () => {
    const criticalScore = calculateCloudRiskScore([makeFinding('CRITICAL')]);
    const highScore = calculateCloudRiskScore([makeFinding('HIGH')]);
    expect(criticalScore).toBeGreaterThan(highScore);
  });

  it('scores HIGH higher than MEDIUM', () => {
    const highScore = calculateCloudRiskScore([makeFinding('HIGH')]);
    const medScore = calculateCloudRiskScore([makeFinding('MEDIUM')]);
    expect(highScore).toBeGreaterThan(medScore);
  });

  it('INFO findings contribute minimally', () => {
    const score = calculateCloudRiskScore([makeFinding('INFO')]);
    expect(score).toBe(0);
  });
});

describe('summarizeFindings', () => {
  it('correctly counts by severity', () => {
    const findings = [
      makeFinding('CRITICAL'),
      makeFinding('HIGH'),
      makeFinding('HIGH'),
      makeFinding('MEDIUM'),
      makeFinding('LOW'),
    ];
    const summary = summarizeFindings(findings);
    expect(summary.critical).toBe(1);
    expect(summary.high).toBe(2);
    expect(summary.medium).toBe(1);
    expect(summary.low).toBe(1);
    expect(summary.total).toBe(5);
  });

  it('returns empty summary for no findings', () => {
    const summary = summarizeFindings([]);
    expect(summary.total).toBe(0);
    expect(summary.critical).toBe(0);
  });

  it('lists unique services scanned', () => {
    const findings = [
      { ...makeFinding('HIGH'), service: 'IAM' },
      { ...makeFinding('MEDIUM'), service: 'S3' },
      { ...makeFinding('LOW'), service: 'IAM' }, // duplicate
    ];
    const summary = summarizeFindings(findings);
    expect(summary.servicesScanned).toHaveLength(2);
    expect(summary.servicesScanned).toContain('IAM');
    expect(summary.servicesScanned).toContain('S3');
  });

  it('returns top 5 findings sorted by severity', () => {
    const findings = [
      makeFinding('LOW'),
      makeFinding('CRITICAL'),
      makeFinding('MEDIUM'),
      makeFinding('HIGH'),
      makeFinding('LOW'),
      makeFinding('HIGH'),
    ];
    const summary = summarizeFindings(findings);
    expect(summary.topFindings).toHaveLength(5);
    expect(summary.topFindings[0].severity).toBe('CRITICAL');
  });
});
