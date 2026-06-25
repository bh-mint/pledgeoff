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

  const existing = await container.launchKitRepo.findByIdeaId(ideaId);
  if (existing.isErr()) {
    return Response.json({ error: { code: 'INTERNAL' } }, { status: 500, headers: { 'X-Trace-Id': traceId } });
  }
  if (existing.value) {
    return Response.json({ data: existing.value }, { status: 200, headers: { 'X-Trace-Id': traceId } });
  }

  return Response.json({ data: null }, { status: 200, headers: { 'X-Trace-Id': traceId } });
}

async function postHandler(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();
  const { id: ideaId } = await params;

  const userId = await resolveUserIdFromRequest(req);
  if (!userId) {
    return Response.json({ error: { code: 'UNAUTHENTICATED' } }, { status: 401, headers: { 'X-Trace-Id': traceId } });
  }

  const planGate = await checkPlanToolGate(userId, 'gtm');
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

  const result = await container.generateLaunchKitUseCase.execute({ ideaId, userId, traceId });

  if (result.isErr()) {
    const e = result.error;
    if ('code' in e && e.code === 'UNAUTHORIZED') {
      return Response.json({ error: { code: 'NOT_FOUND' } }, { status: 404, headers: { 'X-Trace-Id': traceId } });
    }
    if ('code' in e && e.code === 'IDEA_NOT_FOUND') {
      return Response.json({ error: { code: 'NOT_FOUND' } }, { status: 404, headers: { 'X-Trace-Id': traceId } });
    }
    return Response.json({ error: { code: 'INTERNAL' } }, { status: 500, headers: { 'X-Trace-Id': traceId } });
  }

  return Response.json({ data: result.value }, { status: 200, headers: { 'X-Trace-Id': traceId } });
}

export const GET = withApiKeyLogging(getHandler);
export const POST = withApiKeyLogging(postHandler);
