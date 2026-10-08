// ─── AbuseIPDB Provider ────────────────────────────────────────────────────
// Checks IP addresses and domains against the AbuseIPDB threat database.
// Free tier: 1,000 checks/day.
// Docs: https://docs.abuseipdb.com

import type { ScanFindingResult } from '../base';

const ABUSEIPDB_BASE = 'https://api.abuseipdb.com/api/v2';

interface AbuseIPDBResult {
  riskScore: number;
  findings: ScanFindingResult[];
  abuseScore: number | null;
  totalReports: number;
  lastReportedAt: string | null;
  isp: string | null;
  usageType: string | null;
  countryCode: string | null;
  isTor: boolean;
}

function getApiKey(): string | null {
  return process.env.ABUSEIPDB_API_KEY ?? null;
}

export async function checkIPReputation(ip: string): Promise<AbuseIPDBResult | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  // Only check valid public IPs
  if (!isPublicIp(ip)) return null;

  try {
    const res = await fetch(
      `${ABUSEIPDB_BASE}/check?ipAddress=${encodeURIComponent(ip)}&maxAgeInDays=90&verbose`,
      {
        headers: {
          'Key': apiKey,
          'Accept': 'application/json',
        },
      }
    );

    if (!res.ok) {
      if (res.status === 429) console.warn('[AbuseIPDB] Rate limit hit');
      return null;
    }

    const data = await res.json();
    const report = data.data;
    if (!report) return null;

    const abuseScore: number = report.abuseConfidenceScore ?? 0;
    const totalReports: number = report.totalReports ?? 0;
    const isTor: boolean = report.isTor ?? false;
    const isp: string = report.isp ?? '';
    const usageType: string = report.usageType ?? '';
    const countryCode: string = report.countryCode ?? '';
    const lastReportedAt: string | null = report.lastReportedAt ?? null;

    // Map AbuseIPDB confidence score to our risk score
    let riskScore = 0;
    if (abuseScore >= 90) riskScore = 95;
    else if (abuseScore >= 70) riskScore = 80;
    else if (abuseScore >= 50) riskScore = 65;
    else if (abuseScore >= 25) riskScore = 45;
    else if (abuseScore >= 10) riskScore = 25;
    else if (totalReports > 0) riskScore = 15;

    // Boost for Tor exit nodes
    if (isTor) riskScore = Math.min(100, riskScore + 20);

    const findings: ScanFindingResult[] = [];

    if (abuseScore >= 25 || totalReports > 0) {
      const severity =
        abuseScore >= 75 ? 'CRITICAL' :
        abuseScore >= 50 ? 'HIGH' :
        abuseScore >= 25 ? 'MEDIUM' : 'LOW';

      findings.push({
        title: `AbuseIPDB: IP ${ip} has ${abuseScore}% abuse confidence score`,
        description: `IP address ${ip} has been reported ${totalReports} time(s) for abusive activity in the last 90 days with a ${abuseScore}% abuse confidence score. ISP: ${isp || 'Unknown'}. Usage type: ${usageType || 'Unknown'}. Country: ${countryCode || 'Unknown'}.${lastReportedAt ? ` Last reported: ${new Date(lastReportedAt).toLocaleDateString()}.` : ''}`,
        severity,
        category: 'NETWORK_INTEL',
        mitreAttack: 'T1583.003',
        indicator: ip,
        evidence: {
          ip,
          abuseScore,
          totalReports,
          isp,
          usageType,
          countryCode,
          isTor,
          lastReportedAt,
          permalink: `https://www.abuseipdb.com/check/${ip}`,
        },
      });
    }

    if (isTor) {
      findings.push({
        title: `IP ${ip} is a known Tor exit node`,
        description: `This IP address is a confirmed Tor exit node according to AbuseIPDB. Tor is used to anonymize internet traffic and is frequently associated with threat actors conducting reconnaissance, data exfiltration, or attacks.`,
        severity: 'HIGH',
        category: 'ANONYMIZATION',
        mitreAttack: 'T1090.003',
        indicator: ip,
        evidence: { ip, isTor: true, abuseScore, permalink: `https://www.abuseipdb.com/check/${ip}` },
      });
    }

    // Flag hosting/VPN IP ranges used for attacks
    if (usageType && ['Data Center/Web Hosting/Transit', 'Content Delivery Network'].includes(usageType) && abuseScore >= 10) {
      findings.push({
        title: `IP ${ip} is hosted infrastructure with abuse reports`,
        description: `This IP belongs to a data center or hosting provider (${isp}) and has abuse reports. Cloud-hosted IPs are frequently used as C2 infrastructure by threat actors.`,
        severity: 'LOW',
        category: 'C2_INFRASTRUCTURE',
        mitreAttack: 'T1583.003',
        indicator: ip,
        evidence: { ip, usageType, isp, abuseScore },
      });
    }

    return {
      riskScore,
      findings,
      abuseScore,
      totalReports,
      lastReportedAt,
      isp,
      usageType,
      countryCode,
      isTor,
    };
  } catch (err: any) {
    console.error('[AbuseIPDB] Check error:', err.message);
    return null;
  }
}

// Resolve domain to IPs then check each
export async function checkDomainReputation(domain: string): Promise<AbuseIPDBResult | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  // AbuseIPDB doesn't check domains directly — check blacklist status
  try {
    // Use the blacklist endpoint to check if domain's IP is known bad
    // For domain reputation, we use the check endpoint with the domain
    const res = await fetch(
      `${ABUSEIPDB_BASE}/check?ipAddress=${encodeURIComponent(domain)}&maxAgeInDays=90`,
      {
        headers: { 'Key': apiKey, 'Accept': 'application/json' },
      }
    );

    if (!res.ok) return null;
    const data = await res.json();

    // If AbuseIPDB resolves the domain and has data, return it
    if (data.data?.abuseConfidenceScore !== undefined) {
      return checkIPReputation(data.data.ipAddress ?? domain);
    }

    return null;
  } catch {
    return null;
  }
}

function isPublicIp(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4) return false;
  // Filter RFC 1918 private ranges
  if (parts[0] === 10) return false;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return false;
  if (parts[0] === 192 && parts[1] === 168) return false;
  if (parts[0] === 127) return false;
  if (parts[0] === 0) return false;
  if (parts[0] >= 224) return false; // Multicast/reserved
  return true;
}
