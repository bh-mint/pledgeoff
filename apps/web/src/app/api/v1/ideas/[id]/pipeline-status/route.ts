import { NextRequest, NextResponse } from 'next/server';
import { resolveUserIdFromRequest } from '@/lib/api-auth';
import { container } from '@/lib/container';
import { logger } from '@pledgeoff/observability';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: ideaId } = await params;
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();

  const userId = await resolveUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ideaResult = await container.ideaRepo.findById(ideaId);
  if (ideaResult.isErr() || !ideaResult.value || ideaResult.value.userId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const [signalsResult, decisionResult] = await Promise.all([
    container.signalRepo.findByIdeaId(ideaId),
    container.decisionRepo.findByIdeaId(ideaId),
  ]);

  if (signalsResult.isErr() || decisionResult.isErr()) {
    logger.warn({ traceId, ideaId, outcome: 'error' }, 'pipeline-status: repo error');
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }

  return NextResponse.json({
    data: {
      signalCount: signalsResult.value.length,
      hasDecision: decisionResult.value !== null,
    },
  }, {
    headers: {
      'X-Trace-Id': traceId,
      'Cache-Control': 'no-store',
    },
  });
}
