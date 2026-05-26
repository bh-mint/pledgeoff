import { NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { resolveUserIdFromRequest } from '@/lib/api-auth';
import { checkAiRateLimit } from '@/lib/rate-limiter';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();
  const { id } = await params;

  const userId = await resolveUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json(
      { error: { code: 'UNAUTHENTICATED', message: 'Valid authentication required' } },
      { status: 401, headers: { 'X-Trace-Id': traceId } },
    );
  }

  const ideaResult = await container._unsafeRepos.ideaRepo.findById(id);
  if (ideaResult.isErr() || !ideaResult.value) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Idea not found' } },
      { status: 404, headers: { 'X-Trace-Id': traceId } },
    );
  }

  const idea = ideaResult.value;
  if (idea.userId !== userId) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Idea not found' } },
      { status: 404, headers: { 'X-Trace-Id': traceId } },
    );
  }

  const aiLimit = await checkAiRateLimit(userId);
  if (!aiLimit.allowed) {
    void container.auditLog.log({ userId, action: 'rate_limited', resourceType: 'idea', resourceId: id, traceId });
    return NextResponse.json(
      { error: { code: 'RATE_LIMITED' } },
      { status: 429, headers: { 'X-Trace-Id': traceId, 'Retry-After': String(Math.ceil(aiLimit.retryAfterMs / 1000)) } },
    );
  }

  // Capture current score before re-validation
  const prevDecisionResult = await container._unsafeRepos.decisionRepo.findByIdeaId(id);
  const prevDecision = prevDecisionResult.isOk() ? prevDecisionResult.value : null;
  const oldScore = prevDecision?.score ?? null;
  const oldVerdict = prevDecision?.verdict ?? null;

  // Fetch fresh signals (new eventId bypasses idempotency)
  const signalsResult = await container.fetchSignalsUseCase.execute({
    ideaId: id,
    ideaText: idea.text,
    traceId,
    eventId: crypto.randomUUID(),
  });

  if (signalsResult.isErr()) {
    return NextResponse.json(
      { error: { code: 'SIGNAL_FETCH_FAILED', message: signalsResult.error.message } },
      { status: 500, headers: { 'X-Trace-Id': traceId } },
    );
  }

  // Re-run decision with fresh signals
  const decideResult = await container.decideUseCase.execute({
    ideaId: id,
    ideaText: idea.text,
    traceId,
    eventId: crypto.randomUUID(),
  });

  if (decideResult.isErr()) {
    return NextResponse.json(
      { error: { code: 'DECIDE_FAILED', message: decideResult.error.message } },
      { status: 500, headers: { 'X-Trace-Id': traceId } },
    );
  }

  const newDecision = decideResult.value;
  const newScore = newDecision.score ?? null;
  const newVerdict = newDecision.verdict;
  const scoreDiff = oldScore !== null && newScore !== null ? newScore - oldScore : null;

  return NextResponse.json(
    {
      data: {
        oldScore,
        oldVerdict,
        newScore,
        newVerdict,
        scoreDiff,
        decision: newDecision,
      },
    },
    { status: 200, headers: { 'X-Trace-Id': traceId } },
  );
}
