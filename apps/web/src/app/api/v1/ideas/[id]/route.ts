import { container } from '@/lib/container';
import { getCachedIdea, setCachedIdea } from '@/lib/idea-cache';
import { resolveUserIdFromRequest } from '@/lib/api-auth';

function unauthorizedResponse(traceId: string) {
  return Response.json(
    { error: { code: 'UNAUTHENTICATED', message: 'Valid authentication required' } },
    { status: 401, headers: { 'X-Trace-Id': traceId } },
  );
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();
  const { id } = await params;

  const userId = await resolveUserIdFromRequest(req);
  if (!userId) return unauthorizedResponse(traceId);

  // Cache check — keyed by userId+ideaId so users never see each other's data
  const cached = getCachedIdea(userId, id);
  if (cached) {
    return Response.json(
      { data: cached },
      { status: 200, headers: { 'X-Trace-Id': traceId, 'X-Cache': 'HIT' } },
    );
  }

  const ideaResult = await container._repos.ideaRepo.findById(id);
  if (ideaResult.isErr()) {
    return Response.json(
      { error: { code: 'INTERNAL', message: 'An unexpected error occurred' } },
      { status: 500, headers: { 'X-Trace-Id': traceId } },
    );
  }

  const idea = ideaResult.value;
  if (!idea) {
    return Response.json(
      { error: { code: 'NOT_FOUND', message: 'Idea not found' } },
      { status: 404, headers: { 'X-Trace-Id': traceId } },
    );
  }

  // Authorization: user can only read their own ideas
  if (idea.userId !== userId) {
    return Response.json(
      { error: { code: 'NOT_FOUND', message: 'Idea not found' } },
      { status: 404, headers: { 'X-Trace-Id': traceId } },
    );
  }

  const [decisionResult, signalsResult] = await Promise.all([
    container._repos.decisionRepo.findByIdeaId(id),
    container._repos.signalRepo.findByIdeaId(id),
  ]);

  const decision = decisionResult.isOk() ? decisionResult.value : null;
  const signals = signalsResult.isOk() ? signalsResult.value : [];

  setCachedIdea(userId, id, idea, decision, signals);

  return Response.json(
    { data: { idea, decision, signals } },
    { status: 200, headers: { 'X-Trace-Id': traceId, 'X-Cache': 'MISS' } },
  );
}
