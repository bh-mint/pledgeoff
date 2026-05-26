import { Result, ok, err } from 'neverthrow';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Idea } from '@pledgeoff/core';
import { IdeaRepositoryError, ideaFromPersistence, type IIdeaRepository } from '@pledgeoff/core';

type IdeaRow = {
  id: string;
  user_id: string;
  team_id: string | null;
  text: string;
  niche: string;
  created_at: string;
};

function rowToIdea(row: IdeaRow): Idea {
  return ideaFromPersistence({
    id: row.id,
    userId: row.user_id,
    teamId: row.team_id ?? null,
    text: row.text,
    niche: row.niche ?? 'other',
    createdAt: row.created_at,
  });
}

export class SupabaseIdeaRepository implements IIdeaRepository {
  constructor(private readonly client: SupabaseClient) {}

  async save(idea: Idea): Promise<Result<Idea, IdeaRepositoryError>> {
    const { data, error } = await this.client
      .from('ideas')
      .insert({
        id: idea.id,
        user_id: idea.userId,
        team_id: idea.teamId ?? null,
        text: idea.text,
        niche: idea.niche ?? 'other',
        created_at: idea.createdAt,
      })
      .select()
      .single<IdeaRow>();

    if (error) return err(new IdeaRepositoryError(error.message));
    return ok(rowToIdea(data));
  }

  async findById(id: string): Promise<Result<Idea | null, IdeaRepositoryError>> {
    const { data, error } = await this.client
      .from('ideas')
      .select()
      .eq('id', id)
      .maybeSingle<IdeaRow>();

    if (error) return err(new IdeaRepositoryError(error.message));
    return ok(data ? rowToIdea(data) : null);
  }

  async findByUserId(userId: string): Promise<Result<Idea[], IdeaRepositoryError>> {
    const { data, error } = await this.client
      .from('ideas')
      .select()
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .returns<IdeaRow[]>();

    if (error) return err(new IdeaRepositoryError(error.message));
    return ok((data ?? []).map(rowToIdea));
  }

  async findByUserIds(userIds: string[]): Promise<Result<Idea[], IdeaRepositoryError>> {
    if (userIds.length === 0) return ok([]);
    const { data, error } = await this.client
      .from('ideas')
      .select()
      .in('user_id', userIds)
      .order('created_at', { ascending: false })
      .returns<IdeaRow[]>();

    if (error) return err(new IdeaRepositoryError(error.message));
    return ok((data ?? []).map(rowToIdea));
  }

  async countThisMonth(userId: string): Promise<Result<number, IdeaRepositoryError>> {
    const startOfMonth = new Date();
    startOfMonth.setUTCDate(1);
    startOfMonth.setUTCHours(0, 0, 0, 0);

    const { count, error } = await this.client
      .from('ideas')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', startOfMonth.toISOString());

    if (error) return err(new IdeaRepositoryError(error.message));
    return ok(count ?? 0);
  }
}
