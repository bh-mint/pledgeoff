import { createSupabaseServiceClient } from '@/lib/supabase-server';
import { diffCompetitors, type CompetitorAnalysis, type SnapshotDiff } from '@pledgeoff/core';
import { logger } from '@pledgeoff/observability';

export type MarketMovement = {
  ideaId: string;
  ideaTitle: string;
  checkedAt: string;
  changes: SnapshotDiff[];
};

const MAX_SNAPSHOT_ROWS = 400;
const MAX_MOVEMENTS = 5;

// Diffs the two most recent competitor snapshots per idea (saved on every
// competitors run — manual, re-check, or movement-check cron). Read-time
// computation: no extra tables, the diff engine is pure domain code.
export async function getMarketMovements(
  ideas: ReadonlyArray<{ id: string; text: string }>,
): Promise<MarketMovement[]> {
  if (ideas.length === 0) return [];
  const supabase = createSupabaseServiceClient();

  const { data, error } = await supabase
    .from('competitor_snapshots')
    .select('idea_id, data, created_at')
    .in('idea_id', ideas.map((i) => i.id))
    .order('created_at', { ascending: false })
    .limit(MAX_SNAPSHOT_ROWS);

  if (error) {
    logger.error(
      { traceId: 'getMarketMovements', error: error.message, outcome: 'error' as const },
      'getMarketMovements: snapshot query failed',
    );
    return [];
  }

  const byIdea = new Map<string, Array<{ data: CompetitorAnalysis; createdAt: string }>>();
  for (const row of data ?? []) {
    const list = byIdea.get(row.idea_id as string) ?? [];
    if (list.length < 2) {
      list.push({ data: row.data as CompetitorAnalysis, createdAt: row.created_at as string });
      byIdea.set(row.idea_id as string, list);
    }
  }

  const titleById = new Map(ideas.map((i) => [i.id, i.text.split('\n')[0] ?? i.text]));

  const movements: MarketMovement[] = [];
  for (const [ideaId, snaps] of byIdea) {
    if (snaps.length < 2) continue;
    try {
      // snaps[0] = newest, snaps[1] = previous
      const changes = diffCompetitors(snaps[1].data, snaps[0].data);
      if (changes.length === 0) continue;
      movements.push({
        ideaId,
        ideaTitle: titleById.get(ideaId) ?? 'Untitled idea',
        checkedAt: snaps[0].createdAt,
        changes,
      });
    } catch (err) {
      logger.error(
        { traceId: 'getMarketMovements', ideaId, error: String(err), outcome: 'error' as const },
        'getMarketMovements: diff failed for idea (malformed snapshot data)',
      );
    }
  }

  movements.sort((a, b) => b.checkedAt.localeCompare(a.checkedAt));
  return movements.slice(0, MAX_MOVEMENTS);
}
