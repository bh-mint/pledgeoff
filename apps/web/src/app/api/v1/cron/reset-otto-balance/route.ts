import { logger } from '@pledgeoff/observability';
import { container } from '@/lib/container';
import { requireCronAuth } from '@/lib/cron-auth';

export const maxDuration = 30;

// Runs monthly (1st of each month, 00:01 UTC).
// Resets otto_included_used to 0 for all non-free subscriptions.
export async function GET(req: Request): Promise<Response> {
  const auth = requireCronAuth(req);
  if (!auth.ok) return Response.json({ error: auth.body }, { status: auth.status });

  const traceId = crypto.randomUUID();

  const result = await container.subscriptionRepo.resetAllOttoIncludedUsed();
  if (result.isErr()) {
    logger.error({ traceId, error: String(result.error) }, 'reset-otto-balance: failed');
    return Response.json({ ok: false }, { status: 500 });
  }

  logger.info({ traceId }, 'reset-otto-balance: completed');
  return Response.json({ ok: true });
}
