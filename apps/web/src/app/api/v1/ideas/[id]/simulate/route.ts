export const maxDuration = 60;

import { container } from '@/lib/container';
import { resolveUserIdFromRequest } from '@/lib/api-auth';
import { checkAiRateLimit } from '@/lib/rate-limiter';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();
  const { id: ideaId } = await params;

  const userId = await resolveUserIdFromRequest(req);
  if (!userId) {
    return Response.json({ error: { code: 'UNAUTHENTICATED' } }, { status: 401, headers: { 'X-Trace-Id': traceId } });
  }

  const ideaResult = await container._repos.ideaRepo.findById(ideaId);
  if (ideaResult.isErr() || !ideaResult.value || ideaResult.value.userId !== userId) {
    return Response.json({ error: { code: 'NOT_FOUND' } }, { status: 404, headers: { 'X-Trace-Id': traceId } });
  }

  const result = await container._repos.simulationRepo.findByIdeaId(ideaId);
  if (result.isErr()) {
    return Response.json({ error: { code: 'INTERNAL' } }, { status: 500, headers: { 'X-Trace-Id': traceId } });
  }

  if (!result.value) {
    return Response.json({ data: null }, { status: 200, headers: { 'X-Trace-Id': traceId } });
  }

  return Response.json({ data: result.value }, { status: 200, headers: { 'X-Trace-Id': traceId } });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();
  const { id: ideaId } = await params;

  const userId = await resolveUserIdFromRequest(req);
  if (!userId) {
    return Response.json({ error: { code: 'UNAUTHENTICATED' } }, { status: 401, headers: { 'X-Trace-Id': traceId } });
  }

  const ideaResult = await container._repos.ideaRepo.findById(ideaId);
  if (ideaResult.isErr() || !ideaResult.value || ideaResult.value.userId !== userId) {
    return Response.json({ error: { code: 'NOT_FOUND' } }, { status: 404, headers: { 'X-Trace-Id': traceId } });
  }

  const aiLimit = await checkAiRateLimit(userId);
  if (!aiLimit.allowed) {
    void container.auditLog.log({ userId, action: 'rate_limited', resourceType: 'idea', resourceId: ideaId, traceId });
    return Response.json(
      { error: { code: 'RATE_LIMITED' } },
      { status: 429, headers: { 'X-Trace-Id': traceId, 'Retry-After': String(Math.ceil(aiLimit.retryAfterMs / 1000)) } },
    );
  }

  const decisionResult = await container._repos.decisionRepo.findByIdeaId(ideaId);
  if (decisionResult.isErr() || !decisionResult.value) {
    return Response.json(
      { error: { code: 'PRECONDITION_FAILED', message: 'Idea must have a decision before simulating' } },
      { status: 422, headers: { 'X-Trace-Id': traceId } },
    );
  }

  const decision = decisionResult.value;

  const result = await container.simulateRevenueUseCase.execute({
    ideaId,
    ideaText: ideaResult.value.text,
    verdict: decision.verdict,
    userId,
    traceId,
  });

  if (result.isErr()) {
    return Response.json(
      { error: { code: 'INTERNAL', message: result.error.message } },
      { status: 500, headers: { 'X-Trace-Id': traceId } },
    );
  }

  void container.auditLog.log({
    userId,
    action: 'tool_accessed',
    resourceType: 'idea',
    resourceId: ideaId,
    metadata: { tool: 'simulate' },
    traceId,
  });

  return Response.json({ data: result.value }, { status: 201, headers: { 'X-Trace-Id': traceId } });
}
