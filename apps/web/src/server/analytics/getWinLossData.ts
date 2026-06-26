import { createSupabaseServiceClient } from '@/lib/supabase-server';

export type WinLossRow = {
  competitor: string;
  wins: number;
  losses: number;
};

export async function getWinLossData(userId: string): Promise<WinLossRow[]> {
  const supabase = createSupabaseServiceClient();

  const { data: outcomes } = await supabase
    .from('decision_outcomes')
    .select('idea_id, outcome_type, lost_to_competitor')
    .eq('user_id', userId)
    .in('outcome_type', ['built_worked', 'built_failed'])
    .returns<{ idea_id: string; outcome_type: string; lost_to_competitor: string | null }[]>();

  if (!outcomes || outcomes.length === 0) return [];

  const map = new Map<string, WinLossRow>();

  // Losses: built_failed with explicit competitor attribution
  for (const o of outcomes) {
    if (o.outcome_type === 'built_failed' && o.lost_to_competitor) {
      const name = o.lost_to_competitor;
      const row = map.get(name) ?? { competitor: name, wins: 0, losses: 0 };
      row.losses++;
      map.set(name, row);
    }
  }

  // Wins: built_worked → fetch competitor names from competitor_analyses
  const winningIdeaIds = outcomes.filter((o) => o.outcome_type === 'built_worked').map((o) => o.idea_id);

  if (winningIdeaIds.length > 0) {
    const { data: analyses } = await supabase
      .from('competitor_analyses')
      .select('competitors')
      .in('idea_id', winningIdeaIds)
      .returns<{ competitors: { name: string }[] }[]>();

    for (const analysis of analyses ?? []) {
      for (const comp of analysis.competitors ?? []) {
        const name = comp.name;
        const row = map.get(name) ?? { competitor: name, wins: 0, losses: 0 };
        row.wins++;
        map.set(name, row);
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => (b.wins + b.losses) - (a.wins + a.losses));
}
