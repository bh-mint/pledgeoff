import { Result, ok, err } from 'neverthrow';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Decision } from '@pledgeoff/core';
import { DecisionRepositoryError, type IDecisionRepository } from '@pledgeoff/core';

type DecisionRow = {
  id: string;
  idea_id: string;
  verdict: string;
  reasoning: string;
  confidence: number;
  signal_ids: string[];
  created_at: string;
};

function rowToDecision(row: DecisionRow): Decision {
  return {
    id: row.id,
    ideaId: row.idea_id,
    verdict: row.verdict as Decision['verdict'],
    reasoning: row.reasoning,
    confidence: Number(row.confidence),
    signalIds: row.signal_ids ?? [],
    createdAt: row.created_at,
  };
}

export class SupabaseDecisionRepository implements IDecisionRepository {
  constructor(private readonly client: SupabaseClient) {}

  async save(decision: Decision): Promise<Result<Decision, DecisionRepositoryError>> {
    const { data, error } = await this.client
      .from('decisions')
      .insert({
        id: decision.id,
        idea_id: decision.ideaId,
        verdict: decision.verdict,
        reasoning: decision.reasoning,
        confidence: decision.confidence,
        signal_ids: decision.signalIds,
        created_at: decision.createdAt,
      })
      .select()
      .single<DecisionRow>();

    if (error) return err(new DecisionRepositoryError(error.message));
    return ok(rowToDecision(data));
  }

  async findByIdeaId(ideaId: string): Promise<Result<Decision | null, DecisionRepositoryError>> {
    const { data, error } = await this.client
      .from('decisions')
      .select()
      .eq('idea_id', ideaId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<DecisionRow>();

    if (error) return err(new DecisionRepositoryError(error.message));
    return ok(data ? rowToDecision(data) : null);
  }
}
