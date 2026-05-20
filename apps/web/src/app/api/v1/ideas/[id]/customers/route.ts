export const maxDuration = 60;

import { container } from '@/lib/container';
import { resolveUserIdFromRequest } from '@/lib/api-auth';

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

  const result = await container._repos.customerAnalysisRepo.findByIdeaId(ideaId);
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

  const result = await container.analyzeCustomersUseCase.execute({
    ideaId,
    ideaText: ideaResult.value.text,
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
    metadata: { tool: 'customers' },
    traceId,
  });

  return Response.json({ data: result.value }, { status: 201, headers: { 'X-Trace-Id': traceId } });
}
