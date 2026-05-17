import { createServiceRoleClient } from '@/lib/supabase-server';
import { logger } from '@pledgeoff/observability';

// Vercel Cron: daily at 3am UTC — removes old processed outbox rows and idempotency records.
// Protected by CRON_SECRET to prevent unauthorized calls.
export async function GET(req: Request): Promise<Response> {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const traceId = crypto.randomUUID();
  const supabase = createServiceRoleClient();

  const [outboxResult, eventsResult] = await Promise.all([
    supabase
      .from('outbox')
      .delete()
      .eq('processed', true)
      .lt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    supabase
      .from('processed_events')
      .delete()
      .lt('processed_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
  ]);

  const outboxDeleted = outboxResult.count ?? 0;
  const eventsDeleted = eventsResult.count ?? 0;
  const hasError = !!outboxResult.error || !!eventsResult.error;

  logger.info(
    {
      traceId,
      outboxDeleted,
      eventsDeleted,
      outboxError: outboxResult.error?.message ?? null,
      eventsError: eventsResult.error?.message ?? null,
    },
    'cron.cleanup.completed',
  );

  return Response.json({
    ok: !hasError,
    traceId,
    outboxDeleted,
    eventsDeleted,
    errors: hasError
      ? {
          outbox: outboxResult.error?.message ?? null,
          events: eventsResult.error?.message ?? null,
        }
      : null,
  });
}
