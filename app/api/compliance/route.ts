export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { apiSuccess, apiError, handleApiError } from '@/lib/utils';
import { requireMembership } from '@/lib/permissions';
import { collectEvidence } from '@/lib/compliance/evidence-collector';
import { SOC2_CONTROLS, CONTROL_CATEGORIES } from '@/lib/compliance/soc2-controls';
import { PCI_CONTROLS } from '@/lib/compliance/pci-controls';
import { HIPAA_CONTROLS } from '@/lib/compliance/hipaa-controls';

const FRAMEWORK_CONTROLS: Record<string, any[]> = {
  SOC2: SOC2_CONTROLS,
  PCI: PCI_CONTROLS,
  HIPAA: HIPAA_CONTROLS,
};

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiError('UNAUTHORIZED', 'Auth required', 401);
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId');
    const framework = (searchParams.get('framework') ?? 'SOC2').toUpperCase();
    if (!orgId) return apiError('VALIDATION_ERROR', 'orgId required', 400);
    await requireMembership(orgId, session.user.id);

    const controls = FRAMEWORK_CONTROLS[framework] ?? SOC2_CONTROLS;
    const report = await collectEvidence(orgId);

    const enrichedControls = controls.map((control: any) => ({
      ...control,
      evidence: report.evidence.find((e: any) => e.controlId === control.id) ?? {
        controlId: control.id,
        status: control.automatedCheck ? 'NOT_MET' : 'PARTIAL',
        automatedFindings: [],
        evidenceCount: 0,
        lastEvidenceAt: null,
        score: control.automatedCheck ? 0 : 30,
      },
    }));

    const met = enrichedControls.filter((c: any) => c.evidence?.status === 'MET').length;
    const partial = enrichedControls.filter((c: any) => c.evidence?.status === 'PARTIAL').length;
    const notMet = enrichedControls.filter((c: any) => c.evidence?.status === 'NOT_MET').length;
    const totalScore = Math.round(enrichedControls.reduce((sum: number, c: any) => sum + (c.evidence?.score ?? 0), 0) / enrichedControls.length);

    return apiSuccess({
      report: {
        framework,
        orgId,
        generatedAt: report.generatedAt,
        overallScore: totalScore,
        controlsMet: met,
        controlsPartial: partial,
        controlsNotMet: notMet,
        totalControls: enrichedControls.length,
        readyForAudit: totalScore >= 70 && notMet <= 3,
        controls: enrichedControls,
        categories: CONTROL_CATEGORIES,
        availableFrameworks: Object.keys(FRAMEWORK_CONTROLS),
        criticalGaps: enrichedControls
          .filter((c: any) => c.automatedCheck && c.evidence?.status === 'NOT_MET')
          .slice(0, 5)
          .map((c: any) => `${c.id}: ${c.title}`),
      },
    });
  } catch (e) { return handleApiError(e); }
}
