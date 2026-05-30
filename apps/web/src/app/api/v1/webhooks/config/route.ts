import { z } from 'zod';
import { container } from '@/lib/container';
import { resolveUserIdFromRequest } from '@/lib/api-auth';
import { getUserPlan } from '@/server/billing/getUserPlan';
import { isAtLeastPlan } from '@pledgeoff/core';
import { logger } from '@pledgeoff/observability';

function unauthorized(traceId: string) {
  return Response.json(
    { error: { code: 'UNAUTHENTICATED', message: 'Valid authentication required' } },
    { status: 401, headers: { 'X-Trace-Id': traceId } },
  );
}

async function requireFounderPlus(userId: string, traceId: string) {
  const plan = await getUserPlan(userId);
  if (!isAtLeastPlan('founder', plan)) {
    return Response.json(
      { error: { code: 'FORBIDDEN', message: 'Webhook delivery requires a Founder plan or higher.' } },
      { status: 403, headers: { 'X-Trace-Id': traceId } },
    );
  }
  return null;
}

// GET — return current config (url + active, no secret)
export async function GET(req: Request) {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();
  const userId = await resolveUserIdFromRequest(req);
  if (!userId) return unauthorized(traceId);

  const gate = await requireFounderPlus(userId, traceId);
  if (gate) return gate;

  const result = await container.webhookConfigRepo.findByUserId(userId);
  if (result.isErr()) {
    return Response.json(
      { error: { code: 'INTERNAL', message: 'An unexpected error occurred' } },
      { status: 500, headers: { 'X-Trace-Id': traceId } },
    );
  }

  const config = result.value;
  return Response.json(
    { data: config ? { url: config.url, active: config.active, createdAt: config.createdAt } : null },
    { status: 200, headers: { 'X-Trace-Id': traceId } },
  );
}

const RegisterWebhookBody = z.object({
  url: z.string().url(),
});

// POST — register or replace webhook endpoint; returns plaintext secret once
export async function POST(req: Request) {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();
  const userId = await resolveUserIdFromRequest(req);
  if (!userId) return unauthorized(traceId);

  const gate = await requireFounderPlus(userId, traceId);
  if (gate) return gate;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON' } },
      { status: 400, headers: { 'X-Trace-Id': traceId } },
    );
  }

  const parsed = RegisterWebhookBody.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: { code: 'VALIDATION_FAILED', details: parsed.error.flatten() } },
      { status: 400, headers: { 'X-Trace-Id': traceId } },
    );
  }

  const result = await container.registerWebhookUseCase.execute({
    userId,
    url: parsed.data.url,
    traceId,
  });

  if (result.isErr()) {
    const code = result.error.code;
    if (code === 'WEBHOOK_URL_INVALID') {
      return Response.json(
        { error: { code, message: result.error.message } },
        { status: 422, headers: { 'X-Trace-Id': traceId } },
      );
    }
    return Response.json(
      { error: { code: 'INTERNAL', message: 'An unexpected error occurred' } },
      { status: 500, headers: { 'X-Trace-Id': traceId } },
    );
  }

  const { config } = result.value;
  logger.info({ traceId, userId, action: 'webhook_registered', url: config.url, outcome: 'success' }, 'Webhook registered');

  // Return secret only once — user must copy it now
  return Response.json(
    { data: { url: config.url, active: config.active, secret: config.signingSecret } },
    { status: 201, headers: { 'X-Trace-Id': traceId } },
  );
}

// DELETE — remove webhook endpoint
export async function DELETE(req: Request) {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();
  const userId = await resolveUserIdFromRequest(req);
  if (!userId) return unauthorized(traceId);

  const gate = await requireFounderPlus(userId, traceId);
  if (gate) return gate;

  const result = await container.webhookConfigRepo.deleteByUserId(userId);
  if (result.isErr()) {
    return Response.json(
      { error: { code: 'INTERNAL', message: 'An unexpected error occurred' } },
      { status: 500, headers: { 'X-Trace-Id': traceId } },
    );
  }

  logger.info({ traceId, userId, action: 'webhook_deleted', outcome: 'success' }, 'Webhook deleted');
  return new Response(null, { status: 204, headers: { 'X-Trace-Id': traceId } });
}
