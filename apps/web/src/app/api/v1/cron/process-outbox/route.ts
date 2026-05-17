import { logger } from '@pledgeoff/observability';
import { container } from '@/lib/container';

export const maxDuration = 30;

// Called by Vercel Cron every minute to retry unprocessed outbox events.
// Protected by CRON_SECRET to prevent unauthorized calls.
export async function GET(req: Request): Promise<Response> {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    logger.error({ traceId: crypto.randomUUID() }, 'CRON_SECRET not set — refusing to execute cron');
    return Response.json({ error: 'Server misconfiguration' }, { status: 503 });
  }

  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const traceId = crypto.randomUUID();
  const stats = await container.eventBus.processEvents();

  if (stats.failed > 0) {
    logger.error({ traceId, ...stats }, 'process-outbox: errors in processEvents');
    return Response.json({ ok: false, ...stats }, { status: 500 });
  }

  return Response.json({ ok: true, ...stats });
}
