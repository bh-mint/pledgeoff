import { createSupabaseServiceClient } from '@/lib/supabase-server';
import { resolveUserId } from '@/lib/api-auth';
import { getUserPlan } from '@/server/billing/getUserPlan';
import { logger } from '@pledgeoff/observability';
import { NICHE_LABELS, type Niche } from '@/lib/niche-classifier';

export const revalidate = 300; // cache 5 minutes

export type GoldmineNiche = {
  niche: Niche;
  label: string;
  totalIdeas: number;
  goCount: number;
  pivotCount: number;
  heatScore: number;
  sparkline: number[]; // 7 values, index 0 = 6 days ago, index 6 = today
};

function unauthorizedResponse(traceId: string) {
  return Response.json(
    { error: { code: 'UNAUTHENTICATED', message: 'Valid authentication required' } },
    { status: 401, headers: { 'X-Trace-Id': traceId } },
  );
}

export async function GET(req: Request) {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();

  const userId = await resolveUserId(req.headers.get('authorization'));
  if (!userId) return unauthorizedResponse(traceId);

  const plan = await getUserPlan(userId);
  if (plan === 'free' || plan === 'founder') {
    return Response.json({ data: [], locked: true }, { status: 200, headers: { 'X-Trace-Id': traceId } });
  }

  try {
    const supabase = createSupabaseServiceClient();

    // Fetch all ideas with their decisions — aggregated cross-user
    const { data: rows, error } = await supabase
      .from('ideas')
      .select('niche, decisions(verdict, created_at)')
      .neq('niche', 'other')
      .returns<{ niche: string; decisions: { verdict: string; created_at: string }[] }[]>();

    if (error) {
      logger.error({ traceId, error: error.message, outcome: 'error' }, 'goldmine: DB query failed');
      return Response.json({ error: { code: 'INTERNAL' } }, { status: 500, headers: { 'X-Trace-Id': traceId } });
    }

    const now = Date.now();
    const dayMs = 86_400_000;
    const sevenDaysAgo = now - 7 * dayMs;

    // Aggregate per niche
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
            // dayIndex 0 = today, 6 = 6 days ago → reverse for sparkline (oldest first)
            entry.dailyGo[6 - dayIndex]++;
          }
        } else if (d.verdict === 'PIVOT') {
          entry.pivot++;
        }
      }
    }

    const results: GoldmineNiche[] = [];

    for (const [niche, stats] of nicheMap.entries()) {
      const heatScore =
        (stats.go * 3 + stats.pivot) * Math.log(stats.total + 1);

      results.push({
        niche: niche as Niche,
        label: NICHE_LABELS[niche as Niche] ?? niche,
        totalIdeas: stats.total,
        goCount: stats.go,
        pivotCount: stats.pivot,
        heatScore: Math.round(heatScore * 10) / 10,
        sparkline: stats.dailyGo,
      });
    }

    results.sort((a, b) => b.heatScore - a.heatScore);

    return Response.json(
      { data: results.slice(0, 8), locked: false },
      { status: 200, headers: { 'X-Trace-Id': traceId } },
    );
  } catch (e) {
    logger.error({ traceId, error: String(e), outcome: 'error' }, 'goldmine: unexpected error');
    return Response.json({ error: { code: 'INTERNAL' } }, { status: 500, headers: { 'X-Trace-Id': traceId } });
  }
}
