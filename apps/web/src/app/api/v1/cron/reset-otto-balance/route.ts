import { logger } from '@pledgeoff/observability';
import { container } from '@/lib/container';

export const maxDuration = 30;

// Runs monthly (1st of each month, 00:01 UTC).
// Resets otto_included_used to 0 for all non-free subscriptions.
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

  const result = await container.subscriptionRepo.resetAllOttoIncludedUsed();
  if (result.isErr()) {
    logger.error({ traceId, error: String(result.error) }, 'reset-otto-balance: failed');
    return Response.json({ ok: false }, { status: 500 });
  }

  logger.info({ traceId }, 'reset-otto-balance: completed');
  return Response.json({ ok: true });
}
