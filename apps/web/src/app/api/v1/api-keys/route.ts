import { CreateApiKeyRequestSchema } from '@pledgeoff/contracts';
import { container } from '@/lib/container';
import { resolveUserId } from '@/lib/api-auth';
import { getUserPlan } from '@/server/billing/getUserPlan';
import { logger } from '@pledgeoff/observability';
import {
  ApiKeyNameInvalidError,
  ApiKeyLimitReachedError,
  isAtLeastPlan,
  PLAN,
} from '@pledgeoff/core';

function unauthorized(traceId: string) {
  return Response.json(
    { error: { code: 'UNAUTHENTICATED', message: 'Valid authentication required' } },
    { status: 401, headers: { 'X-Trace-Id': traceId } },
  );
}

function forbidden(traceId: string, message: string) {
  return Response.json(
    { error: { code: 'FORBIDDEN', message } },
    { status: 403, headers: { 'X-Trace-Id': traceId } },
  );
}

export async function GET(req: Request) {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();

  const userId = await resolveUserId(req.headers.get('authorization'));
  if (!userId) return unauthorized(traceId);

  const plan = await getUserPlan(userId);
  if (!isAtLeastPlan(plan, PLAN.TEAM)) {
    return forbidden(traceId, 'API access requires Pro+ or Agency plan');
  }

  const result = await container.listApiKeysUseCase.execute({ userId, traceId });
  if (result.isErr()) {
    logger.error({ traceId, error: result.error.message }, 'list-api-keys failed');
    return Response.json(
      { error: { code: 'INTERNAL', message: 'An unexpected error occurred' } },
      { status: 500, headers: { 'X-Trace-Id': traceId } },
    );
  }

  const keys = result.value.map((k) => ({
    id: k.id,
    name: k.name,
    keyPrefix: k.keyPrefix,
    createdAt: k.createdAt,
    lastUsedAt: k.lastUsedAt,
    revokedAt: k.revokedAt,
  }));

  return Response.json({ data: keys }, { headers: { 'X-Trace-Id': traceId } });
}

export async function POST(req: Request) {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();

  const userId = await resolveUserId(req.headers.get('authorization'));
  if (!userId) return unauthorized(traceId);

  const plan = await getUserPlan(userId);
  if (!isAtLeastPlan(plan, PLAN.TEAM)) {
    return forbidden(traceId, 'API access requires Pro+ or Agency plan');
  }

  const body = await req.json();
  const parsed = CreateApiKeyRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: { code: 'VALIDATION_FAILED', details: parsed.error.flatten() } },
      { status: 400, headers: { 'X-Trace-Id': traceId } },
    );
  }

  const result = await container.generateApiKeyUseCase.execute({
    userId,
    name: parsed.data.name,
    traceId,
  });

  if (result.isErr()) {
    const error = result.error;
    if (error instanceof ApiKeyNameInvalidError) {
      return Response.json(
        { error: { code: 'VALIDATION_FAILED', message: error.message } },
        { status: 400, headers: { 'X-Trace-Id': traceId } },
      );
    }
    if (error instanceof ApiKeyLimitReachedError) {
      return Response.json(
        { error: { code: 'LIMIT_REACHED', message: error.message } },
        { status: 422, headers: { 'X-Trace-Id': traceId } },
      );
    }
    logger.error({ traceId, error: error.message }, 'generate-api-key failed');
    return Response.json(
      { error: { code: 'INTERNAL', message: 'An unexpected error occurred' } },
      { status: 500, headers: { 'X-Trace-Id': traceId } },
    );
  }

  const { apiKey, plaintext } = result.value;

  return Response.json(
    {
      data: {
        id: apiKey.id,
        name: apiKey.name,
        keyPrefix: apiKey.keyPrefix,
        createdAt: apiKey.createdAt,
        lastUsedAt: apiKey.lastUsedAt,
        revokedAt: apiKey.revokedAt,
        key: plaintext, // shown once
      },
    },
    { status: 201, headers: { 'X-Trace-Id': traceId } },
  );
}
