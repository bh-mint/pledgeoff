import { container } from '@/lib/container';
import { resolveUserIdFromRequest } from '@/lib/api-auth';
import { getUserPlan } from '@/server/billing/getUserPlan';

export const maxDuration = 10;

export async function GET(req: Request): Promise<Response> {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();

  const userId = await resolveUserIdFromRequest(req);
  if (!userId) {
    return Response.json(
      { error: { code: 'UNAUTHENTICATED', message: 'Valid authentication required' } },
      { status: 401, headers: { 'X-Trace-Id': traceId } },
    );
  }

  const plan = await getUserPlan(userId);
  if (plan === 'free' || plan === 'founder') {
    return Response.json(
      { error: { code: 'PLAN_REQUIRED', message: 'Team plan or higher required' } },
      { status: 403, headers: { 'X-Trace-Id': traceId } },
    );
  }

  const result = await container.engineeringSnapshotRepo.findByUserId(userId);
  if (result.isErr()) {
    return Response.json(
      { error: { code: 'INTERNAL', message: 'Failed to fetch engineering snapshot' } },
      { status: 500, headers: { 'X-Trace-Id': traceId } },
    );
  }

  return Response.json(
    { data: result.value },
    { status: 200, headers: { 'X-Trace-Id': traceId } },
  );
}
