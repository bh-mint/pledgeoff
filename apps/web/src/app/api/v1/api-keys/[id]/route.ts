import { container } from '@/lib/container';
import { resolveUserId } from '@/lib/api-auth';
import { logger } from '@pledgeoff/observability';
import { ApiKeyNotFoundError } from '@pledgeoff/core';

function unauthorized(traceId: string) {
  return Response.json(
    { error: { code: 'UNAUTHENTICATED', message: 'Valid authentication required' } },
    { status: 401, headers: { 'X-Trace-Id': traceId } },
  );
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();
  const { id } = await params;

  const userId = await resolveUserId(req.headers.get('authorization'));
  if (!userId) return unauthorized(traceId);

  const result = await container.revokeApiKeyUseCase.execute({ id, userId, traceId });

  if (result.isErr()) {
    const error = result.error;
    if (error instanceof ApiKeyNotFoundError) {
      return Response.json(
        { error: { code: 'NOT_FOUND', message: 'API key not found' } },
        { status: 404, headers: { 'X-Trace-Id': traceId } },
      );
    }
    logger.error({ traceId, keyId: id, error: error.message }, 'revoke-api-key failed');
    return Response.json(
      { error: { code: 'INTERNAL', message: 'An unexpected error occurred' } },
      { status: 500, headers: { 'X-Trace-Id': traceId } },
    );
  }

  return new Response(null, { status: 204, headers: { 'X-Trace-Id': traceId } });
}
