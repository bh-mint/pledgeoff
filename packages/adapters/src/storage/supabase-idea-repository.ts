import { Result, ok, err } from 'neverthrow';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Idea, IdeasPage } from '@pledgeoff/core';
import { IdeaRepositoryError, IDEAS_PAGE_MAX_LIMIT, ideaFromPersistence, type IIdeaRepository } from '@pledgeoff/core';

type IdeaRow = {
  id: string;
  user_id: string;
  team_id: string | null;
  text: string;
  niche: string;
  context: string | null;
  created_at: string;
};

function rowToIdea(row: IdeaRow): Idea {
  return ideaFromPersistence({
    id: row.id,
    userId: row.user_id,
    teamId: row.team_id ?? null,
    text: row.text,
    niche: row.niche ?? 'other',
    context: row.context ?? null,
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
        context: idea.context ?? null,
        created_at: idea.createdAt,
      })
      .select()
      .single<IdeaRow>();

    if (error) return err(new IdeaRepositoryError(error.message));
    return ok(rowToIdea(data));
  }

  async saveWithEvent(
    idea: Idea,
    event: { eventId: string; eventType: string; payload: unknown },
  ): Promise<Result<Idea, IdeaRepositoryError>> {
    const { error } = await this.client.rpc('create_idea_with_event', {
      p_idea_id:       idea.id,
      p_user_id:       idea.userId,
      p_team_id:       idea.teamId ?? null,
      p_text:          idea.text,
      p_niche:         idea.niche ?? 'other',
      p_created_at:    idea.createdAt,
      p_event_id:      event.eventId,
      p_event_type:    event.eventType,
      p_event_payload: event.payload,
      p_context:       idea.context ?? null,
    });
    if (error) return err(new IdeaRepositoryError(error.message));
    return ok(idea);
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

  async findByUserIdPaginated(userId: string, limit: number, cursor?: string): Promise<Result<IdeasPage, IdeaRepositoryError>> {
    const safeLimit = Math.min(Math.max(1, limit), IDEAS_PAGE_MAX_LIMIT);
    // Fetch one extra to determine hasMore
    let query = this.client
      .from('ideas')
      .select()
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(safeLimit + 1);

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data, error } = await query.returns<IdeaRow[]>();
    if (error) return err(new IdeaRepositoryError(error.message));

    const rows = data ?? [];
    const hasMore = rows.length > safeLimit;
    const items = rows.slice(0, safeLimit).map(rowToIdea);
    const nextCursor = hasMore ? (items[items.length - 1]?.createdAt ?? null) : null;

    return ok({ ideas: items, hasMore, nextCursor });
  }

  async delete(id: string, userId: string): Promise<Result<void, IdeaRepositoryError>> {
    const { error } = await this.client
      .from('ideas')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) return err(new IdeaRepositoryError(error.message));
    return ok(undefined);
  }

  async findByTeamId(teamId: string): Promise<Result<Idea[], IdeaRepositoryError>> {
    const { data, error } = await this.client
      .from('ideas')
      .select()
      .eq('team_id', teamId)
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
