import { z } from 'zod';
import { resolveUserId } from '@/lib/api-auth';
import { createSupabaseServiceClient } from '@/lib/supabase-server';
import { container } from '@/lib/container';

const CheckoutRequestSchema = z.object({
  priceId: z.string().min(1),
});

export async function POST(req: Request) {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();

  const userId = await resolveUserId(req.headers.get('authorization'));
  if (!userId) {
    return Response.json(
      { error: { code: 'UNAUTHENTICATED', message: 'Valid authentication required' } },
      { status: 401, headers: { 'X-Trace-Id': traceId } },
    );
  }

  const { data: userData } = await createSupabaseServiceClient().auth.admin.getUserById(userId);
  const userEmail = userData?.user?.email ?? '';

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

  const parsed = CheckoutRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: { code: 'VALIDATION_FAILED', details: parsed.error.flatten() } },
      { status: 400, headers: { 'X-Trace-Id': traceId } },
    );
  }

  // Get existing stripe customer ID if any
  const subResult = await container.subscriptionRepo.findByUserId(userId);
  const stripeCustomerId = subResult.isOk() ? subResult.value?.stripeCustomerId : null;

  const origin = req.headers.get('origin') ?? 'https://pledgeoff.com';
  const sessionResult = await container.stripeAdapter.createCheckoutSession({
    userId,
    userEmail: userEmail,
    priceId: parsed.data.priceId,
    successUrl: `${origin}/dashboard?billing=success`,
    cancelUrl: `${origin}/pricing`,
    stripeCustomerId,
  });

  if (sessionResult.isErr()) {
    return Response.json(
      { error: { code: 'STRIPE_ERROR', message: 'Failed to create checkout session' } },
      { status: 502, headers: { 'X-Trace-Id': traceId } },
    );
  }

  void container.auditLog.log({
    userId,
    action: 'checkout_initiated',
    resourceType: 'subscription',
    metadata: { priceId: parsed.data.priceId },
    traceId,
  });

  return Response.json(
    { data: { url: sessionResult.value.url } },
    { status: 200, headers: { 'X-Trace-Id': traceId } },
  );
}
