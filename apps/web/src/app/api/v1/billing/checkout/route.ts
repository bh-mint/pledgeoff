import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { container } from '@/lib/container';

const CheckoutRequestSchema = z.object({
  priceId: z.string().min(1),
});

async function resolveUser(authHeader: string | null): Promise<{ id: string; email: string } | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data } = await anonClient.auth.getUser(token);
  if (!data.user) return null;
  return { id: data.user.id, email: data.user.email ?? '' };
}

export async function POST(req: Request) {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();

  const user = await resolveUser(req.headers.get('authorization'));
  if (!user) {
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

  const parsed = CheckoutRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: { code: 'VALIDATION_FAILED', details: parsed.error.flatten() } },
      { status: 400, headers: { 'X-Trace-Id': traceId } },
    );
  }

  // Get existing stripe customer ID if any
  const subResult = await container.subscriptionRepo.findByUserId(user.id);
  const stripeCustomerId = subResult.isOk() ? subResult.value?.stripeCustomerId : null;

  const origin = req.headers.get('origin') ?? 'https://pledgeoff.com';
  const sessionResult = await container.stripeAdapter.createCheckoutSession({
    userId: user.id,
    userEmail: user.email,
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

  return Response.json(
    { data: { url: sessionResult.value.url } },
    { status: 200, headers: { 'X-Trace-Id': traceId } },
  );
}
