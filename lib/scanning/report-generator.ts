import { buildMitreMapping, groupByTactic } from './mitre-mapper';
import type { ScanProviderResult, ScanFindingResult } from './providers/base';

// ─── Report Generator ──────────────────────────────────────────────────────
// Builds structured ScanReport from aggregated provider results.
// AI explanation generated via Groq.

export interface StructuredReport {
  executiveSummary: string;
  technicalDetails: {
    scanType: string;
    input: string;
    providersRun: string[];
    totalFindings: number;
    findingsBySeverity: Record<string, number>;
    providerResults: Array<{
      provider: string;
      riskScore: number;
      riskLevel: string;
      classification: string;
      findingCount: number;
    }>;
  };
  recommendations: Array<{
    priority: 'IMMEDIATE' | 'HIGH' | 'MEDIUM' | 'LOW';
    action: string;
    rationale: string;
  }>;
  mitreMapping: ReturnType<typeof groupByTactic>;
  aiExplanation: string;
}

export async function generateReport(params: {
  scanType: string;
  input: string;
  riskScore: number;
  riskLevel: string;
  classification: string;
  providerResults: ScanProviderResult[];
  orgName: string;
}): Promise<StructuredReport> {
  const allFindings = params.providerResults.flatMap(r => r.findings);
  const mitreIds = allFindings.map(f => f.mitreAttack).filter(Boolean) as string[];
  const mitreTechniques = buildMitreMapping(mitreIds);
  const mitreByTactic = groupByTactic(mitreTechniques);

  // Build severity counts
  const findingsBySeverity = allFindings.reduce((acc, f) => {
    acc[f.severity] = (acc[f.severity] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Build executive summary
  const executiveSummary = buildExecutiveSummary(params, allFindings, findingsBySeverity);

  // Build recommendations
  const recommendations = buildRecommendations(params.riskLevel, allFindings);

  // Generate AI explanation
  const aiExplanation = await generateAiExplanation(params, allFindings);

  return {
    executiveSummary,
    technicalDetails: {
      scanType: params.scanType,
      input: params.input.substring(0, 200), // truncate for storage
      providersRun: params.providerResults.map(r => `${r.providerName} v${r.version}`),
      totalFindings: allFindings.length,
      findingsBySeverity,
      providerResults: params.providerResults.map(r => ({
        provider: r.providerName,
        riskScore: r.riskScore,
        riskLevel: r.riskLevel,
        classification: r.classification,
        findingCount: r.findings.length,
      })),
    },
    recommendations,
    mitreMapping: mitreByTactic,
    aiExplanation,
  };
}

function buildExecutiveSummary(
  params: { scanType: string; input: string; riskScore: number; riskLevel: string; classification: string; orgName: string },
  findings: ScanFindingResult[],
  bySeverity: Record<string, number>
): string {
  const critical = bySeverity['CRITICAL'] ?? 0;
  const high = bySeverity['HIGH'] ?? 0;
  const medium = bySeverity['MEDIUM'] ?? 0;

  if (params.riskLevel === 'SAFE' || params.riskScore <= 15) {
    return `Zyphorix Guard analyzed the submitted ${params.scanType.toLowerCase()} and found no significant indicators of compromise. The target received a risk score of ${params.riskScore}/100 and is classified as "${params.classification}". No immediate action is required.`;
  }

  const sevLine = [
    critical > 0 ? `${critical} critical` : '',
    high > 0 ? `${high} high` : '',
    medium > 0 ? `${medium} medium` : '',
  ].filter(Boolean).join(', ');

  const topFinding = findings.sort((a, b) => {
    const order = { CRITICAL:4, HIGH:3, MEDIUM:2, LOW:1, SAFE:0 };
    return (order[b.severity] ?? 0) - (order[a.severity] ?? 0);
  })[0];

  return `Zyphorix Guard has detected ${params.riskLevel.toLowerCase()}-severity threats in the submitted ${params.scanType.toLowerCase()}. The analysis returned a risk score of ${params.riskScore}/100 (${params.classification}) with ${findings.length} finding(s) — ${sevLine}. The most significant finding is: "${topFinding?.title ?? 'See findings below'}". ${params.orgName} should treat this ${params.scanType.toLowerCase()} as malicious until further investigation is completed.`;
}

function buildRecommendations(
  riskLevel: string,
  findings: ScanFindingResult[]
): StructuredReport['recommendations'] {
  const recs: StructuredReport['recommendations'] = [];
  const categories = new Set(findings.map(f => f.category));

  if (riskLevel === 'CRITICAL' || riskLevel === 'HIGH') {
    recs.push({ priority: 'IMMEDIATE', action: 'Do not interact with this content', rationale: 'The risk level indicates a high probability of a malicious artifact. Do not click links, open files, or respond to communications.' });
  }
  if (categories.has('PHISHING') || categories.has('CREDENTIAL_THEFT')) {
    recs.push({ priority: 'IMMEDIATE', action: 'Check for credential compromise', rationale: 'If any credentials were entered on a phishing page, immediately change passwords and enable MFA on all affected accounts.' });
    recs.push({ priority: 'HIGH', action: 'Report phishing attempt', rationale: 'Report to your email provider, the impersonated organization, and relevant authorities (e.g., CISA, NCSC).' });
  }
  if (categories.has('MALWARE')) {
    recs.push({ priority: 'IMMEDIATE', action: 'Isolate and scan affected systems', rationale: 'If the file was executed, immediately isolate the affected system from the network and conduct a full malware scan.' });
  }
  if (categories.has('BEC')) {
    recs.push({ priority: 'IMMEDIATE', action: 'Verify request through alternative channel', rationale: 'Contact the claimed sender via a known, trusted channel (phone call) to verify any requested action before proceeding.' });
    recs.push({ priority: 'HIGH', action: 'Alert your finance and security teams', rationale: 'BEC attacks target finance teams. Ensure all wire transfer requests are verified with dual-approval processes.' });
  }
  if (categories.has('C2_INFRASTRUCTURE') || categories.has('ANONYMIZATION')) {
    recs.push({ priority: 'HIGH', action: 'Block the identified infrastructure', rationale: 'Add the identified domains/IPs to your firewall and DNS blocklists to prevent potential C2 communication.' });
  }

  // Always-add low-priority best practices
  recs.push({ priority: 'MEDIUM', action: 'Document and preserve evidence', rationale: 'Save the original email headers, URLs, or file hashes for potential incident response or law enforcement reporting.' });
  recs.push({ priority: 'LOW', action: 'Review security awareness training', rationale: 'Use this finding as a training opportunity. Ensure your team is aware of current phishing techniques.' });

  return recs;
}

async function generateAiExplanation(
  params: { scanType: string; input: string; riskScore: number; riskLevel: string; classification: string },
  findings: ScanFindingResult[]
): Promise<string> {
  // Fail gracefully if Groq key not configured
  if (!process.env.GROQ_API_KEY) {
    return `This ${params.scanType} scan returned a risk score of ${params.riskScore}/100 (${params.riskLevel}) with ${findings.length} finding(s). ${findings.length > 0 ? `Key concerns: ${findings.slice(0,2).map(f=>f.title).join('; ')}.` : 'No significant threats detected.'} Configure GROQ_API_KEY for detailed AI analysis.`;
  }

  const findingsSummary = findings.slice(0, 5).map(f =>
    `- [${f.severity}] ${f.title}: ${f.description.substring(0, 150)}`
  ).join('\n');

  const prompt = `You are Zyphorix Guard, an enterprise cybersecurity AI. Analyze this scan result and provide a clear, actionable explanation for a security analyst.

SCAN TYPE: ${params.scanType}
INPUT: ${params.input.substring(0, 300)}
RISK SCORE: ${params.riskScore}/100
RISK LEVEL: ${params.riskLevel}
CLASSIFICATION: ${params.classification}

FINDINGS:
${findingsSummary || 'No findings — the target appears clean.'}

Provide a 3-4 sentence plain-English explanation that:
1. States clearly whether this is dangerous or safe and why
2. Explains the most significant threat found (if any) in plain terms
3. States what the likely attacker goal is (if malicious)
4. Gives the single most important action the analyst should take

Be direct and specific. Do not repeat the finding titles verbatim.`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.3,
      }),
    });

    if (!response.ok) throw new Error(`Groq API error: ${response.status}`);
    const data = await response.json();
    return data.choices[0]?.message?.content?.trim() ?? 'AI analysis unavailable.';
  } catch (err) {
    console.error('[ReportGenerator] AI explanation failed:', err);
    return `Risk score: ${params.riskScore}/100 (${params.riskLevel}). ${findings.length} finding(s) detected. ${findings[0] ? `Primary concern: ${findings[0].title}.` : 'No threats detected.'} AI narrative unavailable — check GROQ_API_KEY.`;
  }
}
