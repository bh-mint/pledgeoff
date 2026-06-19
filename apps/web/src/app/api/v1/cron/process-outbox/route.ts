import { logger } from '@pledgeoff/observability';
import { container } from '@/lib/container';
import { requireCronAuth } from '@/lib/cron-auth';

export const maxDuration = 30;

// Called by Vercel Cron every minute to retry unprocessed outbox events.
// Protected by CRON_SECRET to prevent unauthorized calls.
export async function GET(req: Request): Promise<Response> {
  const auth = requireCronAuth(req);
  if (!auth.ok) return Response.json({ error: auth.body }, { status: auth.status });

  const traceId = crypto.randomUUID();
  const stats = await container.eventBus.processEvents();

  if (stats.blocked > 0) {
    logger.error({ traceId, ...stats }, 'process-outbox: blocked events detected — manual intervention required');
  }

  if (stats.failed > 0) {
    logger.error({ traceId, ...stats }, 'process-outbox: errors in processEvents');
    return Response.json({ ok: false, ...stats }, { status: 500 });
  }

  return Response.json({ ok: true, ...stats });
}
