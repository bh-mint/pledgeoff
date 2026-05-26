import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { container } from '@/lib/container';
import { logger } from '@pledgeoff/observability';
import { resolveUserId } from '@/lib/api-auth';
import { OttoInsufficientQuestionsError, OttoUnavailableError } from '@pledgeoff/core';

const OttoChatSchema = z.object({
  ideaId: z.string().uuid(),
  ideaText: z.string().min(1).max(2000),
  verdict: z.enum(['GO', 'KILL', 'PIVOT']),
  reasoning: z.string().min(1).max(5000),
  score: z.number().int().min(0).max(100),
  message: z.string().min(1).max(2000),
});

export async function POST(req: NextRequest) {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();

  const userId = await resolveUserId(req.headers.get('authorization'));
  if (!userId) {
    return NextResponse.json({ error: { code: 'UNAUTHENTICATED' } }, { status: 401, headers: { 'X-Trace-Id': traceId } });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: { code: 'INVALID_JSON' } }, { status: 400, headers: { 'X-Trace-Id': traceId } });
  }

  const parsed = OttoChatSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: { code: 'VALIDATION_FAILED', details: parsed.error.flatten() } }, { status: 400, headers: { 'X-Trace-Id': traceId } });
  }

  const result = await container.askOttoUseCase.execute({
    userId,
    ideaId: parsed.data.ideaId,
    ideaText: parsed.data.ideaText,
    verdict: parsed.data.verdict,
    reasoning: parsed.data.reasoning,
    score: parsed.data.score,
    userMessage: parsed.data.message,
    traceId,
  });

  if (result.isErr()) {
    const error = result.error;
    if (error instanceof OttoInsufficientQuestionsError) {
      return NextResponse.json({ error: { code: 'OTTO_NO_QUESTIONS', message: error.message } }, { status: 402, headers: { 'X-Trace-Id': traceId } });
    }
    if (error instanceof OttoUnavailableError) {
      return NextResponse.json({ error: { code: 'OTTO_UNAVAILABLE' } }, { status: 503, headers: { 'X-Trace-Id': traceId } });
    }
    logger.error({ traceId, userId, error: String(error) }, 'Otto chat failed');
    return NextResponse.json({ error: { code: 'INTERNAL' } }, { status: 500, headers: { 'X-Trace-Id': traceId } });
  }

  logger.info({ traceId, userId, ideaId: parsed.data.ideaId, outcome: 'success' }, 'Otto chat succeeded');

  return NextResponse.json({ data: result.value }, { status: 200, headers: { 'X-Trace-Id': traceId } });
}
