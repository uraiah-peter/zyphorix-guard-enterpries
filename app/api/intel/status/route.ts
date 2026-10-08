export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

export async function GET() {
  const status = {
    virustotal: {
      configured: !!process.env.VIRUSTOTAL_API_KEY,
      label: 'VirusTotal',
      description: '70+ AV engines for URL and file scanning',
      freeLimit: '500 scans/day',
      signupUrl: 'https://www.virustotal.com/gui/join-us',
      covers: ['URL Scanner', 'File Scanner'],
    },
    abuseipdb: {
      configured: !!process.env.ABUSEIPDB_API_KEY,
      label: 'AbuseIPDB',
      description: 'Real-time IP and domain reputation database',
      freeLimit: '1,000 checks/day',
      signupUrl: 'https://www.abuseipdb.com/register',
      covers: ['Domain & IP Scanner'],
    },
    dmarc: {
      configured: true,
      label: 'DMARC/SPF/DKIM',
      description: 'Free DNS-based email authentication verification',
      freeLimit: 'Unlimited',
      signupUrl: null,
      covers: ['Email Scanner'],
    },
  };

  const configuredCount = Object.values(status).filter(s => s.configured).length;
  const accuracyLevel =
    configuredCount === 3 ? 'Full accuracy — all threat intel active' :
    configuredCount === 2 ? 'High accuracy — most threat intel active' :
    configuredCount === 1 ? 'Basic accuracy — DMARC only (free)' :
    'Heuristic only — add API keys for real accuracy';

  return NextResponse.json({ status, configuredCount, accuracyLevel });
}
