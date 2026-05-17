import { after } from 'next/server';
import { CreateIdeaRequestSchema } from '@pledgeoff/contracts';
import { container } from '@/lib/container';
import { checkRateLimit } from '@/lib/rate-limiter';
import { logger } from '@pledgeoff/observability';
import { getUserPlan } from '@/lib/getUserPlan';
import { PLAN_LIMITS } from '@pledgeoff/core';
import { resolveUserId } from '@/lib/api-auth';

export const maxDuration = 60;

function unauthorizedResponse(traceId: string) {
  return Response.json(
    { error: { code: 'UNAUTHENTICATED', message: 'Valid authentication required' } },
    { status: 401, headers: { 'X-Trace-Id': traceId } },
  );
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

  // Plan gate
  let plan: Awaited<ReturnType<typeof getUserPlan>>;
  try {
    plan = await getUserPlan(userId);
  } catch {
    logger.error({ traceId, userId, outcome: 'error' as const }, 'ideas POST: plan resolution failed');
    return Response.json(
      { error: { code: 'INTERNAL', message: 'An unexpected error occurred' } },
      { status: 500, headers: { 'X-Trace-Id': traceId } },
    );
  }
  const limit = PLAN_LIMITS[plan].verificationsPerMonth;
  if (isFinite(limit)) {
    const countResult = await container.ideaRepo.countThisMonth(userId);
    if (countResult.isOk() && countResult.value >= limit) {
      return Response.json(
        { error: { code: 'PLAN_LIMIT_REACHED', message: `Your ${plan} plan allows ${limit} verification${limit === 1 ? '' : 's'} per month. Upgrade to continue.`, plan } },
        { status: 403, headers: { 'X-Trace-Id': traceId } },
      );
    }
  }

  // Rate limiting
  const rateLimit = checkRateLimit(userId);
  if (!rateLimit.allowed) {
    logger.warn(
      { traceId, userId, action: 'create_idea', outcome: 'error', errorCode: 'RATE_LIMITED' },
      'Rate limit exceeded',
    );
    return Response.json(
      { error: { code: 'RATE_LIMITED', message: 'Too many requests. Try again later.' } },
      {
        status: 429,
        headers: {
          'X-Trace-Id': traceId,
          'Retry-After': String(Math.ceil(rateLimit.retryAfterMs / 1000)),
        },
      },
    );
  }

  // Idempotency-Key
  const idempotencyKey = req.headers.get('idempotency-key');
  if (idempotencyKey) {
    const alreadyProcessed = await container._repos.idempotencyStore.hasBeenProcessed(idempotencyKey);
    if (alreadyProcessed.isOk() && alreadyProcessed.value) {
      return Response.json(
        { error: { code: 'ALREADY_PROCESSED', message: 'This request was already processed.' } },
        { status: 409, headers: { 'X-Trace-Id': traceId } },
      );
    }
  }

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

  // Mark idempotency key as processed
  if (idempotencyKey) {
    await container._repos.idempotencyStore.markAsProcessed(idempotencyKey);
  }

  const idea = result.value;
  logger.info(
    { traceId, userId, action: 'create_idea', resourceId: idea.id, outcome: 'success' },
    'Idea created',
  );

  void container.auditLog.log({
    userId,
    action: 'idea_created',
    resourceType: 'idea',
    resourceId: idea.id,
    traceId,
  });

  // Run pipeline in background after 201 is sent — non-blocking
  after(async () => {
    const t = Date.now();
    // Step 1: idea.created.v1 → FetchSignals
    const s1 = await container.eventBus.processOutbox();
    logger.info({ traceId, ideaId: idea.id, step: 1, ...s1, elapsedMs: Date.now() - t }, 'pipeline step 1');
    // Step 2: signals.fetched.v1 → DecideUseCase
    const s2 = await container.eventBus.processOutbox();
    logger.info({ traceId, ideaId: idea.id, step: 2, ...s2, elapsedMs: Date.now() - t }, 'pipeline step 2');
    // Step 3: decision.ready.v1 → email (fire-and-forget)
    const s3 = await container.eventBus.processOutbox();
    logger.info({ traceId, ideaId: idea.id, step: 3, ...s3, elapsedMs: Date.now() - t }, 'pipeline step 3');
  });

  return Response.json(
    { data: idea },
    { status: 201, headers: { 'X-Trace-Id': traceId } },
  );
}
