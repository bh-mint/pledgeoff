import { after } from 'next/server';
import { CreateIdeaRequestSchema } from '@pledgeoff/contracts';
import { container } from '@/lib/container';
import { checkRateLimit } from '@/lib/rate-limiter';
import { logger } from '@pledgeoff/observability';
import { VerificationsExhaustedError } from '@pledgeoff/core';
import { resolveUserIdFromRequest } from '@/lib/api-auth';
import { classifyNiche } from '@/lib/niche-classifier';
import { withApiKeyLogging } from '@/lib/with-api-key-logging';

export const maxDuration = 60;

function unauthorizedResponse(traceId: string) {
  return Response.json(
    { error: { code: 'UNAUTHENTICATED', message: 'Valid authentication required' } },
    { status: 401, headers: { 'X-Trace-Id': traceId } },
  );
}

async function getHandler(req: Request) {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();

  const userId = await resolveUserIdFromRequest(req);
  if (!userId) return unauthorizedResponse(traceId);

  const url = new URL(req.url);
  const limitParam = url.searchParams.get('limit');
  const cursor = url.searchParams.get('cursor') ?? undefined;
  const limit = Math.min(Math.max(1, parseInt(limitParam ?? '20', 10) || 20), 100);

  const result = await container.ideaRepo.findByUserIdPaginated(userId, limit, cursor);
  if (result.isErr()) {
    return Response.json(
      { error: { code: 'INTERNAL', message: 'An unexpected error occurred' } },
      { status: 500, headers: { 'X-Trace-Id': traceId } },
    );
  }

  const { ideas, hasMore, nextCursor } = result.value;
  const decisions = await Promise.all(
    ideas.map((idea) => container.decisionRepo.findByIdeaId(idea.id))
  );

  const data = ideas.map((idea, i) => ({
    ...idea,
    decision: decisions[i].isOk() ? decisions[i].value : null,
  }));

  return Response.json(
    { data, meta: { hasMore, nextCursor } },
    { status: 200, headers: { 'X-Trace-Id': traceId } },
  );
}

async function postHandler(req: Request) {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();

  const userId = await resolveUserIdFromRequest(req);
  if (!userId) return unauthorizedResponse(traceId);

  // Rate limiting
  const rateLimit = await checkRateLimit(userId);
  if (!rateLimit.allowed) {
    logger.warn(
      { traceId, userId, action: 'create_idea', outcome: 'error', errorCode: 'RATE_LIMITED' },
      'Rate limit exceeded',
    );
    void container.auditLog.log({ userId, action: 'rate_limited', resourceType: 'idea', resourceId: '', traceId });
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
    const alreadyProcessed = await container.idempotencyStore.hasBeenProcessed(idempotencyKey);
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

  // Verification gate — atomic: checks included quota + deducts from pack if exhausted.
  // Called after all other guards so pack credits are never deducted on blocked requests.
  const deductResult = await container.subscriptionRepo.deductVerification(userId);
  if (deductResult.isErr()) {
    if (deductResult.error instanceof VerificationsExhaustedError) {
      return Response.json(
        { error: { code: 'PLAN_LIMIT_REACHED', message: 'Monthly validation limit reached. Upgrade your plan or buy a Validation Pack.' } },
        { status: 403, headers: { 'X-Trace-Id': traceId } },
      );
    }
    logger.error({ traceId, userId, outcome: 'error' as const, error: String(deductResult.error) }, 'ideas POST: deductVerification failed');
    return Response.json(
      { error: { code: 'INTERNAL', message: 'An unexpected error occurred' } },
      { status: 500, headers: { 'X-Trace-Id': traceId } },
    );
  }

  const niche = classifyNiche(parsed.data.text);
  const context = parsed.data.context?.trim() || null;

  // Auto-resolve teamId: if client didn't send one, inherit from the user's team
  let teamId = parsed.data.teamId ?? null;
  if (!teamId) {
    const [memberResult, ownerResult] = await Promise.all([
      container.teamRepo.findByMemberId(userId),
      container.teamRepo.findByOwnerId(userId),
    ]);
    const memberTeam = memberResult.isOk() ? memberResult.value : null;
    const ownerTeam = ownerResult.isOk() ? ownerResult.value : null;
    teamId = memberTeam?.id ?? ownerTeam?.id ?? null;
  }

  const result = await container.createIdeaUseCase.execute({
    userId,
    text: parsed.data.text,
    teamId,
    niche,
    context,
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
    await container.idempotencyStore.markAsProcessed(idempotencyKey);
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

export const GET = withApiKeyLogging(getHandler);
export const POST = withApiKeyLogging(postHandler);
