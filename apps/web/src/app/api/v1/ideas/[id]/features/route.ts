export const maxDuration = 60;

import { container } from '@/lib/container';
import { resolveUserIdFromRequest } from '@/lib/api-auth';
import { checkAiRateLimit } from '@/lib/rate-limiter';
import { checkPlanToolGate } from '@/server/billing/checkPlanToolGate';
import { withApiKeyLogging } from '@/lib/with-api-key-logging';

async function getHandler(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();
  const { id: ideaId } = await params;

  const userId = await resolveUserIdFromRequest(req);
  if (!userId) {
    return Response.json({ error: { code: 'UNAUTHENTICATED' } }, { status: 401, headers: { 'X-Trace-Id': traceId } });
  }

  const existing = await container.featureAnalysisRepo.findByIdeaId(ideaId);
  if (existing.isErr()) {
    return Response.json({ error: { code: 'INTERNAL' } }, { status: 500, headers: { 'X-Trace-Id': traceId } });
  }
  return Response.json({ data: existing.value ?? null }, { status: 200, headers: { 'X-Trace-Id': traceId } });
}

async function postHandler(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();
  const { id: ideaId } = await params;

  const userId = await resolveUserIdFromRequest(req);
  if (!userId) {
    return Response.json({ error: { code: 'UNAUTHENTICATED' } }, { status: 401, headers: { 'X-Trace-Id': traceId } });
  }

  const planGate = await checkPlanToolGate(userId, 'features');
  if (!planGate.allowed) {
    return Response.json(
      { error: { code: 'PLAN_TOOL_LOCKED', requiredPlan: planGate.requiredPlan } },
      { status: 403, headers: { 'X-Trace-Id': traceId } },
    );
  }

  const aiLimit = await checkAiRateLimit(userId);
  if (!aiLimit.allowed) {
    void container.auditLog.log({ userId, action: 'rate_limited', resourceType: 'idea', resourceId: ideaId, traceId });
    return Response.json(
      { error: { code: 'RATE_LIMITED' } },
      { status: 429, headers: { 'X-Trace-Id': traceId, 'Retry-After': String(Math.ceil(aiLimit.retryAfterMs / 1000)) } },
    );
  }

  // Get idea text + existing competitor names (if available)
  const [ideaResult, competitorsResult] = await Promise.all([
    container.ideaRepo.findById(ideaId),
    container.competitorAnalysisRepo.findByIdeaId(ideaId),
  ]);

  if (ideaResult.isErr() || !ideaResult.value) {
    return Response.json({ error: { code: 'NOT_FOUND' } }, { status: 404, headers: { 'X-Trace-Id': traceId } });
  }
  if (ideaResult.value.userId !== userId) {
    return Response.json({ error: { code: 'NOT_FOUND' } }, { status: 404, headers: { 'X-Trace-Id': traceId } });
  }

  const competitorNames = competitorsResult.isOk() && competitorsResult.value
    ? competitorsResult.value.competitors.map((c) => c.name).slice(0, 6)
    : [];

  const result = await container.analyzeFeaturesUseCase.execute({
    ideaId,
    userId,
    ideaText: ideaResult.value.text,
    competitorNames,
    traceId,
  });

  if (result.isErr()) {
    return Response.json({ error: { code: 'INTERNAL' } }, { status: 500, headers: { 'X-Trace-Id': traceId } });
  }

  return Response.json({ data: result.value }, { status: 200, headers: { 'X-Trace-Id': traceId } });
}

export const GET = withApiKeyLogging(getHandler);
export const POST = withApiKeyLogging(postHandler);
