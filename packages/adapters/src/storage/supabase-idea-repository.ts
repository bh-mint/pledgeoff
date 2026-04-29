import { Result, ok, err } from 'neverthrow';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Idea } from '@pledgeoff/core';
import { IdeaRepositoryError, type IIdeaRepository } from '@pledgeoff/core';

type IdeaRow = {
  id: string;
  user_id: string;
  text: string;
  created_at: string;
};

function rowToIdea(row: IdeaRow): Idea {
  return {
    id: row.id,
    userId: row.user_id,
    text: row.text,
    createdAt: row.created_at,
  };
}

export class SupabaseIdeaRepository implements IIdeaRepository {
  constructor(private readonly client: SupabaseClient) {}

  async save(idea: Idea): Promise<Result<Idea, IdeaRepositoryError>> {
    const { data, error } = await this.client
      .from('ideas')
      .insert({
        id: idea.id,
        user_id: idea.userId,
        text: idea.text,
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
}
