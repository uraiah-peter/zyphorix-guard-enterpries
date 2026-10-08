import { describe, it, expect } from 'vitest';
import { generateSlug, timeAgo, formatDate, RISK_COLORS, getPaginationParams, cn } from '@/lib/utils';

describe('generateSlug', () => {
  it('converts spaces to hyphens', () => {
    expect(generateSlug('My Organization')).toBe('my-organization');
  });
  it('removes special characters', () => {
    expect(generateSlug('Acme Corp! (2024)')).toBe('acme-corp-2024');
  });
  it('collapses multiple hyphens', () => {
    expect(generateSlug('hello---world')).toBe('hello-world');
  });
  it('truncates to 48 characters', () => {
    const long = 'a'.repeat(60);
    expect(generateSlug(long).length).toBeLessThanOrEqual(48);
  });
  it('converts to lowercase', () => {
    expect(generateSlug('UPPER CASE')).toBe('upper-case');
  });
  it('handles already-clean slug', () => {
    expect(generateSlug('my-org')).toBe('my-org');
  });
  it('handles numbers', () => {
    expect(generateSlug('Team 42')).toBe('team-42');
  });
});

describe('timeAgo', () => {
  it('returns seconds for recent timestamps', () => {
    const now = new Date(Date.now() - 30 * 1000);
    expect(timeAgo(now)).toMatch(/\d+s ago/);
  });
  it('returns minutes for timestamps within an hour', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    expect(timeAgo(fiveMinAgo)).toMatch(/5m ago/);
  });
  it('returns hours for timestamps within a day', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    expect(timeAgo(twoHoursAgo)).toMatch(/2h ago/);
  });
  it('returns days for timestamps within a month', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    expect(timeAgo(threeDaysAgo)).toMatch(/3d ago/);
  });
  it('returns formatted date for old timestamps', () => {
    const old = new Date('2023-01-15');
    const result = timeAgo(old);
    expect(result).toMatch(/Jan/);
  });
});

describe('formatDate', () => {
  it('formats a date object', () => {
    const date = new Date('2024-06-15');
    const result = formatDate(date);
    expect(result).toContain('Jun');
    expect(result).toContain('2024');
  });
  it('formats a date string', () => {
    const result = formatDate('2024-01-01');
    expect(result).toContain('Jan');
  });
});

describe('RISK_COLORS', () => {
  it('has all five risk levels', () => {
    expect(RISK_COLORS).toHaveProperty('SAFE');
    expect(RISK_COLORS).toHaveProperty('LOW');
    expect(RISK_COLORS).toHaveProperty('MEDIUM');
    expect(RISK_COLORS).toHaveProperty('HIGH');
    expect(RISK_COLORS).toHaveProperty('CRITICAL');
  });
  it('each level has required color properties', () => {
    for (const level of ['SAFE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']) {
      const colors = RISK_COLORS[level as keyof typeof RISK_COLORS];
      expect(colors).toHaveProperty('bg');
      expect(colors).toHaveProperty('text');
      expect(colors).toHaveProperty('border');
      expect(colors).toHaveProperty('dot');
    }
  });
  it('CRITICAL has red colors', () => {
    expect(RISK_COLORS.CRITICAL.text).toContain('red');
  });
  it('SAFE has green colors', () => {
    expect(RISK_COLORS.SAFE.text).toContain('emerald');
  });
});

describe('getPaginationParams', () => {
  it('returns default limit of 20', () => {
    const params = new URLSearchParams();
    expect(getPaginationParams(params).limit).toBe(20);
  });
  it('respects custom limit', () => {
    const params = new URLSearchParams({ limit: '50' });
    expect(getPaginationParams(params).limit).toBe(50);
  });
  it('caps limit at 100', () => {
    const params = new URLSearchParams({ limit: '999' });
    expect(getPaginationParams(params).limit).toBe(100);
  });
  it('returns cursor from params', () => {
    const params = new URLSearchParams({ cursor: '2024-01-01T00:00:00Z' });
    expect(getPaginationParams(params).cursor).toBe('2024-01-01T00:00:00Z');
  });
  it('returns undefined cursor when not set', () => {
    const params = new URLSearchParams();
    expect(getPaginationParams(params).cursor).toBeUndefined();
  });
});

describe('cn (class merger)', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });
  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible');
  });
  it('deduplicates Tailwind classes (last wins)', () => {
    const result = cn('text-red-400', 'text-blue-400');
    expect(result).toContain('text-blue-400');
    expect(result).not.toContain('text-red-400');
  });
  it('handles undefined and null', () => {
    expect(cn('base', undefined, null as any, 'end')).toBe('base end');
  });
});
