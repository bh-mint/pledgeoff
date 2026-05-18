import { resolveUserId } from '@/lib/api-auth';
import { container } from '@/lib/container';

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

  const subResult = await container._repos.subscriptionRepo.findByUserId(userId);
  const sub = subResult.isOk() ? subResult.value : null;

  if (!sub?.stripeSubscriptionId) {
    return Response.json(
      { error: { code: 'NO_SUBSCRIPTION', message: 'No active subscription found' } },
      { status: 400, headers: { 'X-Trace-Id': traceId } },
    );
  }

  const result = await container.stripeAdapter.cancelSubscription(sub.stripeSubscriptionId);

  if (result.isErr()) {
    return Response.json(
      { error: { code: 'STRIPE_ERROR', message: 'Failed to cancel subscription' } },
      { status: 502, headers: { 'X-Trace-Id': traceId } },
    );
  }

  void container.auditLog.log({
    userId,
    action: 'subscription_cancelled',
    resourceType: 'subscription',
    traceId,
  });

  return Response.json({ data: { ok: true } }, { status: 200, headers: { 'X-Trace-Id': traceId } });
}
