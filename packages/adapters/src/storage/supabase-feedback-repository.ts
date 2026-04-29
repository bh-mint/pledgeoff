import { Result, ok, err } from 'neverthrow';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Feedback } from '@pledgeoff/core';
import { FeedbackRepositoryError, type IFeedbackRepository } from '@pledgeoff/core';

type FeedbackRow = {
  id: string;
  idea_id: string;
  decision_id: string;
  user_id: string;
  vote: string;
  created_at: string;
};

function rowToFeedback(row: FeedbackRow): Feedback {
  return {
    id: row.id,
    ideaId: row.idea_id,
    decisionId: row.decision_id,
    userId: row.user_id,
    vote: row.vote as Feedback['vote'],
    createdAt: row.created_at,
  };
}

export class SupabaseFeedbackRepository implements IFeedbackRepository {
  constructor(private readonly client: SupabaseClient) {}

  async save(feedback: Feedback): Promise<Result<Feedback, FeedbackRepositoryError>> {
    const { data, error } = await this.client
      .from('feedback')
      .insert({
        id: feedback.id,
        idea_id: feedback.ideaId,
        decision_id: feedback.decisionId,
        user_id: feedback.userId,
        vote: feedback.vote,
        created_at: feedback.createdAt,
      })
      .select()
      .single<FeedbackRow>();

    if (error) return err(new FeedbackRepositoryError(error.message));
    return ok(rowToFeedback(data));
  }

  async findByDecisionId(
    decisionId: string,
  ): Promise<Result<Feedback[], FeedbackRepositoryError>> {
    const { data, error } = await this.client
      .from('feedback')
      .select()
      .eq('decision_id', decisionId)
      .returns<FeedbackRow[]>();

    if (error) return err(new FeedbackRepositoryError(error.message));
    return ok((data ?? []).map(rowToFeedback));
  }
}
