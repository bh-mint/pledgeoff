import { Result, ok, err } from 'neverthrow';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { FeatureAnalysis, FeatureRow } from '@pledgeoff/core';
import { FeatureAnalysisRepositoryError, type IFeatureAnalysisRepository } from '@pledgeoff/core';

type FeatureAnalysisRow = {
  id: string;
  idea_id: string;
  user_id: string;
  features: FeatureRow[];
  competitor_names: string[];
  created_at: string;
};

function rowToAnalysis(row: FeatureAnalysisRow): FeatureAnalysis {
  return {
    id: row.id,
    ideaId: row.idea_id,
    userId: row.user_id,
    features: row.features,
    competitorNames: row.competitor_names,
    createdAt: row.created_at,
  };
}

export class SupabaseFeatureAnalysisRepository implements IFeatureAnalysisRepository {
  constructor(private readonly client: SupabaseClient) {}

  async save(analysis: FeatureAnalysis): Promise<Result<FeatureAnalysis, FeatureAnalysisRepositoryError>> {
    const { data, error } = await this.client
      .from('feature_analyses')
      .upsert({
        id: analysis.id,
        idea_id: analysis.ideaId,
        user_id: analysis.userId,
        features: analysis.features,
        competitor_names: analysis.competitorNames,
        created_at: analysis.createdAt,
      }, { onConflict: 'idea_id' })
      .select()
      .single<FeatureAnalysisRow>();

    if (error) return err(new FeatureAnalysisRepositoryError(error.message));
    return ok(rowToAnalysis(data));
  }

  async findByIdeaId(ideaId: string): Promise<Result<FeatureAnalysis | null, FeatureAnalysisRepositoryError>> {
    const { data, error } = await this.client
      .from('feature_analyses')
      .select()
      .eq('idea_id', ideaId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<FeatureAnalysisRow>();

    if (error) return err(new FeatureAnalysisRepositoryError(error.message));
    return ok(data ? rowToAnalysis(data) : null);
  }
}
