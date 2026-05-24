import { Result, ok, err } from 'neverthrow';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { DecisionOutcome } from '@pledgeoff/core';
import { DecisionOutcomeRepositoryError, type IDecisionOutcomeRepository } from '@pledgeoff/core';

type DecisionOutcomeRow = {
  id: string;
  idea_id: string;
  user_id: string;
  verdict_at_time: string;
  outcome_type: string;
  notes: string | null;
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
}
