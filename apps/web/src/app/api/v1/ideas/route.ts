import { createClient } from '@supabase/supabase-js';
import { CreateIdeaRequestSchema } from '@pledgeoff/contracts';
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

export async function GET(req: Request) {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();

  const userId = await resolveUserId(req.headers.get('authorization'));
  if (!userId) return unauthorizedResponse(traceId);

  const result = await container._repos.ideaRepo.findByUserId(userId);
  if (result.isErr()) {
    return Response.json(
      { error: { code: 'INTERNAL', message: 'An unexpected error occurred' } },
      { status: 500, headers: { 'X-Trace-Id': traceId } },
    );
  }

  const ideas = result.value;
  const decisions = await Promise.all(
    ideas.map((idea) => container._repos.decisionRepo.findByIdeaId(idea.id))
  );

  const data = ideas.map((idea, i) => ({
    ...idea,
    decision: decisions[i].isOk() ? decisions[i].value : null,
  }));

  return Response.json({ data }, { status: 200, headers: { 'X-Trace-Id': traceId } });
}

export async function POST(req: Request) {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();

  const userId = await resolveUserId(req.headers.get('authorization'));
  if (!userId) return unauthorizedResponse(traceId);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON' } },
      { status: 400, headers: { 'X-Trace-Id': traceId } },
    );
  }

  const parsed = CreateIdeaRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: { code: 'VALIDATION_FAILED', details: parsed.error.flatten() } },
      { status: 400, headers: { 'X-Trace-Id': traceId } },
    );
  }

  const result = await container.createIdeaUseCase.execute({
    userId,
    text: parsed.data.text,
    traceId,
  });

  if (result.isErr()) {
    const error = result.error;
    if (error.code === 'IDEA_TOO_SHORT' || error.code === 'IDEA_TOO_LONG') {
      return Response.json(
        { error: { code: error.code, message: error.message } },
        { status: 422, headers: { 'X-Trace-Id': traceId } },
      );
    }
    return Response.json(
      { error: { code: 'INTERNAL', message: 'An unexpected error occurred' } },
      { status: 500, headers: { 'X-Trace-Id': traceId } },
    );
  }

  return Response.json(
    { data: result.value },
    { status: 201, headers: { 'X-Trace-Id': traceId } },
  );
}
