import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { createSupabaseAuthClient } from '@/lib/supabase/server';
import { getUserPlan } from '@/server/billing/getUserPlan';
import { container } from '@/lib/container';
import { logger } from '@pledgeoff/observability';
import { isAtLeastPlan, PLAN } from '@pledgeoff/core';
import { AuditTrailPDF } from '@/components/pdf/AuditTrailPDF';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: ideaId } = await params;
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();

  const supabase = await createSupabaseAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const plan = await getUserPlan(user.id);
  if (!isAtLeastPlan(plan, PLAN.STUDIO)) {
    return NextResponse.json({ error: 'Studio plan required' }, { status: 403 });
  }

  const ideaResult = await container.ideaRepo.findById(ideaId);
  if (ideaResult.isErr() || !ideaResult.value || ideaResult.value.userId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const timelineResult = await container.getDecisionTimelineUseCase.execute({
    ideaId,
    userId: user.id,
    traceId,
  });

  if (timelineResult.isErr()) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }

  try {
    const buffer = await renderToBuffer(
      AuditTrailPDF({
        idea: ideaResult.value,
        timeline: timelineResult.value,
        generatedAt: new Date().toISOString(),
      }),
    );

    logger.info({ traceId, userId: user.id, ideaId, outcome: 'success' }, 'Audit trail PDF generated');

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="audit-trail-${ideaId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.pdf"`,
        'X-Trace-Id': traceId,
      },
    });
  } catch (e) {
    logger.error({ traceId, userId: user.id, ideaId, error: String(e), outcome: 'error' }, 'Audit trail PDF failed');
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 });
  }
}
