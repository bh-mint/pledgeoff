import { requireAdminApi } from '@/lib/admin-auth';
import { container } from '@/lib/container';
import { logger } from '@pledgeoff/observability';
import { z } from 'zod';

const Schema = z.object({
  // null = lift override (restore Stripe as authoritative)
  plan: z.enum(['free', 'founder', 'team', 'studio', 'enterprise']).nullable(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();
  const adminId = await requireAdminApi(req);
  if (!adminId) return Response.json({ error: { code: 'FORBIDDEN' } }, { status: 403 });

  const { id } = await params;
  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: { code: 'VALIDATION_FAILED' } }, { status: 400 });

  const { plan } = parsed.data;

  if (plan === null) {
    // Lift override — Stripe becomes authoritative again
    const result = await container.subscriptionRepo.setAdminOverride(id, false);
    if (result.isErr()) {
      logger.error({ traceId, userId: id }, 'admin.lift_override_failed');
      return Response.json({ error: { code: 'INTERNAL' } }, { status: 500 });
    }
    logger.info({ traceId, userId: id, adminId }, 'admin.override_lifted');
    return Response.json({ ok: true }, { headers: { 'X-Trace-Id': traceId } });
  }

  // Set override — upsert plan + mark override flag
  const upsertResult = await container.subscriptionRepo.upsert({ userId: id, plan, status: 'active' });
  if (upsertResult.isErr()) {
    logger.error({ traceId, userId: id }, 'admin.override_plan_upsert_failed');
    return Response.json({ error: { code: 'INTERNAL' } }, { status: 500 });
  }

  const flagResult = await container.subscriptionRepo.setAdminOverride(id, true);
  if (flagResult.isErr()) {
    logger.error({ traceId, userId: id }, 'admin.override_flag_failed');
    return Response.json({ error: { code: 'INTERNAL' } }, { status: 500 });
  }

  logger.info({ traceId, userId: id, plan, adminId }, 'admin.override_plan_set');
  return Response.json({ ok: true }, { headers: { 'X-Trace-Id': traceId } });
}
