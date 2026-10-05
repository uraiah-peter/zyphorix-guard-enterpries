import { describe, it, expect } from 'vitest';
import { UrlHeuristicProvider } from '@/lib/scanning/providers/url-heuristic';

const provider = new UrlHeuristicProvider();

async function scan(url: string) {
  return provider.analyze({ type: 'URL', value: url });
}

describe('UrlHeuristicProvider', () => {
  describe('safe URLs', () => {
    it('returns SAFE for a clean HTTPS URL', async () => {
      const result = await scan('https://google.com/search?q=test');
      expect(result.riskScore).toBeLessThanOrEqual(20);
      expect(result.riskLevel).toBe('SAFE');
    });

    it('returns low risk for known safe domains', async () => {
      const result = await scan('https://github.com/microsoft/vscode');
      expect(result.riskScore).toBeLessThanOrEqual(30);
    });
  });

  describe('IP address as hostname', () => {
    it('flags raw IP address as HIGH severity', async () => {
      const result = await scan('http://192.168.1.1/login');
      expect(result.riskScore).toBeGreaterThanOrEqual(40);
      expect(result.findings.some(f => f.title.includes('IP address'))).toBe(true);
      expect(result.findings[0].mitreAttack).toBe('T1583.003');
    });
  });

  describe('brand impersonation', () => {
    it('detects PayPal impersonation on suspicious TLD', async () => {
      const result = await scan('http://paypal-secure-login.tk/account/verify');
      expect(result.riskScore).toBeGreaterThanOrEqual(60);
      expect(result.riskLevel).not.toBe('SAFE');
      const brands = result.findings.filter(f => f.category === 'PHISHING');
      expect(brands.length).toBeGreaterThan(0);
    });

    it('detects Microsoft impersonation', async () => {
      const result = await scan('https://microsoft-account-verify.xyz/signin');
      expect(result.riskScore).toBeGreaterThanOrEqual(50);
      expect(result.findings.some(f => f.category === 'PHISHING' || f.category === 'SUSPICIOUS_DOMAIN')).toBe(true);
    });
  });

  describe('malicious file extensions', () => {
    it('flags .exe download URL as CRITICAL', async () => {
      const result = await scan('https://example.com/download/update.exe');
      expect(result.riskScore).toBeGreaterThanOrEqual(50);
      const malwareFinding = result.findings.find(f => f.category === 'MALWARE');
      expect(malwareFinding).toBeDefined();
      expect(malwareFinding?.severity).toBe('CRITICAL');
      expect(malwareFinding?.mitreAttack).toBe('T1204.002');
    });

    it('flags .ps1 PowerShell script', async () => {
      const result = await scan('http://evil.com/payload.ps1');
      expect(result.findings.some(f => f.category === 'MALWARE')).toBe(true);
    });
  });

  describe('URL shorteners', () => {
    it('flags bit.ly shortener', async () => {
      const result = await scan('https://bit.ly/3xAb2cd');
      expect(result.findings.some(f => f.category === 'SUSPICIOUS_URL')).toBe(true);
    });
  });

  describe('URL encoding obfuscation', () => {
    it('detects percent-encoded obfuscation', async () => {
      const result = await scan('https://paypal%2Ecom.evil.tk/login');
      expect(result.findings.some(f => f.category === 'OBFUSCATION')).toBe(true);
      expect(result.findings.some(f => f.mitreAttack === 'T1027')).toBe(true);
    });
  });

  describe('HTTP protocol', () => {
    it('flags HTTP as low risk', async () => {
      const result = await scan('http://legitimate-looking-site.com/page');
      const httpFinding = result.findings.find(f => f.category === 'INSECURE_CONNECTION');
      expect(httpFinding).toBeDefined();
      expect(httpFinding?.severity).toBe('LOW');
    });
  });

  describe('suspicious TLD', () => {
    it('flags .tk TLD', async () => {
      const result = await scan('https://random-site.tk/page');
      expect(result.findings.some(f => f.category === 'SUSPICIOUS_DOMAIN')).toBe(true);
    });

    it('flags .xyz TLD', async () => {
      const result = await scan('https://free-bitcoin.xyz/claim');
      expect(result.findings.some(f => f.category === 'SUSPICIOUS_DOMAIN')).toBe(true);
    });
  });

  describe('invalid URL', () => {
    it('handles invalid URLs gracefully', async () => {
      const result = await scan('not-a-url-at-all!!!');
      // Scanner parses 'not-a-url' with http:// prefix fallback - score is low
      expect(result.riskScore).toBeLessThanOrEqual(20);
    });
  });

  describe('provider metadata', () => {
    it('has correct provider name and version', () => {
      expect(provider.name).toBe('url-heuristic');
      expect(provider.supportedTypes).toContain('URL');
      expect(provider.supportedTypes).not.toContain('EMAIL');
    });
  });
});
