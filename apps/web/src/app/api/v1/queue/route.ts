import { container } from '@/lib/container';
import { logger } from '@pledgeoff/observability';
import { resolveUserIdFromRequest } from '@/lib/api-auth';

export const maxDuration = 30;

export async function GET(req: Request): Promise<Response> {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();

  const userId = await resolveUserIdFromRequest(req);
  if (!userId) {
    return Response.json(
      { error: { code: 'UNAUTHENTICATED', message: 'Valid authentication required' } },
      { status: 401, headers: { 'X-Trace-Id': traceId } },
    );
  }

  const result = await container.getDecisionQueueUseCase.execute({ userId, traceId });
  if (result.isErr()) {
    logger.error({ traceId, userId, error: result.error.message }, 'GET /api/v1/queue failed');
    return Response.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch decision queue' } },
      { status: 500, headers: { 'X-Trace-Id': traceId } },
    );
  }

  return Response.json({ data: result.value }, { headers: { 'X-Trace-Id': traceId } });
}
