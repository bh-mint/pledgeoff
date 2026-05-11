import { Result, ok, err } from 'neverthrow';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { BuildAnalysis, TechComponent, TechGap } from '@pledgeoff/core';
import { BuildAnalysisRepositoryError, type IBuildAnalysisRepository } from '@pledgeoff/core';

type BuildAnalysisRow = {
  id: string;
  idea_id: string;
  user_id: string;
  stack: TechComponent[];
  gaps: TechGap[];
  signal_count: number;
  created_at: string;
};

function rowToAnalysis(row: BuildAnalysisRow): BuildAnalysis {
  return {
    id: row.id,
    ideaId: row.idea_id,
    userId: row.user_id,
    stack: row.stack,
    gaps: row.gaps,
    signalCount: row.signal_count,
    createdAt: row.created_at,
  };
}

export class SupabaseBuildAnalysisRepository implements IBuildAnalysisRepository {
  constructor(private readonly client: SupabaseClient) {}

  async save(analysis: BuildAnalysis): Promise<Result<BuildAnalysis, BuildAnalysisRepositoryError>> {
    const { data, error } = await this.client
      .from('build_analyses')
      .insert({
        id: analysis.id,
        idea_id: analysis.ideaId,
        user_id: analysis.userId,
        stack: analysis.stack,
        gaps: analysis.gaps,
        signal_count: analysis.signalCount,
        created_at: analysis.createdAt,
      })
      .select()
      .single<BuildAnalysisRow>();

    if (error) return err(new BuildAnalysisRepositoryError(error.message));
    return ok(rowToAnalysis(data));
  }

  async findByIdeaId(ideaId: string): Promise<Result<BuildAnalysis | null, BuildAnalysisRepositoryError>> {
    const { data, error } = await this.client
      .from('build_analyses')
      .select()
      .eq('idea_id', ideaId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<BuildAnalysisRow>();

    if (error) return err(new BuildAnalysisRepositoryError(error.message));
    return ok(data ? rowToAnalysis(data) : null);
  }
}
