import { Result, ok, err } from 'neverthrow';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { MarketLandscape, MarketSegment } from '@pledgeoff/core';
import { MarketLandscapeRepositoryError, type IMarketLandscapeRepository } from '@pledgeoff/core';

type MarketLandscapeRow = {
  id: string;
  idea_id: string;
  user_id: string;
  segments: MarketSegment[];
  trends: string[];
  uncovered_opportunities: string[];
  created_at: string;
};

function rowToLandscape(row: MarketLandscapeRow): MarketLandscape {
  return {
    id: row.id,
    ideaId: row.idea_id,
    userId: row.user_id,
    segments: row.segments,
    trends: row.trends,
    uncoveredOpportunities: row.uncovered_opportunities,
    createdAt: row.created_at,
  };
}

export class SupabaseMarketLandscapeRepository implements IMarketLandscapeRepository {
  constructor(private readonly client: SupabaseClient) {}

  async save(landscape: MarketLandscape): Promise<Result<MarketLandscape, MarketLandscapeRepositoryError>> {
    const { data, error } = await this.client
      .from('market_landscapes')
      .upsert(
        {
          id: landscape.id,
          idea_id: landscape.ideaId,
          user_id: landscape.userId,
          segments: landscape.segments,
          trends: landscape.trends,
          uncovered_opportunities: landscape.uncoveredOpportunities,
          created_at: landscape.createdAt,
        },
        { onConflict: 'idea_id' },
      )
      .select()
      .single<MarketLandscapeRow>();

    if (error) return err(new MarketLandscapeRepositoryError(error.message));
    return ok(rowToLandscape(data));
  }

  async findByIdeaId(ideaId: string): Promise<Result<MarketLandscape | null, MarketLandscapeRepositoryError>> {
    const { data, error } = await this.client
      .from('market_landscapes')
      .select()
      .eq('idea_id', ideaId)
      .maybeSingle<MarketLandscapeRow>();

    if (error) return err(new MarketLandscapeRepositoryError(error.message));
    return ok(data ? rowToLandscape(data) : null);
  }
}
