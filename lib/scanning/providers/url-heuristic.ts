import type { ScanProvider, ScanInput, ScanProviderResult, ScanFindingResult, RiskLevel } from './base';
import { scoreToLevel } from './base';

// ─── URL Heuristic Scanner ─────────────────────────────────────────────────
// Analyzes URL structure, domain characteristics, and common phishing patterns.
// Does NOT fetch the URL — purely structural and heuristic analysis.

export class UrlHeuristicProvider implements ScanProvider {
  name = 'url-heuristic';
  version = '2.1.0';
  supportedTypes = ['URL' as const];

  // Known malicious TLDs with higher risk weighting
  private readonly SUSPICIOUS_TLDS = new Set(['.tk', '.ml', '.ga', '.cf', '.gq', '.xyz', '.top', '.work', '.click', '.link', '.loan', '.win', '.download', '.stream', '.party', '.racing']);
  private readonly SAFE_DOMAINS = new Set(['google.com', 'microsoft.com', 'apple.com', 'amazon.com', 'github.com', 'stackoverflow.com', 'cloudflare.com', 'mozilla.org']);
  private readonly BRAND_KEYWORDS = ['paypal', 'apple', 'microsoft', 'google', 'amazon', 'netflix', 'facebook', 'instagram', 'twitter', 'chase', 'wells-fargo', 'bank', 'secure', 'signin', 'login', 'verify', 'account', 'update', 'confirm'];
  private readonly SUSPICIOUS_PATTERNS = [/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/, /bit\.ly|tinyurl|t\.co|goo\.gl|ow\.ly/, /%[0-9a-f]{2}/i, /\.(exe|dll|bat|cmd|msi|vbs|ps1|jar|dmg)$/i];
  private readonly PHISHING_PATHS = ['/login', '/signin', '/verify', '/confirm', '/secure', '/update', '/account', '/password', '/credential', '/validate'];
  private readonly FREE_HOSTINGS = ['blogspot.com', 'wordpress.com', 'weebly.com', 'wix.com', 'pages.dev', 'netlify.app', 'vercel.app', 'glitch.me', 'replit.dev'];

  async analyze(input: ScanInput): Promise<ScanProviderResult> {
    const findings: ScanFindingResult[] = [];
    let score = 0;

    let url: URL;
    try {
      url = new URL(input.value.startsWith('http') ? input.value : `http://${input.value}`);
    } catch {
      return { providerName: this.name, version: this.version, riskScore: 0, riskLevel: 'SAFE', classification: 'Invalid URL format', findings: [] };
    }

    const hostname = url.hostname.toLowerCase();
    const fullUrl = input.value.toLowerCase();
    const path = url.pathname.toLowerCase();

    // ── Check 1: IP address as hostname (high risk) ──────────────────────
    if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      score += 40;
      findings.push({ title: 'IP address used as hostname', description: `The URL uses a raw IP address (${hostname}) instead of a domain name. Legitimate services rarely host content directly on IP addresses.`, severity: 'HIGH', category: 'SUSPICIOUS_URL', indicator: hostname, mitreAttack: 'T1583.003', evidence: { ip: hostname } });
    }

    // ── Check 2: Known safe domain ───────────────────────────────────────
    const baseDomain = hostname.split('.').slice(-2).join('.');
    if (this.SAFE_DOMAINS.has(baseDomain) && !hostname.includes(baseDomain + '.') && hostname !== baseDomain) {
      // It's a subdomain — not automatically safe, but not penalized
    } else if (this.SAFE_DOMAINS.has(baseDomain)) {
      // Exact match — safe baseline
      score = Math.max(0, score - 10);
    }

    // ── Check 3: Suspicious TLD ──────────────────────────────────────────
    const tldMatch = hostname.match(/\.[a-z]{2,}$/);
    if (tldMatch && this.SUSPICIOUS_TLDS.has(tldMatch[0])) {
      score += 25;
      findings.push({ title: 'Suspicious top-level domain', description: `The TLD "${tldMatch[0]}" is frequently associated with free/disposable domains used in phishing campaigns.`, severity: 'MEDIUM', category: 'SUSPICIOUS_DOMAIN', indicator: tldMatch[0], mitreAttack: 'T1566.002', evidence: { tld: tldMatch[0] } });
    }

    // ── Check 4: Brand impersonation ─────────────────────────────────────
    const impersonatedBrands: string[] = [];
    for (const brand of this.BRAND_KEYWORDS) {
      if (hostname.includes(brand) && !this.SAFE_DOMAINS.has(baseDomain)) {
        impersonatedBrands.push(brand);
      }
    }
    if (impersonatedBrands.length > 0) {
      score += 35;
      findings.push({ title: 'Brand impersonation detected', description: `The domain contains brand-related keywords (${impersonatedBrands.join(', ')}) that are commonly used to deceive users into thinking they are on a legitimate site.`, severity: 'HIGH', category: 'PHISHING', indicator: hostname, mitreAttack: 'T1566.001', evidence: { brands: impersonatedBrands, domain: hostname } });
    }

    // ── Check 5: URL encoding / obfuscation ─────────────────────────────
    if (/%[0-9a-f]{2}/i.test(input.value)) {
      score += 20;
      findings.push({ title: 'URL encoding obfuscation', description: 'The URL contains percent-encoded characters that may be used to obscure the true destination or bypass URL filters.', severity: 'MEDIUM', category: 'OBFUSCATION', mitreAttack: 'T1027', evidence: { encodedChars: input.value.match(/%[0-9a-f]{2}/gi) } });
    }

    // ── Check 6: Suspicious file extension ──────────────────────────────
    const maliciousExt = path.match(/\.(exe|dll|bat|cmd|msi|vbs|ps1|jar|dmg|scr|pif|com|hta)$/i);
    if (maliciousExt) {
      score += 50;
      findings.push({ title: 'Malicious file extension in URL', description: `The URL points to a file with the extension "${maliciousExt[1]}" which is an executable or script type. Downloading this file could compromise your system.`, severity: 'CRITICAL', category: 'MALWARE', indicator: maliciousExt[1], mitreAttack: 'T1204.002', evidence: { extension: maliciousExt[1] } });
    }

    // ── Check 7: URL shortener ───────────────────────────────────────────
    if (/bit\.ly|tinyurl|t\.co|goo\.gl|ow\.ly|rb\.gy|cutt\.ly/.test(hostname)) {
      score += 15;
      findings.push({ title: 'URL shortener detected', description: 'This URL uses a link shortening service that hides the true destination. Threat actors use shorteners to disguise malicious links.', severity: 'LOW', category: 'SUSPICIOUS_URL', indicator: hostname, mitreAttack: 'T1566.002', evidence: { shortener: hostname } });
    }

    // ── Check 8: Suspicious path patterns ───────────────────────────────
    const suspiciousPath = this.PHISHING_PATHS.find(p => path.includes(p));
    if (suspiciousPath && impersonatedBrands.length > 0) {
      score += 20;
      findings.push({ title: 'Phishing path pattern', description: `Combined with brand keywords, the path "${suspiciousPath}" suggests a credential harvesting page.`, severity: 'HIGH', category: 'CREDENTIAL_THEFT', indicator: suspiciousPath, mitreAttack: 'T1056.003' });
    }

    // ── Check 9: Excessive subdomains ───────────────────────────────────
    const subdomainCount = hostname.split('.').length - 2;
    if (subdomainCount > 3) {
      score += 20;
      findings.push({ title: 'Excessive subdomain depth', description: `The URL has ${subdomainCount} subdomain levels. Attackers use deep subdomain chains to embed legitimate-looking brand names.`, severity: 'MEDIUM', category: 'SUSPICIOUS_URL', evidence: { subdomainCount, hostname } });
    }

    // ── Check 10: No HTTPS ───────────────────────────────────────────────
    if (url.protocol === 'http:') {
      score += 10;
      findings.push({ title: 'Unencrypted HTTP connection', description: 'The URL uses HTTP instead of HTTPS. Sensitive data transmitted over HTTP is visible to network observers.', severity: 'LOW', category: 'INSECURE_CONNECTION', evidence: { protocol: 'http' } });
    }

    // ── Check 11: Free hosting platforms ────────────────────────────────
    const freeHost = this.FREE_HOSTINGS.find(h => hostname.endsWith(h));
    if (freeHost && impersonatedBrands.length > 0) {
      score += 25;
      findings.push({ title: 'Phishing on free hosting', description: `A page impersonating "${impersonatedBrands[0]}" is hosted on ${freeHost}, a free hosting platform. Legitimate companies use their own domains.`, severity: 'HIGH', category: 'PHISHING', mitreAttack: 'T1583.001', evidence: { host: freeHost } });
    }

    score = Math.min(100, score);
    const riskLevel = scoreToLevel(score); // initial level
    const classification = score === 0 ? 'Clean' : riskLevel === 'SAFE' ? 'Likely Safe' : riskLevel === 'LOW' ? 'Minor Concerns' : riskLevel === 'MEDIUM' ? 'Suspicious URL' : riskLevel === 'HIGH' ? 'Likely Phishing' : 'Malicious URL';

    return { providerName: this.name, version: this.version, riskScore: score, riskLevel, classification, findings, metadata: { hostname, protocol: url.protocol, path } };
  }
}
