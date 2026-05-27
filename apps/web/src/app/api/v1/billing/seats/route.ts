import { z } from 'zod';
import { container } from '@/lib/container';
import { resolveUserId } from '@/lib/api-auth';
import { logger } from '@pledgeoff/observability';
import { TeamSeatsPlanError, TeamSeatsQuantityError, PLAN_LIMITS, effectivePlan } from '@pledgeoff/core';

const SeatsRequestSchema = z.object({
  extraSeats: z.number().int().min(0).max(97),
});

// POST /api/v1/billing/seats — buy or update extra seat add-on (Pro+ owner only)
export async function POST(req: Request) {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();

  const userId = await resolveUserId(req.headers.get('authorization'));
  if (!userId) {
    return Response.json({ error: { code: 'UNAUTHENTICATED' } }, { status: 401, headers: { 'X-Trace-Id': traceId } });
  }

  if (!container.stripeAdapter) {
    return Response.json({ error: { code: 'STRIPE_NOT_CONFIGURED' } }, { status: 503, headers: { 'X-Trace-Id': traceId } });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return Response.json({ error: { code: 'INVALID_JSON' } }, { status: 400, headers: { 'X-Trace-Id': traceId } });
  }

  const parsed = SeatsRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: { code: 'VALIDATION_FAILED', details: parsed.error.flatten() } }, { status: 400, headers: { 'X-Trace-Id': traceId } });
  }

  const { extraSeats } = parsed.data;

  // Validate business rules
  const ctxResult = await container.updateTeamSeatsUseCase.execute({ userId, extraSeats, traceId });
  if (ctxResult.isErr()) {
    const e = ctxResult.error;
    if (e instanceof TeamSeatsPlanError) {
      return Response.json({ error: { code: 'PLAN_REQUIRED', message: e.message } }, { status: 403, headers: { 'X-Trace-Id': traceId } });
    }
    if (e instanceof TeamSeatsQuantityError) {
      return Response.json({ error: { code: 'INVALID_QUANTITY', message: e.message } }, { status: 400, headers: { 'X-Trace-Id': traceId } });
    }
    return Response.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500, headers: { 'X-Trace-Id': traceId } });
  }

  const { subscription, commitSeats } = ctxResult.value;

  if (!subscription.stripeSubscriptionId) {
    return Response.json({ error: { code: 'NO_STRIPE_SUBSCRIPTION' } }, { status: 422, headers: { 'X-Trace-Id': traceId } });
  }

  const plan = effectivePlan(subscription);
  const extraSeatPriceId = process.env.STRIPE_EXTRA_SEAT_PRICE_ID;

  if (!extraSeatPriceId) {
    logger.error({ traceId, userId, plan }, 'STRIPE_EXTRA_SEAT_PRICE_ID not configured');
    return Response.json({ error: { code: 'SERVER_MISCONFIGURATION' } }, { status: 503, headers: { 'X-Trace-Id': traceId } });
  }

  // Manage Stripe subscription item
  const stripeResult = await container.stripeAdapter.manageSeatAddon({
    stripeSubscriptionId: subscription.stripeSubscriptionId,
    extraSeatPriceId,
    quantity: extraSeats,
    existingItemId: subscription.stripeExtraSeatItemId,
  });

  if (stripeResult.isErr()) {
    logger.error({ traceId, userId, error: stripeResult.error.message }, 'billing/seats: stripe error');
    return Response.json({ error: { code: 'STRIPE_ERROR', message: 'Failed to update seat add-on' } }, { status: 502, headers: { 'X-Trace-Id': traceId } });
  }

  // Persist to DB
  const commitResult = await commitSeats(stripeResult.value.itemId);
  if (commitResult.isErr()) {
    logger.error({ traceId, userId }, 'billing/seats: DB commit failed after Stripe success');
    return Response.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500, headers: { 'X-Trace-Id': traceId } });
  }

  void container.auditLog.log({
    userId,
    action: 'seat_addon_updated',
    resourceType: 'subscription',
    metadata: { extraSeats, plan, stripeItemId: stripeResult.value.itemId },
    traceId,
  });

  const baseSeats = PLAN_LIMITS[plan].seatsIncluded;
  return Response.json({
    data: {
      extraSeats,
      totalSeats: baseSeats + extraSeats,
      stripeItemId: stripeResult.value.itemId,
    },
  }, { status: 200, headers: { 'X-Trace-Id': traceId } });
}
