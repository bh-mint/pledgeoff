import { container } from '@/lib/container';
import { resolveUserIdFromRequest } from '@/lib/api-auth';
import { logger } from '@pledgeoff/observability';

export const maxDuration = 15;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ ideaId: string }> },
): Promise<Response> {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();
  const { ideaId } = await params;

  const userId = await resolveUserIdFromRequest(req);
  if (!userId) {
    return Response.json(
      { error: { code: 'UNAUTHENTICATED', message: 'Valid authentication required' } },
      { status: 401, headers: { 'X-Trace-Id': traceId } },
    );
  }

  const result = await container.estimateDeliveryUseCase.execute({ userId, ideaId, traceId });
  if (result.isErr()) {
    logger.error({ traceId, userId, ideaId, error: result.error.message }, 'EstimateDeliveryUseCase failed');
    return Response.json(
      { error: { code: 'INTERNAL', message: 'Failed to estimate delivery' } },
      { status: 500, headers: { 'X-Trace-Id': traceId } },
    );
  }

  return Response.json(
    { data: result.value },
    { status: 200, headers: { 'X-Trace-Id': traceId } },
  );
}
