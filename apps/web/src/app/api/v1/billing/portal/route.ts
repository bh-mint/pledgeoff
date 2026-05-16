import { createClient } from '@supabase/supabase-js';
import { container } from '@/lib/container';

async function resolveUser(authHeader: string | null): Promise<{ id: string } | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data } = await anonClient.auth.getUser(token);
  if (!data.user) return null;
  return { id: data.user.id };
}

export async function POST(req: Request): Promise<Response> {
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

  const subResult = await container._repos.subscriptionRepo.findByUserId(user.id);
  const stripeCustomerId = subResult.isOk() ? subResult.value?.stripeCustomerId : null;

  if (!stripeCustomerId) {
    return Response.json(
      { error: { code: 'NO_SUBSCRIPTION', message: 'No active Stripe subscription found' } },
      { status: 400, headers: { 'X-Trace-Id': traceId } },
    );
  }

  const origin = req.headers.get('origin') ?? 'https://pledgeoff.com';
  const portalResult = await container.stripeAdapter.createCustomerPortalSession(
    stripeCustomerId,
    `${origin}/settings`,
  );

  if (portalResult.isErr()) {
    return Response.json(
      { error: { code: 'STRIPE_ERROR', message: 'Failed to create portal session' } },
      { status: 502, headers: { 'X-Trace-Id': traceId } },
    );
  }

  void container.auditLog.log({
    userId: user.id,
    action: 'billing_portal_accessed',
    resourceType: 'subscription',
    traceId,
  });

  return Response.json(
    { data: { url: portalResult.value } },
    { status: 200, headers: { 'X-Trace-Id': traceId } },
  );
}
