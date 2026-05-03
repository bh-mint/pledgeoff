import { createClient } from '@supabase/supabase-js';
import { container } from '@/lib/container';

function unauthorizedResponse(traceId: string) {
  return Response.json(
    { error: { code: 'UNAUTHENTICATED', message: 'Valid authentication required' } },
    { status: 401, headers: { 'X-Trace-Id': traceId } },
  );
}

async function resolveUserId(authHeader: string | null): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data } = await anonClient.auth.getUser(token);
  return data.user?.id ?? null;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();
  const { id } = await params;

  const userId = await resolveUserId(req.headers.get('authorization'));
  if (!userId) return unauthorizedResponse(traceId);

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

  return Response.json(
    { data: { idea, decision, signals } },
    { status: 200, headers: { 'X-Trace-Id': traceId } },
  );
}
