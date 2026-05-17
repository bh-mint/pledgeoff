import { Result, ok, err } from 'neverthrow';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { IdeaReaction, ReactionType } from '@pledgeoff/core';
import { IdeaReactionRepositoryError, type IIdeaReactionRepository } from '@pledgeoff/core';

type ReactionRow = {
  id: string;
  idea_id: string;
  user_id: string;
  reaction: string;
  created_at: string;
};

function rowToReaction(row: ReactionRow): IdeaReaction {
  return {
    id: row.id,
    ideaId: row.idea_id,
    userId: row.user_id,
    reaction: row.reaction as ReactionType,
    createdAt: row.created_at,
  };
}

export class SupabaseIdeaReactionRepository implements IIdeaReactionRepository {
  constructor(private readonly client: SupabaseClient) {}

  async upsert(entry: IdeaReaction): Promise<Result<IdeaReaction, IdeaReactionRepositoryError>> {
    const { data, error } = await this.client
      .from('idea_reactions')
      .upsert(
        {
          idea_id: entry.ideaId,
          user_id: entry.userId,
          reaction: entry.reaction,
        },
        { onConflict: 'idea_id,user_id' }
      )
      .select()
      .single<ReactionRow>();

    if (error) return err(new IdeaReactionRepositoryError(error.message));
    return ok(rowToReaction(data));
  }

  async delete(ideaId: string, userId: string): Promise<Result<void, IdeaReactionRepositoryError>> {
    const { error } = await this.client
      .from('idea_reactions')
      .delete()
      .eq('idea_id', ideaId)
      .eq('user_id', userId);

    if (error) return err(new IdeaReactionRepositoryError(error.message));
    return ok(undefined);
  }

  async findByIdeaIds(ideaIds: string[]): Promise<Result<IdeaReaction[], IdeaReactionRepositoryError>> {
    if (ideaIds.length === 0) return ok([]);
    const { data, error } = await this.client
      .from('idea_reactions')
      .select()
      .in('idea_id', ideaIds)
      .returns<ReactionRow[]>();

    if (error) return err(new IdeaReactionRepositoryError(error.message));
    return ok((data ?? []).map(rowToReaction));
  }

  async findByIdeaIdAndUserId(ideaId: string, userId: string): Promise<Result<IdeaReaction | null, IdeaReactionRepositoryError>> {
    const { data, error } = await this.client
      .from('idea_reactions')
      .select()
      .eq('idea_id', ideaId)
      .eq('user_id', userId)
      .maybeSingle<ReactionRow>();

    if (error) return err(new IdeaReactionRepositoryError(error.message));
    return ok(data ? rowToReaction(data) : null);
  }

  async countByIdeaId(ideaId: string, reaction: ReactionType): Promise<Result<number, IdeaReactionRepositoryError>> {
    const { count, error } = await this.client
      .from('idea_reactions')
      .select('id', { count: 'exact', head: true })
      .eq('idea_id', ideaId)
      .eq('reaction', reaction);

    if (error) return err(new IdeaReactionRepositoryError(error.message));
    return ok(count ?? 0);
  }
}
