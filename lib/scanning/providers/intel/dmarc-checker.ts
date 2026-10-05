// ─── DMARC / SPF / DKIM DNS Checker ───────────────────────────────────────
// Performs free DNS lookups to verify email authentication records.
// No API key required — uses public DNS resolution via Google DNS over HTTPS.
// This dramatically improves BEC and phishing email detection accuracy.

import type { ScanFindingResult } from '../base';

const DNS_BASE = 'https://dns.google/resolve';

interface DNSResponse {
  Status: number;
  Answer?: { data: string; type: number }[];
}

async function queryDNS(name: string, type: string): Promise<string[]> {
  try {
    const res = await fetch(
      `${DNS_BASE}?name=${encodeURIComponent(name)}&type=${encodeURIComponent(type)}`,
      { headers: { 'Accept': 'application/dns-json' } }
    );
    if (!res.ok) return [];
    const data: DNSResponse = await res.json();
    if (data.Status !== 0) return [];
    return (data.Answer ?? []).map(a => a.data.replace(/^"|"$/g, '').replace(/"\s*"/g, ''));
  } catch { return []; }
}

export interface DmarcResult {
  domain: string;
  spf: { exists: boolean; policy: string | null; raw: string | null };
  dmarc: { exists: boolean; policy: 'none' | 'quarantine' | 'reject' | null; raw: string | null };
  dkim: { likelyConfigured: boolean };
  riskScore: number;
  findings: ScanFindingResult[];
}

export async function checkEmailAuthentication(fromDomain: string): Promise<DmarcResult | null> {
  if (!fromDomain || fromDomain.length < 4) return null;

  try {
    // Run all DNS lookups in parallel
    const [spfRecords, dmarcRecords, mxRecords] = await Promise.all([
      queryDNS(fromDomain, 'TXT'),
      queryDNS(`_dmarc.${fromDomain}`, 'TXT'),
      queryDNS(fromDomain, 'MX'),
    ]);

    const findings: ScanFindingResult[] = [];
    let riskScore = 0;

    // ── SPF ──────────────────────────────────────────────────────────────
    const spfRecord = spfRecords.find(r => r.startsWith('v=spf1')) ?? null;
    const spfExists = spfRecord !== null;

    let spfPolicy: string | null = null;
    if (spfRecord) {
      if (spfRecord.includes('-all')) spfPolicy = 'fail';
      else if (spfRecord.includes('~all')) spfPolicy = 'softfail';
      else if (spfRecord.includes('?all')) spfPolicy = 'neutral';
      else if (spfRecord.includes('+all')) spfPolicy = 'pass_all'; // dangerous!
    }

    if (!spfExists) {
      riskScore += 20;
      findings.push({
        title: `No SPF record found for ${fromDomain}`,
        description: `The domain "${fromDomain}" has no SPF (Sender Policy Framework) record. Without SPF, anyone can send email claiming to be from this domain, making it trivially easy to spoof. This is a strong indicator of a phishing or spoofed email.`,
        severity: 'HIGH',
        category: 'PHISHING',
        mitreAttack: 'T1566.001',
        indicator: fromDomain,
        evidence: { domain: fromDomain, spfExists: false },
      });
    } else if (spfPolicy === 'pass_all') {
      riskScore += 15;
      findings.push({
        title: `SPF record for ${fromDomain} allows all senders (+all)`,
        description: `The SPF record for "${fromDomain}" uses "+all" which authorizes ANY server to send email on behalf of this domain. This effectively makes SPF useless as an anti-spoofing measure.`,
        severity: 'MEDIUM',
        category: 'PHISHING',
        mitreAttack: 'T1566.001',
        indicator: fromDomain,
        evidence: { domain: fromDomain, spfRecord, policy: 'pass_all' },
      });
    }

    // ── DMARC ────────────────────────────────────────────────────────────
    const dmarcRecord = dmarcRecords.find(r => r.startsWith('v=DMARC1')) ?? null;
    const dmarcExists = dmarcRecord !== null;

    let dmarcPolicy: 'none' | 'quarantine' | 'reject' | null = null;
    if (dmarcRecord) {
      const pMatch = dmarcRecord.match(/p=(none|quarantine|reject)/i);
      dmarcPolicy = (pMatch?.[1]?.toLowerCase() as typeof dmarcPolicy) ?? 'none';
    }

    if (!dmarcExists) {
      riskScore += 25;
      findings.push({
        title: `No DMARC record found for ${fromDomain}`,
        description: `The domain "${fromDomain}" has no DMARC policy. Without DMARC, email receivers cannot determine what to do with emails that fail SPF/DKIM checks. Attackers can freely spoof this domain without triggering automatic rejection.`,
        severity: 'HIGH',
        category: 'PHISHING',
        mitreAttack: 'T1566.001',
        indicator: fromDomain,
        evidence: { domain: fromDomain, dmarcExists: false },
      });
    } else if (dmarcPolicy === 'none') {
      riskScore += 15;
      findings.push({
        title: `DMARC policy for ${fromDomain} is set to "none" (monitoring only)`,
        description: `The DMARC record for "${fromDomain}" uses policy "p=none" which means spoofed emails are not rejected or quarantined — they are delivered normally. This policy only enables monitoring but provides no protection against spoofing.`,
        severity: 'MEDIUM',
        category: 'PHISHING',
        mitreAttack: 'T1566.001',
        indicator: fromDomain,
        evidence: { domain: fromDomain, dmarcRecord, policy: 'none' },
      });
    } else if (dmarcPolicy === 'reject') {
      // Strong DMARC — if the email still arrived claiming this domain, that's suspicious
      findings.push({
        title: `${fromDomain} has strict DMARC (reject) — email claiming this domain is suspicious`,
        description: `The domain "${fromDomain}" has a strict DMARC policy (p=reject) meaning legitimate emails from this domain should always pass authentication. An email claiming to be from this domain that you're scanning may be spoofed or the DMARC check failed.`,
        severity: 'LOW',
        category: 'PHISHING',
        mitreAttack: 'T1566.001',
        indicator: fromDomain,
        evidence: { domain: fromDomain, dmarcRecord, policy: 'reject' },
      });
    }

    // ── MX record check (does domain receive email?) ─────────────────────
    const hasMX = mxRecords.length > 0;
    if (!hasMX && !spfExists && !dmarcExists) {
      riskScore += 20;
      findings.push({
        title: `Domain ${fromDomain} appears to be a parked or fake domain`,
        description: `The domain "${fromDomain}" has no MX records (cannot receive email), no SPF, and no DMARC. This pattern is consistent with a throwaway domain registered specifically for phishing attacks.`,
        severity: 'HIGH',
        category: 'PHISHING',
        mitreAttack: 'T1583.001',
        indicator: fromDomain,
        evidence: { domain: fromDomain, hasMX: false, spfExists: false, dmarcExists: false },
      });
    }

    return {
      domain: fromDomain,
      spf: { exists: spfExists, policy: spfPolicy, raw: spfRecord },
      dmarc: { exists: dmarcExists, policy: dmarcPolicy, raw: dmarcRecord },
      dkim: { likelyConfigured: hasMX && spfExists }, // DKIM requires MX+SPF to make sense
      riskScore: Math.min(60, riskScore), // Cap DMARC contribution at 60 — combine with heuristics
      findings,
    };
  } catch (err: any) {
    console.error('[DMARC] Check error:', err.message);
    return null;
  }
}

// Extract From domain from email content
export function extractFromDomain(emailContent: string): string | null {
  const fromMatch = emailContent.match(/^From:.*?<[^@]+@([^>]+)>/im)
    ?? emailContent.match(/^From:\s*([^\s@]+@([^\s<>\n]+))/im);
  if (!fromMatch) return null;
  const domain = fromMatch[1] ?? fromMatch[2];
  return domain?.toLowerCase().trim() ?? null;
}
