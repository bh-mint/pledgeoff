import { z } from 'zod';
import { resolveUserId } from '@/lib/api-auth';
import { createSupabaseServiceClient } from '@/lib/supabase-server';
import { container } from '@/lib/container';
import { logger } from '@pledgeoff/observability';

const ValidationPackSchema = z.object({
  validationCount: z.union([z.literal(10), z.literal(25), z.literal(60)]),
});

const VALIDATION_PACK_PRICE_IDS: Record<number, string | undefined> = {
  10: process.env.STRIPE_VALIDATION_PACK_10_PRICE_ID,
  25: process.env.STRIPE_VALIDATION_PACK_25_PRICE_ID,
  60: process.env.STRIPE_VALIDATION_PACK_60_PRICE_ID,
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

  const parsed = ValidationPackSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: { code: 'VALIDATION_FAILED', details: parsed.error.flatten() } }, { status: 400, headers: { 'X-Trace-Id': traceId } });
  }

  const { validationCount } = parsed.data;
  const priceId = VALIDATION_PACK_PRICE_IDS[validationCount];
  if (!priceId) {
    logger.error({ traceId, userId, validationCount }, 'Missing STRIPE_VALIDATION_PACK_*_PRICE_ID env var');
    return Response.json({ error: { code: 'PACK_NOT_CONFIGURED', message: `Validation ${validationCount} pack price ID not configured` } }, { status: 503, headers: { 'X-Trace-Id': traceId } });
  }

  const { data: userData } = await createSupabaseServiceClient().auth.admin.getUserById(userId);
  const userEmail = userData?.user?.email ?? '';

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://pledgeoff.com';
  const result = await container.stripeAdapter.createValidationPackCheckoutSession({
    userId,
    userEmail,
    priceId,
    validationCount,
    successUrl: `${baseUrl}/settings?validation_pack=success&count=${validationCount}`,
    cancelUrl: `${baseUrl}/settings?validation_pack=cancelled`,
    stripeCustomerId: null,
  });

  if (result.isErr()) {
    logger.error({ traceId, userId, error: result.error.message }, 'Validation pack checkout failed');
    return Response.json({ error: { code: 'CHECKOUT_FAILED' } }, { status: 500, headers: { 'X-Trace-Id': traceId } });
  }

  logger.info({ traceId, userId, validationCount, outcome: 'success' }, 'Validation pack checkout created');
  return Response.json({ data: { url: result.value.url } }, { status: 200, headers: { 'X-Trace-Id': traceId } });
}
