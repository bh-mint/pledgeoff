import { createSupabaseServiceClient } from '@/lib/supabase-server';
import type { Decision } from '@pledgeoff/core';

export type DashboardIdeaRow = {
  id: string;
  userId: string;
  text: string;
  niche: string | null;
  createdAt: string;
  decision: Decision | null;
  tools: {
    simulate: boolean;
    landing: boolean;
    customers: boolean;
    build: boolean;
    competitors: boolean;
    launch_kit: boolean;
  };
};

export type DashboardOutcomeRow = {
  ideaId: string;
  outcomeType: string;
};

// Replaces 1 + 5×N separate repo calls with two queries:
// one JOIN for ideas+decisions+tool presence, one for outcomes.
// userIds: pass [userId] for personal view, or all team member IDs for workspace view.
export async function getDashboardData(userIds: string[]): Promise<{
  ideas: DashboardIdeaRow[];
  outcomes: DashboardOutcomeRow[];
}> {
  const supabase = createSupabaseServiceClient();

  const [ideasRes, outcomesRes] = await Promise.all([
    supabase
      .from('ideas')
      .select(`
        id,
        user_id,
        text,
        niche,
        created_at,
        decisions ( id, idea_id, verdict, reasoning, confidence, dimensions, signal_ids, score, created_at, updated_at ),
        simulations ( id ),
        landing_pages ( id ),
        customer_analyses ( id ),
        build_analyses ( id ),
        competitor_analyses ( id ),
        launch_kits ( id )
      `)
      .in('user_id', userIds)
      .order('created_at', { ascending: false })
      .returns<RawIdeaRow[]>(),

    supabase
      .from('decision_outcomes')
      .select('idea_id, outcome_type')
      .in('user_id', userIds)
      .returns<{ idea_id: string; outcome_type: string }[]>(),
  ]);

  const ideas: DashboardIdeaRow[] = (ideasRes.data ?? []).map((row) => {
    const dec = row.decisions?.[0] ?? null;
    return {
      id: row.id,
      userId: row.user_id,
      text: row.text,
      niche: row.niche ?? null,
      createdAt: row.created_at,
      decision: dec
        ? ({
            id: dec.id,
            ideaId: dec.idea_id,
            verdict: dec.verdict as Decision['verdict'],
            reasoning: dec.reasoning,
            confidence: dec.confidence,
            dimensions: dec.dimensions ?? undefined,
            signalIds: dec.signal_ids ?? [],
            score: dec.score ?? undefined,
            createdAt: dec.created_at,
          } satisfies Decision)
        : null,
      tools: {
        simulate:    (row.simulations?.length         ?? 0) > 0,
        landing:     (row.landing_pages?.length       ?? 0) > 0,
        customers:   (row.customer_analyses?.length   ?? 0) > 0,
        build:       (row.build_analyses?.length      ?? 0) > 0,
        competitors: (row.competitor_analyses?.length ?? 0) > 0,
        launch_kit:  (row.launch_kits?.length         ?? 0) > 0,
      },
    };
  });

  const outcomes: DashboardOutcomeRow[] = (outcomesRes.data ?? []).map((o) => ({
    ideaId: o.idea_id,
    outcomeType: o.outcome_type,
  }));

  return { ideas, outcomes };
}

// Raw shape returned by Supabase nested select
type RawIdeaRow = {
  id: string;
  user_id: string;
  text: string;
  niche: string | null;
  created_at: string;
  decisions: Array<{
    id: string;
    idea_id: string;
    verdict: string;
    reasoning: string;
    confidence: number;
    dimensions: Decision['dimensions'] | null;
    signal_ids: string[] | null;
    score: number | null;
    created_at: string;
  }> | null;
  simulations: Array<{ id: string }> | null;
  landing_pages: Array<{ id: string }> | null;
  customer_analyses: Array<{ id: string }> | null;
  build_analyses: Array<{ id: string }> | null;
  competitor_analyses: Array<{ id: string }> | null;
  launch_kits: Array<{ id: string }> | null;
};
