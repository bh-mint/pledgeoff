import { z } from 'zod';
import { container } from '@/lib/container';
import { resolveUserIdFromRequest } from '@/lib/api-auth';
import { InvalidVerdictError } from '@pledgeoff/core';

const RecordOutcomeBodySchema = z.object({
  outcomeType: z.enum(['built_worked', 'built_failed', 'not_built']),
  notes: z.string().max(1000).nullable().optional(),
  lostToCompetitor: z.string().max(100).nullable().optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();
  const { id: ideaId } = await params;

  const userId = await resolveUserIdFromRequest(req);
  if (!userId) {
    return Response.json({ error: { code: 'UNAUTHENTICATED' } }, { status: 401, headers: { 'X-Trace-Id': traceId } });
  }

  const body = await req.json().catch(() => null);
  const parsed = RecordOutcomeBodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: { code: 'VALIDATION_FAILED', details: parsed.error.flatten() } },
      { status: 400, headers: { 'X-Trace-Id': traceId } },
    );
  }

  const result = await container.recordOutcomeUseCase.execute({
    ideaId,
    userId,
    outcomeType: parsed.data.outcomeType,
    notes: parsed.data.notes ?? null,
    lostToCompetitor: parsed.data.lostToCompetitor ?? null,
    traceId,
  });

  if (result.isErr()) {
    const e = result.error;
    if (e instanceof InvalidVerdictError) {
      return Response.json({ error: { code: 'NOT_FOUND' } }, { status: 404, headers: { 'X-Trace-Id': traceId } });
    }
    return Response.json({ error: { code: 'INTERNAL' } }, { status: 500, headers: { 'X-Trace-Id': traceId } });
  }

  return Response.json({ data: result.value }, { status: 200, headers: { 'X-Trace-Id': traceId } });
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();
  const { id: ideaId } = await params;

  const userId = await resolveUserIdFromRequest(req);
  if (!userId) {
    return Response.json({ error: { code: 'UNAUTHENTICATED' } }, { status: 401, headers: { 'X-Trace-Id': traceId } });
  }

  const result = await container.decisionOutcomeRepo.findByIdea(ideaId);
  if (result.isErr()) {
    return Response.json({ error: { code: 'INTERNAL' } }, { status: 500, headers: { 'X-Trace-Id': traceId } });
  }

  // ownership check: 404 if outcome belongs to another user
  if (result.value && result.value.userId !== userId) {
    return Response.json({ error: { code: 'NOT_FOUND' } }, { status: 404, headers: { 'X-Trace-Id': traceId } });
  }

  return Response.json({ data: result.value }, { status: 200, headers: { 'X-Trace-Id': traceId } });
}
