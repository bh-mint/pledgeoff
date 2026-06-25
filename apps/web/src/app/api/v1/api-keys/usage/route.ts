import { container } from '@/lib/container';
import { requireJwtAuth, jwtAuthErrorResponse } from '@/lib/api-auth';
import { getUserPlan } from '@/server/billing/getUserPlan';
import { isAtLeastPlan, PLAN } from '@pledgeoff/core';
import { logger } from '@pledgeoff/observability';

export async function GET(req: Request): Promise<Response> {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();

  const auth = await requireJwtAuth(req);
  if (!auth.ok) return jwtAuthErrorResponse(auth, traceId);

  const plan = await getUserPlan(auth.userId);
  if (!isAtLeastPlan(plan, PLAN.TEAM)) {
    return Response.json(
      { error: { code: 'FORBIDDEN', message: 'API usage logs require Team or Studio plan' } },
      { status: 403, headers: { 'X-Trace-Id': traceId } },
    );
  }

  const url = new URL(req.url);
  const daysParam = url.searchParams.get('days');
  const days = daysParam ? Math.min(Math.max(1, parseInt(daysParam, 10) || 30), 90) : 30;

  const result = await container.apiRequestLog.getUsageSummary(auth.userId, days);
  if (result.isErr()) {
    logger.error({ traceId, userId: auth.userId, error: result.error.message }, 'api-keys usage query failed');
    return Response.json(
      { error: { code: 'INTERNAL' } },
      { status: 500, headers: { 'X-Trace-Id': traceId } },
    );
  }

  return Response.json({ data: result.value }, { status: 200, headers: { 'X-Trace-Id': traceId } });
}
