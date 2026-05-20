import { createSupabaseServiceClient } from '@/lib/supabase-server';
import { logger } from '@pledgeoff/observability';
import { NICHE_LABELS, type Niche } from '@/lib/niche-classifier';
import type { GoldmineNiche } from '@/app/api/v1/goldmine/route';

export async function getGoldmineData(plan: string): Promise<{ data: GoldmineNiche[]; locked: boolean }> {
  if (plan === 'free' || plan === 'pro') {
    return { data: [], locked: true };
  }

  try {
    const supabase = createSupabaseServiceClient();

    const { data: rows, error } = await supabase
      .from('ideas')
      .select('niche, decisions(verdict, created_at)')
      .neq('niche', 'other')
      .returns<{ niche: string; decisions: { verdict: string; created_at: string }[] }[]>();

    if (error) {
      logger.error({ traceId: 'goldmine', error: error.message, outcome: 'error' }, 'getGoldmineData: DB query failed');
      return { data: [], locked: false };
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
    return { data: results.slice(0, 8), locked: false };
  } catch (e) {
    logger.error({ traceId: 'goldmine', error: String(e), outcome: 'error' }, 'getGoldmineData: unexpected error');
    return { data: [], locked: false };
  }
}
