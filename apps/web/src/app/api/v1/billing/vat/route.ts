import { z } from 'zod';
import { container } from '@/lib/container';
import { resolveUserId } from '@/lib/api-auth';

const VatRequestSchema = z.object({
  vatId: z.string().max(20).nullable(),
});

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

  const body = await req.json().catch(() => ({}));
  const parsed = VatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: { code: 'VALIDATION_FAILED', details: parsed.error.flatten() } },
      { status: 400, headers: { 'X-Trace-Id': traceId } },
    );
  }

  const subResult = await container.subscriptionRepo.findByUserId(userId);
  const stripeCustomerId = subResult.isOk() ? subResult.value?.stripeCustomerId : null;
  if (!stripeCustomerId) {
    return Response.json(
      { error: { code: 'NO_SUBSCRIPTION', message: 'No active Stripe subscription found' } },
      { status: 400, headers: { 'X-Trace-Id': traceId } },
    );
  }

  const result = await container.stripeAdapter.upsertCustomerVatId(
    stripeCustomerId,
    parsed.data.vatId,
  );

  if (result.isErr()) {
    return Response.json(
      { error: { code: 'STRIPE_ERROR', message: result.error.message } },
      { status: 502, headers: { 'X-Trace-Id': traceId } },
    );
  }

  void container.auditLog.log({
    userId,
    action: parsed.data.vatId ? 'billing_vat_id_updated' : 'billing_vat_id_removed',
    resourceType: 'subscription',
    traceId,
  });

  return Response.json(
    { data: { vatId: result.value?.value ?? null } },
    { status: 200, headers: { 'X-Trace-Id': traceId } },
  );
}
