export const maxDuration = 60;

import { container } from '@/lib/container';
import { resolveUserIdFromRequest } from '@/lib/api-auth';
import { checkAiRateLimit } from '@/lib/rate-limiter';
import { checkPlanToolGate } from '@/server/billing/checkPlanToolGate';
import { withApiKeyLogging } from '@/lib/with-api-key-logging';
import { createSupabaseServiceClient } from '@/lib/supabase-server';
import { getTeamSlackWebhook } from '@/server/slack/getTeamSlackWebhook';
import { notifySlack } from '@pledgeoff/adapters';

async function getHandler(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();
  const { id: ideaId } = await params;

  const userId = await resolveUserIdFromRequest(req);
  if (!userId) {
    return Response.json({ error: { code: 'UNAUTHENTICATED' } }, { status: 401, headers: { 'X-Trace-Id': traceId } });
  }

  const existing = await container.marketLandscapeRepo.findByIdeaId(ideaId);
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

  const planGate = await checkPlanToolGate(userId, 'market-landscape');
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

  const ideaResult = await container.ideaRepo.findById(ideaId);
  if (ideaResult.isErr() || !ideaResult.value) {
    return Response.json({ error: { code: 'NOT_FOUND' } }, { status: 404, headers: { 'X-Trace-Id': traceId } });
  }
  if (ideaResult.value.userId !== userId) {
    return Response.json({ error: { code: 'NOT_FOUND' } }, { status: 404, headers: { 'X-Trace-Id': traceId } });
  }

  const result = await container.generateMarketLandscapeUseCase.execute({
    ideaId,
    userId,
    ideaText: ideaResult.value.text,
    traceId,
    founderContext: ideaResult.value.context ?? undefined,
    forceRerun: true,
  });

  if (result.isErr()) {
    return Response.json({ error: { code: 'INTERNAL' } }, { status: 500, headers: { 'X-Trace-Id': traceId } });
  }

  const ideaText = ideaResult.value.text;
  void getTeamSlackWebhook(userId, createSupabaseServiceClient()).then((webhookUrl) => {
    if (webhookUrl) void notifySlack({ webhookUrl, ideaId, ideaText, tool: 'market-landscape', traceId });
  });

  return Response.json({ data: result.value }, { status: 200, headers: { 'X-Trace-Id': traceId } });
}

export const GET = withApiKeyLogging(getHandler);
export const POST = withApiKeyLogging(postHandler);
