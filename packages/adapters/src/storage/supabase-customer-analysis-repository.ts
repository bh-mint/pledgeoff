import { Result, ok, err } from 'neverthrow';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CustomerAnalysis, CustomerSegment, PainPoint, SentimentBreakdown, CustomerQuote } from '@pledgeoff/core';
import { CustomerAnalysisRepositoryError, type ICustomerAnalysisRepository } from '@pledgeoff/core';

type CustomerAnalysisRow = {
  id: string;
  idea_id: string;
  user_id: string;
  segments: CustomerSegment[];
  pain_points: PainPoint[];
  sentiment: SentimentBreakdown;
  quotes: CustomerQuote[];
  created_at: string;
};

function rowToAnalysis(row: CustomerAnalysisRow): CustomerAnalysis {
  return {
    id: row.id,
    ideaId: row.idea_id,
    userId: row.user_id,
    segments: row.segments,
    painPoints: row.pain_points,
    sentiment: row.sentiment,
    quotes: row.quotes,
    createdAt: row.created_at,
  };
}

export class SupabaseCustomerAnalysisRepository implements ICustomerAnalysisRepository {
  constructor(private readonly client: SupabaseClient) {}

  async save(analysis: CustomerAnalysis): Promise<Result<CustomerAnalysis, CustomerAnalysisRepositoryError>> {
    const { data, error } = await this.client
      .from('customer_analyses')
      .insert({
        id: analysis.id,
        idea_id: analysis.ideaId,
        user_id: analysis.userId,
        segments: analysis.segments,
        pain_points: analysis.painPoints,
        sentiment: analysis.sentiment,
        quotes: analysis.quotes,
        created_at: analysis.createdAt,
      })
      .select()
      .single<CustomerAnalysisRow>();

    if (error) return err(new CustomerAnalysisRepositoryError(error.message));
    return ok(rowToAnalysis(data));
  }

  async findByIdeaId(ideaId: string): Promise<Result<CustomerAnalysis | null, CustomerAnalysisRepositoryError>> {
    const { data, error } = await this.client
      .from('customer_analyses')
      .select()
      .eq('idea_id', ideaId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<CustomerAnalysisRow>();

    if (error) return err(new CustomerAnalysisRepositoryError(error.message));
    return ok(data ? rowToAnalysis(data) : null);
  }
}
