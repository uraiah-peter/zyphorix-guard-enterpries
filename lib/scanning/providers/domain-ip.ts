import type { ScanProvider, ScanInput, ScanProviderResult, ScanFindingResult } from './base';
import { checkIPReputation, checkDomainReputation } from './intel/abuseipdb';
import { scoreToLevel } from './base';

// ─── Domain / IP Reputation Provider ──────────────────────────────────────
// Analyzes domains and IP addresses using heuristic rules.
// Phase 4+ will integrate real threat intel APIs (VirusTotal, AbuseIPDB).

export class DomainIpProvider implements ScanProvider {
  name = 'domain-ip-heuristic';
  version = '2.0.0';
  supportedTypes = ['DOMAIN_IP' as const];

  private readonly TOR_EXIT_RANGES = ['185.220.', '199.249.', '23.129.', '104.244.'];
  private readonly CLOUD_RANGES = ['34.', '35.', '52.', '54.', '13.', '18.', '54.', '3.'];
  private readonly SUSPICIOUS_TLDS = new Set(['.tk', '.ml', '.ga', '.cf', '.gq', '.xyz', '.top', '.click', '.work', '.loan', '.win', '.download', '.stream', '.party', '.racing', '.bid', '.date', '.faith', '.review']);
  private readonly DISPOSABLE_DOMAINS = ['mailinator.com', 'guerrillamail.com', 'tempmail.com', 'throwam.com', '10minutemail.com', 'yopmail.com', 'sharklasers.com', 'trashmail.com'];
  private readonly KNOWN_BAD_PATTERNS = [/^.*-seo\d+\..+$/, /^.*login-.*\..+$/, /^.*secure-.*\..+$/, /^.*verify-.*\..+$/, /^.*account-.*\..+$/];

  async analyze(input: ScanInput): Promise<ScanProviderResult> {
    const findings: ScanFindingResult[] = [];
    let score = 0;
    const target = input.value.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0];

    const isIp = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(target);
    const isIpv6 = target.includes(':');
    const domain = isIp || isIpv6 ? null : target;

    // ── IP Analysis ──────────────────────────────────────────────────────
    if (isIp) {
      const octets = target.split('.').map(Number);

      // RFC 1918 private ranges
      if (octets[0] === 10 || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) || (octets[0] === 192 && octets[1] === 168)) {
        findings.push({ title: 'Private/internal IP address', description: `${target} is an RFC 1918 private address, not routable on the public internet. If seen in external traffic, this may indicate IP spoofing or SSRF.`, severity: 'LOW', category: 'NETWORK_INTEL', evidence: { ip: target, range: 'RFC1918' } });
        score += 5;
      }

      // Loopback
      if (octets[0] === 127) {
        findings.push({ title: 'Loopback address', description: 'This address (127.x.x.x) refers to the local machine. External references to loopback addresses can indicate SSRF attempts.', severity: 'MEDIUM', category: 'SSRF', mitreAttack: 'T1190', evidence: { ip: target } });
        score += 25;
      }

      // Known Tor exit ranges (heuristic)
      const isTorExit = this.TOR_EXIT_RANGES.some(r => target.startsWith(r));
      if (isTorExit) {
        score += 40;
        findings.push({ title: 'Possible Tor exit node', description: `${target} falls within IP ranges associated with Tor exit nodes. Tor is used to anonymize traffic and is frequently associated with threat actor infrastructure.`, severity: 'HIGH', category: 'ANONYMIZATION', mitreAttack: 'T1090.003', evidence: { ip: target } });
      }

      // Cloud hosting IP
      const isCloud = this.CLOUD_RANGES.some(r => target.startsWith(r));
      if (isCloud && !isTorExit) {
        findings.push({ title: 'Cloud-hosted IP', description: `${target} appears to be hosted on a major cloud provider. Cloud IPs are used legitimately but also frequently by threat actors for C2 infrastructure.`, severity: 'LOW', category: 'NETWORK_INTEL', evidence: { ip: target } });
        score += 5;
      }
    }

    // ── Domain Analysis ──────────────────────────────────────────────────
    if (domain) {
      const parts = domain.split('.');
      const tld = '.' + parts.slice(-1)[0];
      const baseDomain = parts.slice(-2).join('.');
      const subdomains = parts.slice(0, -2);

      // Suspicious TLD
      if (this.SUSPICIOUS_TLDS.has(tld)) {
        score += 25;
        findings.push({ title: `High-risk TLD: ${tld}`, description: `The TLD "${tld}" is frequently used for malicious infrastructure due to low registration costs and minimal identity verification.`, severity: 'MEDIUM', category: 'SUSPICIOUS_DOMAIN', mitreAttack: 'T1583.001', evidence: { tld, domain } });
      }

      // Disposable email domain
      if (this.DISPOSABLE_DOMAINS.includes(baseDomain)) {
        score += 30;
        findings.push({ title: 'Disposable/temporary email domain', description: `${baseDomain} is a known disposable email service. These are used to create throwaway accounts to avoid traceability.`, severity: 'HIGH', category: 'ANONYMIZATION', evidence: { domain: baseDomain } });
      }

      // Domain length heuristic (DGA — Domain Generation Algorithm)
      const domainLabel = parts[parts.length - 2] ?? '';
      if (domainLabel.length > 15 && /[0-9]/.test(domainLabel) && /[a-z]/.test(domainLabel)) {
        const consonantRatio = (domainLabel.match(/[bcdfghjklmnpqrstvwxyz]/g) ?? []).length / domainLabel.length;
        if (consonantRatio > 0.65) {
          score += 35;
          findings.push({ title: 'Possible DGA domain', description: `The domain "${domainLabel}" exhibits characteristics of Domain Generation Algorithm (DGA) domains: high consonant ratio (${(consonantRatio * 100).toFixed(0)}%), mixed alphanumeric, excessive length. DGA domains are used by malware for C2 communication.`, severity: 'HIGH', category: 'C2_INFRASTRUCTURE', mitreAttack: 'T1568.002', evidence: { domain: domainLabel, consonantRatio } });
        }
      }

      // Suspicious patterns
      const matchedPattern = this.KNOWN_BAD_PATTERNS.find(p => p.test(domain));
      if (matchedPattern) {
        score += 30;
        findings.push({ title: 'Suspicious domain naming pattern', description: `The domain "${domain}" matches patterns commonly used in phishing infrastructure (e.g., login-, secure-, verify- prefixes).`, severity: 'HIGH', category: 'PHISHING', mitreAttack: 'T1583.001', evidence: { domain } });
      }

      // Excessive subdomain depth
      if (subdomains.length > 3) {
        score += 15;
        findings.push({ title: 'Excessive subdomain depth', description: `The domain has ${subdomains.length} subdomain levels. Deep subdomain chains are used to embed brand names while keeping the malicious registrar domain hidden.`, severity: 'MEDIUM', category: 'SUSPICIOUS_DOMAIN', evidence: { subdomainCount: subdomains.length, domain } });
      }

      // Numeric-heavy domain (botnet C2 heuristic)
      const digitCount = (domainLabel.match(/\d/g) ?? []).length;
      if (digitCount > 4) {
        score += 15;
        findings.push({ title: 'High numeric content in domain', description: `The domain contains ${digitCount} digits. High numeric content is associated with algorithmically generated domains used by botnets.`, severity: 'LOW', category: 'SUSPICIOUS_DOMAIN', evidence: { domain, digitCount } });
      }
    }

    // ── AbuseIPDB reputation check (if API key configured) ────────────
    try {
      const abuseResult = isIp
        ? await checkIPReputation(target)
        : await checkDomainReputation(target);
      if (abuseResult && (abuseResult.riskScore > 0 || abuseResult.findings.length > 0)) {
        findings.push(...abuseResult.findings);
        score = Math.max(score, abuseResult.riskScore);
      }
    } catch {}

    score = Math.min(100, score);
    const riskLevel = scoreToLevel(score);
    const classification = isIp
      ? score <= 10 ? 'Clean IP' : score <= 40 ? 'Low Risk IP' : score <= 65 ? 'Suspicious IP' : 'High Risk IP'
      : score <= 10 ? 'Clean Domain' : score <= 40 ? 'Low Risk Domain' : score <= 65 ? 'Suspicious Domain' : score <= 85 ? 'Malicious Domain' : 'Confirmed Malicious';

    return { providerName: this.name, version: this.version, riskScore: score, riskLevel, classification, findings, metadata: { target, isIp, domain } };
  }
}
