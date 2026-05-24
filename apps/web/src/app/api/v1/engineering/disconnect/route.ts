import { container } from '@/lib/container';
import { resolveUserIdFromRequest } from '@/lib/api-auth';
import { logger } from '@pledgeoff/observability';

export const maxDuration = 10;

export async function DELETE(req: Request): Promise<Response> {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();

  const userId = await resolveUserIdFromRequest(req);
  if (!userId) {
    return Response.json(
      { error: { code: 'UNAUTHENTICATED', message: 'Valid authentication required' } },
      { status: 401, headers: { 'X-Trace-Id': traceId } },
    );
  }

  const result = await container.engineeringSnapshotRepo.deleteByUserId(userId);
  if (result.isErr()) {
    logger.error({ traceId, userId, error: result.error.message }, 'DELETE /engineering/disconnect failed');
    return Response.json(
      { error: { code: 'INTERNAL', message: 'Failed to disconnect GitHub' } },
      { status: 500, headers: { 'X-Trace-Id': traceId } },
    );
  }

  logger.info({ traceId, userId }, 'GitHub disconnected');
  return new Response(null, { status: 204, headers: { 'X-Trace-Id': traceId } });
}
