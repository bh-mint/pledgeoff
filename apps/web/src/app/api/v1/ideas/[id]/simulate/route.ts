import { createClient } from '@supabase/supabase-js';
import { container } from '@/lib/container';

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
  const { id: ideaId } = await params;

  const userId = await resolveUserId(req.headers.get('authorization'));
  if (!userId) {
    return Response.json({ error: { code: 'UNAUTHENTICATED' } }, { status: 401, headers: { 'X-Trace-Id': traceId } });
  }

  const ideaResult = await container._repos.ideaRepo.findById(ideaId);
  if (ideaResult.isErr() || !ideaResult.value || ideaResult.value.userId !== userId) {
    return Response.json({ error: { code: 'NOT_FOUND' } }, { status: 404, headers: { 'X-Trace-Id': traceId } });
  }

  const result = await container._repos.simulationRepo.findByIdeaId(ideaId);
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

  const userId = await resolveUserId(req.headers.get('authorization'));
  if (!userId) {
    return Response.json({ error: { code: 'UNAUTHENTICATED' } }, { status: 401, headers: { 'X-Trace-Id': traceId } });
  }

  const ideaResult = await container._repos.ideaRepo.findById(ideaId);
  if (ideaResult.isErr() || !ideaResult.value || ideaResult.value.userId !== userId) {
    return Response.json({ error: { code: 'NOT_FOUND' } }, { status: 404, headers: { 'X-Trace-Id': traceId } });
  }

  const decisionResult = await container._repos.decisionRepo.findByIdeaId(ideaId);
  if (decisionResult.isErr() || !decisionResult.value) {
    return Response.json(
      { error: { code: 'PRECONDITION_FAILED', message: 'Idea must have a decision before simulating' } },
      { status: 422, headers: { 'X-Trace-Id': traceId } },
    );
  }

  const decision = decisionResult.value;

  const result = await container.simulateRevenueUseCase.execute({
    ideaId,
    ideaText: ideaResult.value.text,
    verdict: decision.verdict,
    userId,
    traceId,
  });

  if (result.isErr()) {
    return Response.json(
      { error: { code: 'INTERNAL', message: result.error.message } },
      { status: 500, headers: { 'X-Trace-Id': traceId } },
    );
  }

  return Response.json({ data: result.value }, { status: 201, headers: { 'X-Trace-Id': traceId } });
}
