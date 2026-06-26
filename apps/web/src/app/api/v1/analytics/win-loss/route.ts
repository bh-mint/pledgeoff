import { resolveUserIdFromRequest } from '@/lib/api-auth';
import { getUserPlan } from '@/server/billing/getUserPlan';
import { getWinLossData } from '@/server/analytics/getWinLossData';

export async function GET(req: Request): Promise<Response> {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();

  const userId = await resolveUserIdFromRequest(req);
  if (!userId) {
    return Response.json({ error: { code: 'UNAUTHENTICATED' } }, { status: 401, headers: { 'X-Trace-Id': traceId } });
  }

  const plan = await getUserPlan(userId);
  if (plan === 'free') {
    return Response.json({ error: { code: 'PLAN_REQUIRED', requiredPlan: 'founder' } }, { status: 403, headers: { 'X-Trace-Id': traceId } });
  }

  const rows = await getWinLossData(userId);
  return Response.json({ data: rows }, { status: 200, headers: { 'X-Trace-Id': traceId } });
}
