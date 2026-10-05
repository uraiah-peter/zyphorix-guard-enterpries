// ─── VirusTotal Provider ───────────────────────────────────────────────────
// Queries the VirusTotal API v3 for URL and file hash reputation.
// Free tier: 4 requests/minute, 500/day.
// Paid tier: 1000 req/min.
// Docs: https://developers.virustotal.com/reference/overview

import type { ScanFindingResult } from '../base';
import { scoreToLevel } from '../base';
import { randomUUID } from 'crypto';

const VT_BASE = 'https://www.virustotal.com/api/v3';

interface VTStats {
  malicious: number;
  suspicious: number;
  harmless: number;
  undetected: number;
  timeout?: number;
}

interface VTResult {
  riskScore: number;
  findings: ScanFindingResult[];
  permalink: string | null;
  stats: VTStats | null;
  engines: { name: string; result: string }[];
}

function getApiKey(): string | null {
  return process.env.VIRUSTOTAL_API_KEY ?? null;
}

// ── URL Analysis ────────────────────────────────────────────────────────────
export async function scanUrlWithVT(url: string): Promise<VTResult | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  try {
    // Step 1: Submit URL for analysis
    const submitRes = await fetch(`${VT_BASE}/urls`, {
      method: 'POST',
      headers: {
        'x-apikey': apiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `url=${encodeURIComponent(url)}`,
    });

    if (!submitRes.ok) {
      if (submitRes.status === 429) console.warn('[VirusTotal] Rate limit hit');
      return null;
    }

    const submitData = await submitRes.json();
    const analysisId = submitData.data?.id;
    if (!analysisId) return null;

    // Step 2: Poll for results (max 3 attempts)
    for (let attempt = 0; attempt < 3; attempt++) {
      await new Promise(r => setTimeout(r, attempt === 0 ? 500 : 2000));

      const resultRes = await fetch(`${VT_BASE}/analyses/${analysisId}`, {
        headers: { 'x-apikey': apiKey },
      });

      if (!resultRes.ok) continue;
      const resultData = await resultRes.json();
      const status = resultData.data?.attributes?.status;

      if (status !== 'completed') continue;

      const stats: VTStats = resultData.data.attributes.stats;
      const results = resultData.data.attributes.results ?? {};

      // Build findings from VT engines that flagged as malicious
      const findings: ScanFindingResult[] = [];
      const maliciousEngines: { name: string; result: string }[] = [];

      for (const [engine, engineResult] of Object.entries(results as Record<string, any>)) {
        if (engineResult.category === 'malicious' || engineResult.category === 'suspicious') {
          maliciousEngines.push({ name: engine, result: engineResult.result ?? engineResult.category });
        }
      }

      const totalEngines = stats.malicious + stats.suspicious + stats.harmless + stats.undetected;
      const detectionRatio = (stats.malicious + stats.suspicious) / Math.max(totalEngines, 1);

      // Calculate risk score from VT results
      let riskScore = 0;
      if (stats.malicious >= 5) riskScore = 95;
      else if (stats.malicious >= 3) riskScore = 85;
      else if (stats.malicious >= 1) riskScore = 70;
      else if (stats.suspicious >= 3) riskScore = 55;
      else if (stats.suspicious >= 1) riskScore = 35;
      else riskScore = 0;

      if (stats.malicious > 0 || stats.suspicious > 0) {
        const severity = stats.malicious >= 3 ? 'CRITICAL' : stats.malicious >= 1 ? 'HIGH' : 'MEDIUM';
        findings.push({
          title: `VirusTotal: ${stats.malicious} engine(s) detected as malicious`,
          description: `${stats.malicious} of ${totalEngines} antivirus engines flagged this URL as malicious, ${stats.suspicious} flagged as suspicious. Detection ratio: ${(detectionRatio * 100).toFixed(1)}%. Engines flagging: ${maliciousEngines.slice(0, 5).map(e => `${e.name} (${e.result})`).join(', ')}${maliciousEngines.length > 5 ? ` +${maliciousEngines.length - 5} more` : ''}.`,
          severity,
          category: 'MALWARE',
          mitreAttack: 'T1566.002',
          indicator: url,
          evidence: {
            stats,
            detectionRatio,
            topEngines: maliciousEngines.slice(0, 10),
            permalink: `https://www.virustotal.com/gui/url/${Buffer.from(url).toString('base64').replace(/=/g, '')}/detection`,
          },
        });
      }

      return {
        riskScore,
        findings,
        permalink: `https://www.virustotal.com/gui/url/${Buffer.from(url).toString('base64').replace(/=/g, '')}/detection`,
        stats,
        engines: maliciousEngines,
      };
    }

    return null;
  } catch (err: any) {
    console.error('[VirusTotal] URL scan error:', err.message);
    return null;
  }
}

// ── File Hash Analysis ──────────────────────────────────────────────────────
export async function scanHashWithVT(sha256: string, filename?: string): Promise<VTResult | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  try {
    const res = await fetch(`${VT_BASE}/files/${sha256}`, {
      headers: { 'x-apikey': apiKey },
    });

    // 404 = file not in VT database (unknown file — not necessarily safe)
    if (res.status === 404) return { riskScore: 0, findings: [], permalink: null, stats: null, engines: [] };
    if (!res.ok) return null;

    const data = await res.json();
    const attrs = data.data?.attributes;
    if (!attrs) return null;

    const stats: VTStats = attrs.last_analysis_stats;
    const results = attrs.last_analysis_results ?? {};
    const totalEngines = Object.keys(results).length;
    const maliciousEngines: { name: string; result: string }[] = [];

    for (const [engine, engineResult] of Object.entries(results as Record<string, any>)) {
      if (engineResult.category === 'malicious' || engineResult.category === 'suspicious') {
        maliciousEngines.push({ name: engine, result: engineResult.result ?? '' });
      }
    }

    let riskScore = 0;
    const findings: ScanFindingResult[] = [];

    if (stats.malicious >= 10) riskScore = 99;
    else if (stats.malicious >= 5) riskScore = 90;
    else if (stats.malicious >= 3) riskScore = 80;
    else if (stats.malicious >= 1) riskScore = 65;
    else if (stats.suspicious >= 3) riskScore = 50;
    else if (stats.suspicious >= 1) riskScore = 30;

    if (stats.malicious > 0 || stats.suspicious > 0) {
      const severity = stats.malicious >= 5 ? 'CRITICAL' : stats.malicious >= 1 ? 'HIGH' : 'MEDIUM';
      const malwareNames = [...new Set(maliciousEngines.map(e => e.result).filter(Boolean))].slice(0, 3);

      findings.push({
        title: `VirusTotal: File detected as malware by ${stats.malicious} engine(s)`,
        description: `${stats.malicious} of ${totalEngines} antivirus engines detected this file${filename ? ` (${filename})` : ''} as malicious. ${malwareNames.length > 0 ? `Identified as: ${malwareNames.join(', ')}.` : ''} SHA-256: ${sha256.slice(0, 16)}...`,
        severity,
        category: 'MALWARE',
        mitreAttack: 'T1204.002',
        indicator: sha256,
        evidence: {
          sha256,
          filename,
          stats,
          malwareNames,
          topEngines: maliciousEngines.slice(0, 10),
          permalink: `https://www.virustotal.com/gui/file/${sha256}/detection`,
        },
      });
    }

    return {
      riskScore,
      findings,
      permalink: `https://www.virustotal.com/gui/file/${sha256}/detection`,
      stats,
      engines: maliciousEngines,
    };
  } catch (err: any) {
    console.error('[VirusTotal] Hash scan error:', err.message);
    return null;
  }
}
