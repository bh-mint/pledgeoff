import { z } from 'zod';
import { resolveUserId } from '@/lib/api-auth';
import { createSupabaseServiceClient } from '@/lib/supabase-server';
import { container } from '@/lib/container';
import { logger } from '@pledgeoff/observability';
import { OTTO_PACK_SIZES, OTTO_PACK_PRICES_EUR } from '@pledgeoff/core';

const OttoPackSchema = z.object({
  questionCount: z.union([z.literal(1), z.literal(3), z.literal(5), z.literal(10)]),
});

const OTTO_PACK_PRICE_IDS: Record<number, string | undefined> = {
  1:  process.env.STRIPE_OTTO_1Q_PRICE_ID,
  3:  process.env.STRIPE_OTTO_3Q_PRICE_ID,
  5:  process.env.STRIPE_OTTO_5Q_PRICE_ID,
  10: process.env.STRIPE_OTTO_10Q_PRICE_ID,
};

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

  const parsed = OttoPackSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: { code: 'VALIDATION_FAILED', details: parsed.error.flatten() } }, { status: 400, headers: { 'X-Trace-Id': traceId } });
  }

  const { questionCount } = parsed.data;
  const priceId = OTTO_PACK_PRICE_IDS[questionCount];
  if (!priceId) {
    logger.error({ traceId, userId, questionCount }, 'Missing STRIPE_OTTO_*Q_PRICE_ID env var');
    return Response.json({ error: { code: 'PACK_NOT_CONFIGURED', message: `Otto ${questionCount}Q pack price ID not configured` } }, { status: 503, headers: { 'X-Trace-Id': traceId } });
  }

  const { data: userData } = await createSupabaseServiceClient().auth.admin.getUserById(userId);
  const userEmail = userData?.user?.email ?? '';

  const subResult = await container.getOttoBalanceUseCase.execute(userId);
  const stripeCustomerId = null; // Otto packs use payment mode, customer lookup via webhook metadata

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://pledgeoff.com';
  const result = await container.stripeAdapter.createOttoPackCheckoutSession({
    userId,
    userEmail,
    priceId,
    questionCount,
    successUrl: `${baseUrl}/settings?otto_pack=success&count=${questionCount}`,
    cancelUrl: `${baseUrl}/settings?otto_pack=cancelled`,
    stripeCustomerId,
  });

  if (result.isErr()) {
    logger.error({ traceId, userId, error: result.error.message }, 'Otto pack checkout failed');
    return Response.json({ error: { code: 'CHECKOUT_FAILED' } }, { status: 500, headers: { 'X-Trace-Id': traceId } });
  }

  logger.info({ traceId, userId, questionCount, outcome: 'success' }, 'Otto pack checkout created');
  return Response.json({ data: { url: result.value.url } }, { status: 200, headers: { 'X-Trace-Id': traceId } });
}
