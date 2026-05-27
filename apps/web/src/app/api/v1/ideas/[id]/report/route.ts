import { container } from '@/lib/container';
import { resolveUserIdFromRequest } from '@/lib/api-auth';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();
  const { id: ideaId } = await params;

  const userId = await resolveUserIdFromRequest(req);
  if (!userId) {
    return Response.json({ error: { code: 'UNAUTHENTICATED' } }, { status: 401, headers: { 'X-Trace-Id': traceId } });
  }

  const result = await container.getDecisionTimelineUseCase.execute({ ideaId, userId, traceId });

  if (result.isErr()) {
    const isNotFound = result.error.message === 'Not found';
    return Response.json(
      { error: { code: isNotFound ? 'NOT_FOUND' : 'INTERNAL' } },
      { status: isNotFound ? 404 : 500, headers: { 'X-Trace-Id': traceId } },
    );
  }

  return Response.json({ data: result.value }, { status: 200, headers: { 'X-Trace-Id': traceId } });
}
