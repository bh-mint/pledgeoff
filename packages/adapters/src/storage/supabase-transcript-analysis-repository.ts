import { Result, ok, err } from 'neverthrow';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { TranscriptAnalysis, TranscriptQuote } from '@pledgeoff/core';
import { TranscriptAnalysisRepositoryError, type ITranscriptAnalysisRepository } from '@pledgeoff/core';

type TranscriptAnalysisRow = {
  id: string;
  idea_id: string;
  user_id: string;
  confirmed_hypotheses: string[];
  rejected_hypotheses: string[];
  new_insights: string[];
  quotes: TranscriptQuote[];
  signal_strength: 'strong' | 'moderate' | 'weak';
  created_at: string;
};

function rowToAnalysis(row: TranscriptAnalysisRow): TranscriptAnalysis {
  return {
    id: row.id,
    ideaId: row.idea_id,
    userId: row.user_id,
    confirmedHypotheses: row.confirmed_hypotheses,
    rejectedHypotheses: row.rejected_hypotheses,
    newInsights: row.new_insights,
    quotes: row.quotes,
    signalStrength: row.signal_strength,
    createdAt: row.created_at,
  };
}

export class SupabaseTranscriptAnalysisRepository implements ITranscriptAnalysisRepository {
  constructor(private readonly client: SupabaseClient) {}

  async save(analysis: TranscriptAnalysis): Promise<Result<TranscriptAnalysis, TranscriptAnalysisRepositoryError>> {
    const { data, error } = await this.client
      .from('transcript_analyses')
      .upsert(
        {
          id: analysis.id,
          idea_id: analysis.ideaId,
          user_id: analysis.userId,
          confirmed_hypotheses: analysis.confirmedHypotheses,
          rejected_hypotheses: analysis.rejectedHypotheses,
          new_insights: analysis.newInsights,
          quotes: analysis.quotes,
          signal_strength: analysis.signalStrength,
          created_at: analysis.createdAt,
        },
        { onConflict: 'idea_id' },
      )
      .select()
      .single<TranscriptAnalysisRow>();

    if (error) return err(new TranscriptAnalysisRepositoryError(error.message));
    return ok(rowToAnalysis(data));
  }

  async findByIdeaId(ideaId: string): Promise<Result<TranscriptAnalysis | null, TranscriptAnalysisRepositoryError>> {
    const { data, error } = await this.client
      .from('transcript_analyses')
      .select()
      .eq('idea_id', ideaId)
      .maybeSingle<TranscriptAnalysisRow>();

    if (error) return err(new TranscriptAnalysisRepositoryError(error.message));
    return ok(data ? rowToAnalysis(data) : null);
  }
}
