import { unstable_cache } from 'next/cache';
import { createSupabaseServiceClient } from '@/lib/supabase-server';
import { logger } from '@pledgeoff/observability';
import { isAtLeastPlan, PLAN } from '@pledgeoff/core';
import { NICHE_LABELS, type Niche } from '@/lib/niche-classifier';
import type { GoldmineNiche } from '@/app/api/v1/goldmine/route';
import type { Plan } from '@pledgeoff/core';

// Runs the full-table cross-user query once and caches for 1 hour.
// All paid-plan users share the same cached result — avoids a full
// table scan on every dashboard render.
const fetchGoldmineNiches = unstable_cache(
  async (): Promise<GoldmineNiche[]> => {
    const supabase = createSupabaseServiceClient();

    const { data: rows, error } = await supabase
      .from('ideas')
      .select('niche, decisions(verdict, created_at)')
      .neq('niche', 'other')
      .limit(2000)
      .returns<{ niche: string; decisions: { verdict: string; created_at: string }[] }[]>();

    if (error) {
      logger.error({ traceId: 'goldmine', error: error.message, outcome: 'error' }, 'getGoldmineData: DB query failed');
      return [];
    }

    const now = Date.now();
    const dayMs = 86_400_000;
    const sevenDaysAgo = now - 7 * dayMs;

    const nicheMap = new Map<string, { total: number; go: number; pivot: number; dailyGo: number[] }>();

    for (const row of rows ?? []) {
      const key = row.niche;
      if (!nicheMap.has(key)) {
        nicheMap.set(key, { total: 0, go: 0, pivot: 0, dailyGo: [0, 0, 0, 0, 0, 0, 0] });
      }
      const entry = nicheMap.get(key)!;
      entry.total++;

      for (const d of row.decisions ?? []) {
        if (d.verdict === 'GO') {
          entry.go++;
          const ts = new Date(d.created_at).getTime();
          if (ts >= sevenDaysAgo) {
            const dayIndex = Math.min(6, Math.floor((now - ts) / dayMs));
            entry.dailyGo[6 - dayIndex]++;
          }
        } else if (d.verdict === 'PIVOT') {
          entry.pivot++;
        }
      }
    }

    const results: GoldmineNiche[] = [];
    for (const [niche, stats] of nicheMap.entries()) {
      results.push({
        niche: niche as Niche,
        label: NICHE_LABELS[niche as Niche] ?? niche,
        totalIdeas: stats.total,
        goCount: stats.go,
        pivotCount: stats.pivot,
        heatScore: Math.round((stats.go * 3 + stats.pivot) * Math.log(stats.total + 1) * 10) / 10,
        sparkline: stats.dailyGo,
      });
    }

    results.sort((a, b) => b.heatScore - a.heatScore);
    return results.slice(0, 8);
  },
  ['goldmine-niches'],
  { revalidate: 3600 },
);

export async function getGoldmineData(plan: Plan | string): Promise<{ data: GoldmineNiche[]; locked: boolean }> {
  if (!isAtLeastPlan(plan as Plan, PLAN.TEAM)) {
    return { data: [], locked: true };
  }

  try {
    const data = await fetchGoldmineNiches();
    return { data, locked: false };
  } catch (e) {
    logger.error({ traceId: 'goldmine', error: String(e), outcome: 'error' }, 'getGoldmineData: unexpected error');
    return { data: [], locked: false };
  }
}
