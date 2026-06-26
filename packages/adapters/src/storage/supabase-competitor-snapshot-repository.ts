import { Result, ok, err } from 'neverthrow';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CompetitorAnalysis } from '@pledgeoff/core';
import { SnapshotRepositoryError, type ICompetitorSnapshotRepository } from '@pledgeoff/core';

export class SupabaseCompetitorSnapshotRepository implements ICompetitorSnapshotRepository {
  constructor(private readonly client: SupabaseClient) {}

  async save(ideaId: string, data: CompetitorAnalysis): Promise<Result<void, SnapshotRepositoryError>> {
    const { error } = await this.client
      .from('competitor_snapshots')
      .insert({ idea_id: ideaId, data });
    if (error) return err(new SnapshotRepositoryError(error.message));
    return ok(undefined);
  }

  async findLatestByIdeaId(ideaId: string): Promise<Result<CompetitorAnalysis | null, SnapshotRepositoryError>> {
    const { data, error } = await this.client
      .from('competitor_snapshots')
      .select('data')
      .eq('idea_id', ideaId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<{ data: CompetitorAnalysis }>();
    if (error) return err(new SnapshotRepositoryError(error.message));
    return ok(data?.data ?? null);
  }
}
