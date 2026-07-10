// Vercel Cron: daily at 06:00 UTC — re-runs competitor analysis and market landscape
// for ideas not checked in the last 7 days and emits competitor.changed.v1 events on diffs.
// One idea = 2 LLM calls (in parallel, but still 15-45s together), so even a
// single idea can outlive a 60s cap — Fluid compute allows 300s on Hobby.
export const maxDuration = 300;

import { createSupabaseServiceClient } from '@/lib/supabase-server';
import { container } from '@/lib/container';
import { logger } from '@pledgeoff/observability';
import { requireCronAuth } from '@/lib/cron-auth';

const STALE_DAYS = 7;
// Wall-clock budget under maxDuration: stop starting new ideas when the time
// left may not fit one more (~60s worst case per idea). Ideas left unprocessed
// stay stale and are picked up by the next daily run.
const SOFT_BUDGET_MS = 230_000;

export async function GET(req: Request): Promise<Response> {
  const auth = requireCronAuth(req);
  if (!auth.ok) return Response.json({ error: auth.body }, { status: auth.status });

  const startedAt = Date.now();
  const traceId = crypto.randomUUID();
  const supabase = createSupabaseServiceClient();
  const staleCutoff = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000).toISOString();

  // Find ideas that have competitors but haven't been checked recently —
  // oldest first, so partial runs rotate fairly through the backlog
  const { data: staleIdeas, error } = await supabase
    .from('ideas')
    .select('id, user_id, text, context')
    .or(`last_competitor_check.is.null,last_competitor_check.lt.${staleCutoff}`)
    .order('last_competitor_check', { ascending: true, nullsFirst: true })
    .limit(20);

  if (error) {
    logger.error({ traceId, target: 'movement-check', outcome: 'error', errorCode: 'DB_QUERY_FAILED' }, error.message);
    return Response.json({ error: 'DB query failed' }, { status: 500 });
  }

  if (!staleIdeas || staleIdeas.length === 0) {
    logger.info({ traceId, target: 'movement-check', outcome: 'success', processed: 0 }, 'No stale ideas found');
    return Response.json({ processed: 0 });
  }

  let processed = 0;
  let skipped = 0;
  const changed = 0;
  const errors: string[] = [];

  for (const idea of staleIdeas) {
    if (Date.now() - startedAt > SOFT_BUDGET_MS) {
      skipped = staleIdeas.length - processed - errors.length;
      logger.info(
        { traceId, target: 'movement-check', outcome: 'success', processed, skipped, elapsedMs: Date.now() - startedAt },
        'Soft budget reached — remaining ideas deferred to next run',
      );
      break;
    }
    try {
      // Re-run competitors and market landscape in parallel (forceRerun=true
      // saves snapshots + diffs + emits events) — halves per-idea latency
      const [compResult, mktResult] = await Promise.all([
        container.analyzeCompetitorsUseCase.execute({
          ideaId: idea.id,
          ideaText: idea.text,
          userId: idea.user_id,
          traceId,
          founderContext: idea.context ?? undefined,
          forceRerun: true,
        }),
        container.generateMarketLandscapeUseCase.execute({
          ideaId: idea.id,
          userId: idea.user_id,
          ideaText: idea.text,
          traceId,
          founderContext: idea.context ?? undefined,
          forceRerun: true,
        }),
      ]);

      if (compResult.isOk() && mktResult.isOk()) {
        // Update last_competitor_check
        await supabase
          .from('ideas')
          .update({ last_competitor_check: new Date().toISOString() })
          .eq('id', idea.id);
        processed++;
      } else {
        const errMsg = compResult.isErr() ? compResult.error.message : mktResult.isErr() ? mktResult.error.message : 'unknown';
        errors.push(`idea:${idea.id} — ${errMsg}`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'unknown';
      errors.push(`idea:${idea.id} — ${msg}`);
      logger.error({ traceId, target: 'movement-check', ideaId: idea.id, outcome: 'error' }, msg);
    }
  }

  logger.info({ traceId, target: 'movement-check', outcome: 'success', processed, skipped, changed, errors: errors.length }, 'Movement check complete');

  if (errors.length > 0) {
    logger.error({ traceId, target: 'movement-check', errors }, 'Some ideas failed movement check');
  }

  return Response.json({ processed, skipped, changed, errors });
}
