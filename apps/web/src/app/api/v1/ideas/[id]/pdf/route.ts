import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { createSupabaseAuthClient } from '@/lib/supabase/server';
import { getUserPlan } from '@/server/billing/getUserPlan';
import { container } from '@/lib/container';
import { createSupabaseServiceClient } from '@/lib/supabase-server';
import { logger } from '@pledgeoff/observability';
import { isAtLeastPlan, PLAN } from '@pledgeoff/core';
import { IdeaReportPDF } from '@/components/pdf/IdeaReportPDF';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();

  const supabase = await createSupabaseAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const plan = await getUserPlan(user.id);
  if (!isAtLeastPlan(plan, PLAN.STUDIO)) {
    return NextResponse.json({ error: 'Studio plan required' }, { status: 403 });
  }

  const ideaResult = await container._unsafeRepos.ideaRepo.findById(id);
  if (ideaResult.isErr() || !ideaResult.value) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const idea = ideaResult.value;
  if (idea.userId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const svc = createSupabaseServiceClient();
  const { data: profile } = await svc.from('profiles').select('first_name, last_name').eq('id', user.id).single();

  const [decisionResult, signalsResult, simulationResult] = await Promise.all([
    container._unsafeRepos.decisionRepo.findByIdeaId(id),
    container._unsafeRepos.signalRepo.findByIdeaId(id),
    container._unsafeRepos.simulationRepo.findByIdeaId(id),
  ]);

  const decision = decisionResult.isOk() ? decisionResult.value : null;
  const signals = signalsResult.isOk() ? signalsResult.value : [];
  const simulation = simulationResult.isOk() ? simulationResult.value : null;

  const brandName = req.nextUrl.searchParams.get('brand') ?? undefined;

  try {
    const buffer = await renderToBuffer(
      IdeaReportPDF({
        idea,
        decision,
        signals,
        simulation,
        authorName: [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || user.email?.split('@')[0] || '—',
        brandName,
        generatedAt: new Date().toISOString(),
      })
    );

    logger.info({ traceId, userId: user.id, ideaId: id, outcome: 'success' }, 'PDF export generated');

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="report-${id.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.pdf"`,
        'X-Trace-Id': traceId,
      },
    });
  } catch (e) {
    logger.error({ traceId, userId: user.id, ideaId: id, error: String(e), outcome: 'error' }, 'PDF export failed');
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 });
  }
}
