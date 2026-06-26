import { Result, ok, err } from 'neverthrow';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { MarketLandscape } from '@pledgeoff/core';
import { SnapshotRepositoryError, type ILandscapeSnapshotRepository } from '@pledgeoff/core';

export class SupabaseLandscapeSnapshotRepository implements ILandscapeSnapshotRepository {
  constructor(private readonly client: SupabaseClient) {}

  async save(ideaId: string, data: MarketLandscape): Promise<Result<void, SnapshotRepositoryError>> {
    const { error } = await this.client
      .from('landscape_snapshots')
      .insert({ idea_id: ideaId, data });
    if (error) return err(new SnapshotRepositoryError(error.message));
    return ok(undefined);
  }

  async findLatestByIdeaId(ideaId: string): Promise<Result<MarketLandscape | null, SnapshotRepositoryError>> {
    const { data, error } = await this.client
      .from('landscape_snapshots')
      .select('data')
      .eq('idea_id', ideaId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<{ data: MarketLandscape }>();
    if (error) return err(new SnapshotRepositoryError(error.message));
    return ok(data?.data ?? null);
  }
}
