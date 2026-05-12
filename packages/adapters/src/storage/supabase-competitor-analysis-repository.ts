import { Result, ok, err } from 'neverthrow';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CompetitorAnalysis, Competitor, CompetitorGap } from '@pledgeoff/core';
import { CompetitorAnalysisRepositoryError, type ICompetitorAnalysisRepository } from '@pledgeoff/core';

type CompetitorAnalysisRow = {
  id: string;
  idea_id: string;
  user_id: string;
  competitors: Competitor[];
  gaps: CompetitorGap[];
  signal_count: number;
  created_at: string;
};

function rowToAnalysis(row: CompetitorAnalysisRow): CompetitorAnalysis {
  return {
    id: row.id,
    ideaId: row.idea_id,
    userId: row.user_id,
    competitors: row.competitors,
    gaps: row.gaps,
    signalCount: row.signal_count,
    createdAt: row.created_at,
  };
}

export class SupabaseCompetitorAnalysisRepository implements ICompetitorAnalysisRepository {
  constructor(private readonly client: SupabaseClient) {}

  async save(analysis: CompetitorAnalysis): Promise<Result<CompetitorAnalysis, CompetitorAnalysisRepositoryError>> {
    const { data, error } = await this.client
      .from('competitor_analyses')
      .insert({
        id: analysis.id,
        idea_id: analysis.ideaId,
        user_id: analysis.userId,
        competitors: analysis.competitors,
        gaps: analysis.gaps,
        signal_count: analysis.signalCount,
        created_at: analysis.createdAt,
      })
      .select()
      .single<CompetitorAnalysisRow>();

    if (error) return err(new CompetitorAnalysisRepositoryError(error.message));
    return ok(rowToAnalysis(data));
  }

  async findByIdeaId(ideaId: string): Promise<Result<CompetitorAnalysis | null, CompetitorAnalysisRepositoryError>> {
    const { data, error } = await this.client
      .from('competitor_analyses')
      .select()
      .eq('idea_id', ideaId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<CompetitorAnalysisRow>();

    if (error) return err(new CompetitorAnalysisRepositoryError(error.message));
    return ok(data ? rowToAnalysis(data) : null);
  }
}
