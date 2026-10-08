import type { ScanProvider, ScanInput, ScanProviderResult, ScanFindingResult } from './base';
import { scanHashWithVT } from './intel/virustotal';
import { scoreToLevel } from './base';
import crypto from 'crypto';

// ─── File Static Analysis Provider ────────────────────────────────────────
// Analyzes files via: hash lookup, extension check, magic bytes, entropy.
// Input: base64-encoded file content.

export class FileStaticProvider implements ScanProvider {
  name = 'file-static';
  version = '2.0.0';
  supportedTypes = ['FILE' as const];

  private readonly DANGEROUS_EXTENSIONS = new Set(['.exe','.dll','.bat','.cmd','.msi','.vbs','.js','.jse','.ps1','.psm1','.psd1','.com','.scr','.pif','.hta','.jar','.war','.class','.sh','.bash','.zsh','.fish','.py','.rb','.pl','.php','.asp','.aspx']);
  private readonly SAFE_EXTENSIONS = new Set(['.txt','.pdf','.png','.jpg','.jpeg','.gif','.webp','.svg','.csv','.json','.xml','.md','.docx','.xlsx','.pptx','.zip','.mp4','.mp3']);

  // Magic bytes signatures (hex prefixes → file type)
  private readonly MAGIC_BYTES: Array<{ hex: string; type: string; dangerous: boolean }> = [
    { hex: '4d5a', type: 'Windows PE Executable (MZ)', dangerous: true },
    { hex: '7f454c46', type: 'Linux ELF Executable', dangerous: true },
    { hex: 'cafebabe', type: 'Java Class/Mach-O Binary', dangerous: true },
    { hex: '504b0304', type: 'ZIP Archive', dangerous: false },
    { hex: '25504446', type: 'PDF Document', dangerous: false },
    { hex: 'ffd8ffe0', type: 'JPEG Image', dangerous: false },
    { hex: '89504e47', type: 'PNG Image', dangerous: false },
    { hex: 'd0cf11e0', type: 'OLE2 Compound (legacy Office/MSI)', dangerous: true },
    { hex: '504b030414000600', type: 'OOXML (Office 2007+ with macros)', dangerous: true },
  ];

  private readonly KNOWN_MALICIOUS_HASHES = new Set([
    // Well-known test hashes (EICAR standard)
    '275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f',
    '44d88612fea8a8f36de82e1278abb02f',
  ]);

  async analyze(input: ScanInput): Promise<ScanProviderResult> {
    const findings: ScanFindingResult[] = [];
    let score = 0;

    // Decode base64 content
    let buffer: Buffer;
    try {
      buffer = Buffer.from(input.value, 'base64');
    } catch {
      return { providerName: this.name, version: this.version, riskScore: 0, riskLevel: 'SAFE', classification: 'Invalid file data', findings: [] };
    }

    const filename = input.filename ?? 'unknown';
    const rawExt = filename.split('.').pop()?.toLowerCase();
    const ext = rawExt ? '.' + rawExt : '';
    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');

    // ── VirusTotal hash lookup (if API key configured) ──────────────────
    try {
      const vtResult = await scanHashWithVT(sha256, input.filename);
      if (vtResult && (vtResult.riskScore > 0 || vtResult.findings.length > 0)) {
        findings.push(...vtResult.findings);
        score = Math.max(score, vtResult.riskScore);
      }
    } catch {}
    const md5 = crypto.createHash('md5').update(buffer).digest('hex');
    const fileSize = buffer.length;

    // ── Check 1: Known malicious hash ───────────────────────────────────
    if (this.KNOWN_MALICIOUS_HASHES.has(sha256) || this.KNOWN_MALICIOUS_HASHES.has(md5)) {
      score = 100;
      findings.push({ title: 'Known malicious file hash', description: `This file matches a known malicious hash in the threat intelligence database (SHA-256: ${sha256.substring(0,16)}...).`, severity: 'CRITICAL', category: 'MALWARE', indicator: sha256, mitreAttack: 'T1204.002', evidence: { sha256, md5 } });
    }

    // ── Check 2: Dangerous extension ─────────────────────────────────────
    if (this.DANGEROUS_EXTENSIONS.has(ext)) {
      score += 45;
      findings.push({ title: `Dangerous file extension: ${ext}`, description: `Files with the "${ext}" extension can execute code and are frequently used to deliver malware. Do not execute this file unless you trust the source completely.`, severity: 'HIGH', category: 'MALWARE', indicator: ext, mitreAttack: 'T1204.002', evidence: { extension: ext, filename } });
    }

    // ── Check 3: Magic bytes vs extension mismatch ────────────────────────
    const hexPrefix = buffer.slice(0, 8).toString('hex');
    let detectedType: string | null = null;
    let typeDangerous = false;
    for (const sig of this.MAGIC_BYTES) {
      if (hexPrefix.startsWith(sig.hex)) {
        detectedType = sig.type;
        typeDangerous = sig.dangerous;
        break;
      }
    }

    if (detectedType && typeDangerous && !this.DANGEROUS_EXTENSIONS.has(ext)) {
      score += 55;
      findings.push({ title: 'Executable disguised as another file type', description: `The file content is identified as "${detectedType}" but has a "${ext}" extension. This is a common technique to disguise malware as innocent files.`, severity: 'CRITICAL', category: 'MALWARE', mitreAttack: 'T1036.007', evidence: { declaredExtension: ext, detectedType, magicBytes: hexPrefix.substring(0, 8) } });
    } else if (typeDangerous) {
      score += 20;
      findings.push({ title: `Executable file type: ${detectedType}`, description: `Magic byte analysis confirms this is a "${detectedType}". Executable files from untrusted sources pose a significant malware risk.`, severity: 'HIGH', category: 'MALWARE', mitreAttack: 'T1204.002', evidence: { detectedType } });
    }

    // ── Check 4: Entropy analysis (packed/encrypted content) ──────────────
    const entropy = this.calculateEntropy(buffer.slice(0, Math.min(buffer.length, 65536)));
    if (entropy > 7.2) {
      score += 20;
      findings.push({ title: 'High entropy — possibly packed or encrypted', description: `File entropy is ${entropy.toFixed(2)}/8.0. High entropy suggests the file content is encrypted, compressed, or obfuscated — techniques used by malware to evade detection.`, severity: 'MEDIUM', category: 'OBFUSCATION', mitreAttack: 'T1027', evidence: { entropy, threshold: 7.2 } });
    }

    // ── Check 5: Double extension ─────────────────────────────────────────
    const parts = filename.split('.');
    if (parts.length > 2) {
      const secondExt = '.' + parts[parts.length - 2].toLowerCase();
      if (this.DANGEROUS_EXTENSIONS.has(secondExt)) {
        score += 30;
        findings.push({ title: 'Double extension detected', description: `The filename "${filename}" uses a double extension. Attackers hide the real extension (${secondExt}) before a decoy extension to trick users.`, severity: 'HIGH', category: 'MALWARE', mitreAttack: 'T1036.007', indicator: filename, evidence: { filename, hiddenExtension: secondExt } });
      }
    }

    // ── Check 6: Zero-byte file ───────────────────────────────────────────
    if (fileSize === 0) {
      findings.push({ title: 'Empty file', description: 'The uploaded file has zero bytes. This may indicate a corrupt file or a probe.', severity: 'LOW', category: 'SUSPICIOUS_FILE', evidence: { size: 0 } });
    }

    score = Math.min(100, score);
    const riskLevel = scoreToLevel(score);
    const classification = score <= 10 ? 'Clean File' : score <= 30 ? 'Low Risk' : score <= 55 ? 'Suspicious File' : score <= 75 ? 'Likely Malicious' : 'Malware Detected';

    return { providerName: this.name, version: this.version, riskScore: score, riskLevel, classification, findings, metadata: { filename, sha256, md5, fileSize, entropy, detectedType } };
  }

  private calculateEntropy(buffer: Buffer): number {
    const freq = new Array(256).fill(0);
    for (const byte of buffer) freq[byte]++;
    return freq.reduce((entropy, count) => {
      if (count === 0) return entropy;
      const p = count / buffer.length;
      return entropy - p * Math.log2(p);
    }, 0);
  }
}
