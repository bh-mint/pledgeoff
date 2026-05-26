import { z } from 'zod';
import { resolveUserId } from '@/lib/api-auth';
import { container } from '@/lib/container';

const ALLOWED_PRICE_IDS = [
  process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
  process.env.STRIPE_PRO_ANNUAL_PRICE_ID,
  process.env.STRIPE_PRO_PLUS_MONTHLY_PRICE_ID,
  process.env.STRIPE_PRO_PLUS_ANNUAL_PRICE_ID,
].filter(Boolean) as string[];

const Schema = z.object({ priceId: z.string().min(1) });

export async function POST(req: Request): Promise<Response> {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();

  const userId = await resolveUserId(req.headers.get('authorization'));
  if (!userId) {
    return Response.json(
      { error: { code: 'UNAUTHENTICATED', message: 'Valid authentication required' } },
      { status: 401, headers: { 'X-Trace-Id': traceId } },
    );
  }

  if (!container.stripeAdapter) {
    return Response.json(
      { error: { code: 'STRIPE_NOT_CONFIGURED', message: 'Billing is not configured' } },
      { status: 503, headers: { 'X-Trace-Id': traceId } },
    );
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return Response.json(
      { error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON' } },
      { status: 400, headers: { 'X-Trace-Id': traceId } },
    );
  }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: { code: 'VALIDATION_FAILED', details: parsed.error.flatten() } },
      { status: 400, headers: { 'X-Trace-Id': traceId } },
    );
  }

  if (!ALLOWED_PRICE_IDS.includes(parsed.data.priceId)) {
    return Response.json(
      { error: { code: 'INVALID_PRICE_ID', message: 'Unknown price ID' } },
      { status: 400, headers: { 'X-Trace-Id': traceId } },
    );
  }

  const subResult = await container._unsafeRepos.subscriptionRepo.findByUserId(userId);
  const sub = subResult.isOk() ? subResult.value : null;

  if (!sub?.stripeSubscriptionId) {
    return Response.json(
      { error: { code: 'NO_SUBSCRIPTION', message: 'No active subscription found' } },
      { status: 400, headers: { 'X-Trace-Id': traceId } },
    );
  }

  const result = await container.stripeAdapter.updateSubscription(
    sub.stripeSubscriptionId,
    parsed.data.priceId,
  );

  if (result.isErr()) {
    return Response.json(
      { error: { code: 'STRIPE_ERROR', message: 'Failed to change plan' } },
      { status: 502, headers: { 'X-Trace-Id': traceId } },
    );
  }

  void container.auditLog.log({
    userId,
    action: 'plan_changed',
    resourceType: 'subscription',
    metadata: { newPriceId: parsed.data.priceId },
    traceId,
  });

  return Response.json({ data: { ok: true } }, { status: 200, headers: { 'X-Trace-Id': traceId } });
}
