import { Result, ok, err } from 'neverthrow';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { DecisionOutcome, CalibrationExample } from '@pledgeoff/core';
import { DecisionOutcomeRepositoryError, type IDecisionOutcomeRepository } from '@pledgeoff/core';

type DecisionOutcomeRow = {
  id: string;
  idea_id: string;
  user_id: string;
  verdict_at_time: string;
  outcome_type: string;
  notes: string | null;
  lost_to_competitor: string | null;
  reported_at: string;
};

function rowToOutcome(row: DecisionOutcomeRow): DecisionOutcome {
  return {
    id: row.id,
    ideaId: row.idea_id,
    userId: row.user_id,
    verdictAtTime: row.verdict_at_time,
    outcomeType: row.outcome_type as DecisionOutcome['outcomeType'],
    notes: row.notes,
    lostToCompetitor: row.lost_to_competitor,
    reportedAt: row.reported_at,
  };
}

export class SupabaseDecisionOutcomeRepository implements IDecisionOutcomeRepository {
  constructor(private readonly client: SupabaseClient) {}

  async upsert(outcome: DecisionOutcome): Promise<Result<DecisionOutcome, DecisionOutcomeRepositoryError>> {
    const { data, error } = await this.client
      .from('decision_outcomes')
      .upsert(
        {
          id: outcome.id,
          idea_id: outcome.ideaId,
          user_id: outcome.userId,
          verdict_at_time: outcome.verdictAtTime,
          outcome_type: outcome.outcomeType,
          notes: outcome.notes,
          lost_to_competitor: outcome.lostToCompetitor ?? null,
          reported_at: outcome.reportedAt,
        },
        { onConflict: 'idea_id,user_id' },
      )
      .select()
      .single<DecisionOutcomeRow>();

    if (error) return err(new DecisionOutcomeRepositoryError(error.message));
    return ok(rowToOutcome(data));
  }

  async findByIdea(ideaId: string): Promise<Result<DecisionOutcome | null, DecisionOutcomeRepositoryError>> {
    const { data, error } = await this.client
      .from('decision_outcomes')
      .select()
      .eq('idea_id', ideaId)
      .maybeSingle<DecisionOutcomeRow>();

    if (error) return err(new DecisionOutcomeRepositoryError(error.message));
    return ok(data ? rowToOutcome(data) : null);
  }

  async findByUser(userId: string): Promise<Result<DecisionOutcome[], DecisionOutcomeRepositoryError>> {
    const { data, error } = await this.client
      .from('decision_outcomes')
      .select()
      .eq('user_id', userId)
      .order('reported_at', { ascending: false })
      .returns<DecisionOutcomeRow[]>();

    if (error) return err(new DecisionOutcomeRepositoryError(error.message));
    return ok((data ?? []).map(rowToOutcome));
  }

  async findAll(): Promise<Result<DecisionOutcome[], DecisionOutcomeRepositoryError>> {
    const { data, error } = await this.client
      .from('decision_outcomes')
      .select()
      .order('reported_at', { ascending: false })
      .returns<DecisionOutcomeRow[]>();

    if (error) return err(new DecisionOutcomeRepositoryError(error.message));
    return ok((data ?? []).map(rowToOutcome));
  }

  async findCalibrationExamples(limit: number): Promise<Result<CalibrationExample[], DecisionOutcomeRepositoryError>> {
    // Fetch more than limit to allow JS filtering: standard outcomes + built_failed with competitor
    const { data: allRows, error: outcomeErr } = await this.client
      .from('decision_outcomes')
      .select('idea_id, outcome_type, verdict_at_time, lost_to_competitor')
      .in('outcome_type', ['built_worked', 'not_built', 'built_failed'])
      .order('reported_at', { ascending: false })
      .limit(limit * 4)
      .returns<{ idea_id: string; outcome_type: string; verdict_at_time: string; lost_to_competitor: string | null }[]>();

    if (outcomeErr) return err(new DecisionOutcomeRepositoryError(outcomeErr.message));
    if (!allRows || allRows.length === 0) return ok([]);

    // Keep: standard calibration rows (correct verdict) OR built_failed with named competitor
    const validRows = allRows.filter(
      (r) =>
        ((r.outcome_type === 'built_worked' || r.outcome_type === 'not_built') &&
          (r.verdict_at_time === 'GO' || r.verdict_at_time === 'KILL')) ||
        (r.outcome_type === 'built_failed' && r.lost_to_competitor !== null),
    ).slice(0, limit);

    if (validRows.length === 0) return ok([]);

    const ideaIds = validRows.map((r) => r.idea_id);

    const [ideasResult, decisionsResult] = await Promise.all([
      this.client
        .from('ideas')
        .select('id, text')
        .in('id', ideaIds)
        .returns<{ id: string; text: string }[]>(),
      this.client
        .from('decisions')
        .select('idea_id, reasoning')
        .in('idea_id', ideaIds)
        .order('created_at', { ascending: false })
        .returns<{ idea_id: string; reasoning: string }[]>(),
    ]);

    if (ideasResult.error) return err(new DecisionOutcomeRepositoryError(ideasResult.error.message));
    if (decisionsResult.error) return err(new DecisionOutcomeRepositoryError(decisionsResult.error.message));

    const ideaMap = new Map((ideasResult.data ?? []).map((i) => [i.id, i.text]));
    const decisionMap = new Map<string, string>();
    for (const d of decisionsResult.data ?? []) {
      if (!decisionMap.has(d.idea_id)) decisionMap.set(d.idea_id, d.reasoning);
    }

    const examples: CalibrationExample[] = [];
    for (const row of validRows) {
      const ideaText = ideaMap.get(row.idea_id);
      const reasoning = decisionMap.get(row.idea_id);
      if (!ideaText || !reasoning) continue;
      examples.push({
        ideaText,
        verdict: row.verdict_at_time as 'GO' | 'KILL' | 'PIVOT',
        outcome: row.outcome_type as 'built_worked' | 'not_built' | 'built_failed',
        reasoning,
        ...(row.lost_to_competitor ? { lostToCompetitor: row.lost_to_competitor } : {}),
      });
    }

    return ok(examples);
  }
}
