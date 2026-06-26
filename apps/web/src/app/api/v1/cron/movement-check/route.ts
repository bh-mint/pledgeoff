// Vercel Cron: daily at 06:00 UTC — re-runs competitor analysis and market landscape
// for ideas not checked in the last 7 days and emits competitor.changed.v1 events on diffs.
export const maxDuration = 60;

import { createSupabaseServiceClient } from '@/lib/supabase-server';
import { container } from '@/lib/container';
import { logger } from '@pledgeoff/observability';
import { requireCronAuth } from '@/lib/cron-auth';

const STALE_DAYS = 7;

export async function GET(req: Request): Promise<Response> {
  const auth = requireCronAuth(req);
  if (!auth.ok) return Response.json({ error: auth.body }, { status: auth.status });

  const traceId = crypto.randomUUID();
  const supabase = createSupabaseServiceClient();
  const staleCutoff = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000).toISOString();

  // Find ideas that have competitors but haven't been checked recently
  const { data: staleIdeas, error } = await supabase
    .from('ideas')
    .select('id, user_id, text, context')
    .or(`last_competitor_check.is.null,last_competitor_check.lt.${staleCutoff}`)
    .limit(20); // process max 20 per run to stay within maxDuration

  if (error) {
    logger.error({ traceId, target: 'movement-check', outcome: 'error', errorCode: 'DB_QUERY_FAILED' }, error.message);
    return Response.json({ error: 'DB query failed' }, { status: 500 });
  }

  if (!staleIdeas || staleIdeas.length === 0) {
    logger.info({ traceId, target: 'movement-check', outcome: 'success', processed: 0 }, 'No stale ideas found');
    return Response.json({ processed: 0 });
  }

  let processed = 0;
  const changed = 0;
  const errors: string[] = [];

  for (const idea of staleIdeas) {
    try {
      // Re-run competitors with forceRerun=true (saves snapshot + diffs + emits event)
      const compResult = await container.analyzeCompetitorsUseCase.execute({
        ideaId: idea.id,
        ideaText: idea.text,
        userId: idea.user_id,
        traceId,
        founderContext: idea.context ?? undefined,
        forceRerun: true,
      });

      // Re-run market landscape with forceRerun=true
      const mktResult = await container.generateMarketLandscapeUseCase.execute({
        ideaId: idea.id,
        userId: idea.user_id,
        ideaText: idea.text,
        traceId,
        founderContext: idea.context ?? undefined,
        forceRerun: true,
      });

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

  logger.info({ traceId, target: 'movement-check', outcome: 'success', processed, changed, errors: errors.length }, 'Movement check complete');

  if (errors.length > 0) {
    logger.error({ traceId, target: 'movement-check', errors }, 'Some ideas failed movement check');
  }

  return Response.json({ processed, changed, errors });
}
