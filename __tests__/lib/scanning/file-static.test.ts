import { describe, it, expect } from 'vitest';
import { FileStaticProvider } from '@/lib/scanning/providers/file-static';
import crypto from 'crypto';

const provider = new FileStaticProvider();

function toBase64(buffer: Buffer): string { return buffer.toString('base64'); }
function makeFile(content: Buffer, filename: string) {
  return { type: 'FILE' as const, value: toBase64(content), filename };
}

// EICAR test file (safe to use, universally detected as test malware)
const EICAR_HASH = '275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f';
// Create a buffer whose SHA-256 matches EICAR (we just need the hash to match)
// For testing, we use a dummy buffer and verify the hash logic separately

const PE_MAGIC = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]); // MZ header
const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]); // %PDF-1.4
const CLEAN_TEXT = Buffer.from('Hello, this is a plain text document with normal content.');

describe('FileStaticProvider', () => {
  describe('clean files', () => {
    it('returns SAFE for a plain text file', async () => {
      const result = await provider.analyze(makeFile(CLEAN_TEXT, 'readme.txt'));
      expect(result.riskScore).toBeLessThanOrEqual(20);
      expect(result.riskLevel).toMatch(/^(SAFE|LOW)$/);
    });

    it('returns low risk for a PDF file', async () => {
      const result = await provider.analyze(makeFile(PDF_MAGIC, 'document.pdf'));
      expect(result.riskScore).toBeLessThanOrEqual(30);
    });
  });

  describe('dangerous extensions', () => {
    it('flags .exe files as HIGH severity', async () => {
      const result = await provider.analyze(makeFile(CLEAN_TEXT, 'setup.exe'));
      expect(result.riskScore).toBeGreaterThanOrEqual(45);
      const finding = result.findings.find(f => f.category === 'MALWARE');
      expect(finding).toBeDefined();
      expect(finding?.severity).toBe('HIGH');
      expect(finding?.mitreAttack).toBe('T1204.002');
    });

    it('flags .ps1 PowerShell scripts', async () => {
      const result = await provider.analyze(makeFile(CLEAN_TEXT, 'payload.ps1'));
      expect(result.findings.some(f => f.category === 'MALWARE')).toBe(true);
    });

    it('flags .vbs Visual Basic scripts', async () => {
      const result = await provider.analyze(makeFile(CLEAN_TEXT, 'macro.vbs'));
      expect(result.findings.some(f => f.category === 'MALWARE')).toBe(true);
    });
  });

  describe('magic byte detection', () => {
    it('detects PE executable disguised as .pdf', async () => {
      const result = await provider.analyze(makeFile(PE_MAGIC, 'invoice.pdf'));
      const finding = result.findings.find(f => f.category === 'MALWARE' && f.severity === 'CRITICAL');
      expect(finding).toBeDefined();
      expect(finding?.title).toMatch(/disguised/i);
      expect(finding?.mitreAttack).toBe('T1036.007');
    });

    it('detects PE executable disguised as .txt', async () => {
      const result = await provider.analyze(makeFile(PE_MAGIC, 'readme.txt'));
      expect(result.riskScore).toBeGreaterThanOrEqual(55);
      expect(result.findings.some(f => f.mitreAttack === 'T1036.007')).toBe(true);
    });
  });

  describe('double extension', () => {
    it('detects invoice.pdf.exe double extension', async () => {
      const result = await provider.analyze(makeFile(CLEAN_TEXT, 'invoice.pdf.exe'));
      // Double extension + dangerous ext combo - check for MALWARE finding
      expect(result.findings.some(f => f.category === 'MALWARE')).toBe(true);
      expect(result.findings.some(f => f.mitreAttack === 'T1036.007' || f.mitreAttack === 'T1204.002')).toBe(true);
    });
  });

  describe('entropy analysis', () => {
    it('flags high-entropy (encrypted/packed) content', async () => {
      // Generate random bytes to simulate high entropy
      const randomBytes = crypto.randomBytes(4096);
      const result = await provider.analyze(makeFile(randomBytes, 'suspicious.bin'));
      const entropyFinding = result.findings.find(f => f.title.includes('entropy'));
      expect(entropyFinding).toBeDefined();
      expect(entropyFinding?.category).toBe('OBFUSCATION');
      expect(entropyFinding?.mitreAttack).toBe('T1027');
    });

    it('does not flag low-entropy text content', async () => {
      const result = await provider.analyze(makeFile(CLEAN_TEXT, 'normal.txt'));
      expect(result.findings.find(f => f.title.includes('entropy'))).toBeUndefined();
    });
  });

  describe('invalid input', () => {
    it('handles invalid base64 gracefully', async () => {
      // Buffer.from with bad base64 produces empty/garbage buffer - should return low risk
      const result = await provider.analyze({ type: 'FILE', value: '', filename: 'test.txt' });
      expect(result.riskScore).toBeLessThanOrEqual(20);
    });
  });

  describe('provider metadata', () => {
    it('only supports FILE type', () => {
      expect(provider.supportedTypes).toContain('FILE');
      expect(provider.supportedTypes).not.toContain('URL');
    });
  });
});
