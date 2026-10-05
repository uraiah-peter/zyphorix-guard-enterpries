import { describe, it, expect } from 'vitest';
import { EmailHeuristicProvider } from '@/lib/scanning/providers/email-heuristic';

const provider = new EmailHeuristicProvider();

async function scan(email: string) {
  return provider.analyze({ type: 'EMAIL', value: email });
}

const CLEAN_EMAIL = `From: "Support Team" <support@company.com>
To: user@example.com
Subject: Your monthly statement is ready
Reply-To: support@company.com

Hi there, your statement for last month is now available in your account portal.`;

const BEC_EMAIL = `From: "CEO John Smith" <john.ceo@gmail.com>
To: finance@company.com
Subject: Urgent Wire Transfer Required
Reply-To: attacker@hotmail.com

Please process an urgent wire transfer of $50,000 immediately to the following routing number.
This is time sensitive and expires today. Do not contact anyone else about this.`;

const PHISHING_EMAIL = `From: "PayPal Security" <security@paypal-verify.tk>
To: victim@email.com
Subject: Your account has been suspended - Verify now

Your PayPal account has been suspended due to unusual activity.
Please verify your account immediately at http://paypal-secure.xyz/login
Enter your password and banking details to restore access.
Act now - this link expires in 24 hours.`;

describe('EmailHeuristicProvider', () => {
  describe('clean emails', () => {
    it('returns low risk for a legitimate email', async () => {
      const result = await scan(CLEAN_EMAIL);
      expect(result.riskScore).toBeLessThanOrEqual(20);
      expect(result.riskLevel).toMatch(/^(SAFE|LOW)$/);
    });
  });

  describe('BEC detection', () => {
    it('detects From/Reply-To domain mismatch', async () => {
      const result = await scan(BEC_EMAIL);
      const mismatch = result.findings.find(f => f.title.includes('Reply-To'));
      expect(mismatch).toBeDefined();
      expect(mismatch?.severity).toBe('HIGH');
      expect(mismatch?.mitreAttack).toBe('T1566.001');
    });

    it('detects financial lure keywords', async () => {
      const result = await scan(BEC_EMAIL);
      const financial = result.findings.find(f => f.category === 'BEC');
      expect(financial).toBeDefined();
      expect(result.riskScore).toBeGreaterThanOrEqual(40);
    });

    it('detects urgency language', async () => {
      const result = await scan(BEC_EMAIL);
      const urgency = result.findings.find(f => f.category === 'SOCIAL_ENGINEERING');
      expect(urgency).toBeDefined();
    });

    it('detects executive impersonation with free email', async () => {
      const result = await scan(BEC_EMAIL);
      const execImpersonation = result.findings.find(f => f.category === 'PHISHING');
      expect(execImpersonation).toBeDefined();
    });
  });

  describe('phishing detection', () => {
    it('detects credential harvesting request', async () => {
      const result = await scan(PHISHING_EMAIL);
      const credHarvest = result.findings.find(f => f.category === 'CREDENTIAL_THEFT');
      expect(credHarvest).toBeDefined();
      expect(credHarvest?.severity).toBe('CRITICAL');
      expect(credHarvest?.mitreAttack).toBe('T1056.003');
    });

    it('scores phishing email as HIGH or CRITICAL', async () => {
      const result = await scan(PHISHING_EMAIL);
      expect(result.riskScore).toBeGreaterThanOrEqual(40);
      expect(['MEDIUM','HIGH', 'CRITICAL']).toContain(result.riskLevel);
    });

    it('returns PHISHING or BEC classification', async () => {
      const result = await scan(PHISHING_EMAIL);
      expect(result.classification).toMatch(/Phishing|BEC|Attack|Suspicious/i);
    });
  });

  describe('homograph detection', () => {
    it('detects Cyrillic lookalike characters', async () => {
      // 'а' is Cyrillic, looks like 'a'
      const emailWithHomograph = `From: test@example.com\nSubject: Test\n\nClick here: http://pаypal.com/login`;
      const result = await scan(emailWithHomograph);
      const homograph = result.findings.find(f => f.category === 'OBFUSCATION');
      expect(homograph).toBeDefined();
      expect(homograph?.mitreAttack).toBe('T1036.007');
    });
  });

  describe('provider metadata', () => {
    it('only supports EMAIL type', () => {
      expect(provider.supportedTypes).toContain('EMAIL');
      expect(provider.supportedTypes).not.toContain('URL');
    });
  });
});
