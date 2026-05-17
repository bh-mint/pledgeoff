import { createSupabaseServiceClient } from '@/lib/supabase-server';
import { logger } from '@pledgeoff/observability';

// Vercel Cron: daily at 3am UTC — removes old processed outbox rows and idempotency records.
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
  const supabase = createSupabaseServiceClient();

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

  if (hasError) {
    logger.error(
      {
        traceId,
        outboxError: outboxResult.error?.message ?? null,
        eventsError: eventsResult.error?.message ?? null,
        outcome: 'error' as const,
      },
      'cron.cleanup.failed',
    );
    return Response.json(
      {
        ok: false,
        traceId,
        errors: {
          outbox: outboxResult.error?.message ?? null,
          events: eventsResult.error?.message ?? null,
        },
      },
      { status: 500 },
    );
  }

  logger.info(
    { traceId, outboxDeleted, eventsDeleted },
    'cron.cleanup.completed',
  );

  return Response.json({ ok: true, traceId, outboxDeleted, eventsDeleted });
}
