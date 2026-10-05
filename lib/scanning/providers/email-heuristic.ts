import type { ScanProvider, ScanInput, ScanProviderResult, ScanFindingResult } from './base';
import { checkEmailAuthentication, extractFromDomain } from './intel/dmarc-checker';
import { scoreToLevel } from './base';

// ─── Email Heuristic Scanner ───────────────────────────────────────────────

export class EmailHeuristicProvider implements ScanProvider {
  name = 'email-heuristic';
  version = '2.0.0';
  supportedTypes = ['EMAIL' as const];

  private readonly URGENCY_WORDS = ['urgent', 'immediately', 'action required', 'suspended', 'verify now', 'expires', 'limited time', 'final notice', 'account locked', 'unusual activity', 'unauthorized access', 'click here', 'act now', 'deadline'];
  private readonly FINANCIAL_LURES = ['wire transfer', 'bank account', 'routing number', 'gift card', 'bitcoin', 'cryptocurrency', 'invoice attached', 'payment required', 'refund', 'tax return', 'irs', 'hmrc'];
  private readonly EXEC_IMPERSONATION = ['ceo', 'cfo', 'president', 'director', 'vp ', 'vice president', 'c-suite', 'board member'];
  private readonly SUSPICIOUS_SENDERS = ['@gmail.com', '@yahoo.com', '@hotmail.com', '@outlook.com'];
  private readonly HOMOGRAPH_CHARS = /[аеорсухАВСЕКМНОРТУХ]/u; // Cyrillic lookalikes

  async analyze(input: ScanInput): Promise<ScanProviderResult> {
    const findings: ScanFindingResult[] = [];
    let score = 0;
    const text = input.value.toLowerCase();
    const lines = input.value.split('\n');

    // ── Extract headers ──────────────────────────────────────────────────
    const fromLine = lines.find(l => l.toLowerCase().startsWith('from:')) ?? '';
    const subjectLine = lines.find(l => l.toLowerCase().startsWith('subject:')) ?? '';
    const replyToLine = lines.find(l => l.toLowerCase().startsWith('reply-to:')) ?? '';
    const body = lines.slice(lines.findIndex(l => l.trim() === '') + 1).join('\n').toLowerCase();

    // ── Check 1: From/Reply-To mismatch ─────────────────────────────────
    const fromEmail = fromLine.match(/<([^>]+)>/)?.[1] ?? fromLine.replace('From:', '').trim();
    const replyToEmail = replyToLine.match(/<([^>]+)>/)?.[1] ?? replyToLine.replace('Reply-To:', '').trim();
    if (fromEmail && replyToEmail && fromEmail !== replyToEmail) {
      const fromDomain = fromEmail.split('@')[1];
      const replyDomain = replyToEmail.split('@')[1];
      if (fromDomain && replyDomain && fromDomain !== replyDomain) {
        score += 40;
        findings.push({ title: 'From/Reply-To domain mismatch', description: `The sender (${fromDomain}) and Reply-To (${replyDomain}) use different domains. This is a strong phishing indicator — replies go to attacker-controlled address.`, severity: 'HIGH', category: 'PHISHING', mitreAttack: 'T1566.001', indicator: replyToEmail, evidence: { from: fromEmail, replyTo: replyToEmail } });
      }
    }

    // ── Check 2: Urgency language ────────────────────────────────────────
    const foundUrgency = this.URGENCY_WORDS.filter(w => text.includes(w));
    if (foundUrgency.length >= 2) {
      score += 20;
      findings.push({ title: 'High-pressure urgency language', description: `The email uses ${foundUrgency.length} urgency phrases (${foundUrgency.slice(0,3).join(', ')}...) to pressure the recipient into acting without thinking.`, severity: 'MEDIUM', category: 'SOCIAL_ENGINEERING', mitreAttack: 'T1566.001', evidence: { phrases: foundUrgency } });
    }

    // ── Check 3: Financial lure ──────────────────────────────────────────
    const foundFinancial = this.FINANCIAL_LURES.filter(w => text.includes(w));
    if (foundFinancial.length > 0) {
      score += 25;
      findings.push({ title: 'Financial lure detected', description: `References to financial terms (${foundFinancial.slice(0,3).join(', ')}) are commonly used in BEC (Business Email Compromise) and wire fraud attacks.`, severity: foundFinancial.includes('wire transfer') || foundFinancial.includes('routing number') ? 'CRITICAL' : 'HIGH', category: 'BEC', mitreAttack: 'T1566.001', evidence: { terms: foundFinancial } });
    }

    // ── Check 4: Executive impersonation ────────────────────────────────
    const fromName = fromLine.match(/^From:\s*"?([^"<]+)"?\s*</)?.[1]?.toLowerCase() ?? '';
    const foundExecTerms = this.EXEC_IMPERSONATION.filter(t => fromName.includes(t) || subjectLine.toLowerCase().includes(t));
    if (foundExecTerms.length > 0) {
      score += 30;
      findings.push({ title: 'Executive impersonation attempt', description: `The email appears to impersonate an executive role (${foundExecTerms[0]}). BEC attacks frequently use executive impersonation to bypass security skepticism.`, severity: 'HIGH', category: 'BEC', mitreAttack: 'T1534', evidence: { terms: foundExecTerms, from: fromLine } });
    }

    // ── Check 5: Free email domain for corporate claim ───────────────────
    const fromDomain = fromEmail.split('@')[1] ?? '';
    const usesFreeEmail = this.SUSPICIOUS_SENDERS.some(s => fromEmail.endsWith(s));
    if (usesFreeEmail && (foundExecTerms.length > 0 || foundFinancial.length > 0)) {
      score += 30;
      findings.push({ title: 'Corporate claim from free email provider', description: `A message claiming executive authority or financial urgency was sent from a free email domain (${fromDomain}). Legitimate corporate emails use company domains.`, severity: 'HIGH', category: 'PHISHING', indicator: fromEmail, evidence: { domain: fromDomain } });
    }

    // ── Check 6: Suspicious URLs in body ────────────────────────────────
    const urlsInBody = body.match(/https?:\/\/[^\s)>\]"]+/g) ?? [];
    const suspiciousUrls = urlsInBody.filter(u => {
      try {
        const h = new URL(u).hostname;
        return /bit\.ly|tinyurl|@|%[0-9a-f]{2}|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(u) || h.split('.').length > 4;
      } catch { return false; }
    });
    if (suspiciousUrls.length > 0) {
      score += 25;
      findings.push({ title: `${suspiciousUrls.length} suspicious link(s) in email body`, description: 'Links in the email body use URL shorteners, IP addresses, or deep subdomain chains that hide the true destination.', severity: 'HIGH', category: 'PHISHING', mitreAttack: 'T1566.001', evidence: { urls: suspiciousUrls.slice(0, 5) } });
    }

    // ── Check 7: Password/credential request ─────────────────────────────
    if (body.includes('password') && (body.includes('enter') || body.includes('provide') || body.includes('confirm'))) {
      score += 30;
      findings.push({ title: 'Credential harvesting attempt', description: 'The email explicitly asks the recipient to enter or provide their password. Legitimate organizations never request passwords via email.', severity: 'CRITICAL', category: 'CREDENTIAL_THEFT', mitreAttack: 'T1056.003' });
    }

    // ── Check 8: Homograph/lookalike characters ───────────────────────────
    if (this.HOMOGRAPH_CHARS.test(input.value)) {
      score += 35;
      findings.push({ title: 'Unicode homograph characters detected', description: 'The email contains Unicode characters that visually resemble Latin letters but are from different scripts (e.g., Cyrillic). This technique is used to deceive visual inspection.', severity: 'HIGH', category: 'OBFUSCATION', mitreAttack: 'T1036.007' });
    }

    score = Math.min(100, score);
    // ── DMARC / SPF / DKIM DNS verification (free, no API key needed) ──
    try {
      const fromDomain = extractFromDomain(input.value);
      if (fromDomain) {
        const dmarcResult = await checkEmailAuthentication(fromDomain);
        if (dmarcResult) {
          findings.push(...dmarcResult.findings);
          score += dmarcResult.riskScore;
        }
      }
    } catch {}

    score = Math.min(100, score);
    const riskLevel = scoreToLevel(score);
    const classification = score <= 10 ? 'Legitimate Email' : score <= 30 ? 'Minor Concerns' : score <= 55 ? 'Suspicious Email' : score <= 75 ? 'Likely Phishing' : 'Phishing / BEC Attack';

    return { providerName: this.name, version: this.version, riskScore: score, riskLevel, classification, findings, metadata: { fromEmail, subject: subjectLine, urlCount: urlsInBody.length } };
  }
}
