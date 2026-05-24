import { Result, ok, err } from 'neverthrow';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { DecisionQueueEntry } from '@pledgeoff/core';
import { DecisionQueueRepositoryError, type IDecisionQueueRepository } from '@pledgeoff/core';

type DecisionQueueRow = {
  id: string;
  user_id: string;
  idea_id: string;
  priority_score: number;
  last_signal_change: string | null;
  change_summary: string | null;
  created_at: string;
  updated_at: string;
};

function rowToEntry(row: DecisionQueueRow): DecisionQueueEntry {
  return {
    id: row.id,
    userId: row.user_id,
    ideaId: row.idea_id,
    priorityScore: row.priority_score,
    lastSignalChange: row.last_signal_change,
    changeSummary: row.change_summary,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SupabaseDecisionQueueRepository implements IDecisionQueueRepository {
  constructor(private readonly client: SupabaseClient) {}

  async upsert(entry: DecisionQueueEntry): Promise<Result<DecisionQueueEntry, DecisionQueueRepositoryError>> {
    const { data, error } = await this.client
      .from('decision_queue')
      .upsert(
        {
          id: entry.id,
          user_id: entry.userId,
          idea_id: entry.ideaId,
          priority_score: entry.priorityScore,
          last_signal_change: entry.lastSignalChange,
          change_summary: entry.changeSummary,
          created_at: entry.createdAt,
          updated_at: entry.updatedAt,
        },
        { onConflict: 'user_id,idea_id' },
      )
      .select()
      .single<DecisionQueueRow>();

    if (error) return err(new DecisionQueueRepositoryError(error.message));
    return ok(rowToEntry(data));
  }

  async findByUserId(userId: string): Promise<Result<DecisionQueueEntry[], DecisionQueueRepositoryError>> {
    const { data, error } = await this.client
      .from('decision_queue')
      .select()
      .eq('user_id', userId)
      .order('priority_score', { ascending: false })
      .returns<DecisionQueueRow[]>();

    if (error) return err(new DecisionQueueRepositoryError(error.message));
    return ok((data ?? []).map(rowToEntry));
  }

  async findByIdeaId(ideaId: string): Promise<Result<DecisionQueueEntry | null, DecisionQueueRepositoryError>> {
    const { data, error } = await this.client
      .from('decision_queue')
      .select()
      .eq('idea_id', ideaId)
      .maybeSingle<DecisionQueueRow>();

    if (error) return err(new DecisionQueueRepositoryError(error.message));
    return ok(data ? rowToEntry(data) : null);
  }
}
