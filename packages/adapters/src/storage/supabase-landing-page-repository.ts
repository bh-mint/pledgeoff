import { Result, ok, err } from 'neverthrow';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { LandingPage } from '@pledgeoff/core';
import { LandingPageRepositoryError, type ILandingPageRepository } from '@pledgeoff/core';

type LandingPageRow = {
  id: string;
  idea_id: string;
  user_id: string;
  headline: string;
  subheadline: string;
  features: string[];
  cta_text: string;
  waitlist_headline: string;
  created_at: string;
};

function rowToLandingPage(row: LandingPageRow): LandingPage {
  return {
    id: row.id,
    ideaId: row.idea_id,
    userId: row.user_id,
    headline: row.headline,
    subheadline: row.subheadline,
    features: row.features,
    ctaText: row.cta_text,
    waitlistHeadline: row.waitlist_headline,
    createdAt: row.created_at,
  };
}

export class SupabaseLandingPageRepository implements ILandingPageRepository {
  constructor(private readonly client: SupabaseClient) {}

  async save(page: LandingPage): Promise<Result<LandingPage, LandingPageRepositoryError>> {
    const { data, error } = await this.client
      .from('landing_pages')
      .insert({
        id: page.id,
        idea_id: page.ideaId,
        user_id: page.userId,
        headline: page.headline,
        subheadline: page.subheadline,
        features: page.features,
        cta_text: page.ctaText,
        waitlist_headline: page.waitlistHeadline,
        created_at: page.createdAt,
      })
      .select()
      .single<LandingPageRow>();

    if (error) return err(new LandingPageRepositoryError(error.message));
    return ok(rowToLandingPage(data));
  }

  async findByIdeaId(ideaId: string): Promise<Result<LandingPage | null, LandingPageRepositoryError>> {
    const { data, error } = await this.client
      .from('landing_pages')
      .select()
      .eq('idea_id', ideaId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<LandingPageRow>();

    if (error) return err(new LandingPageRepositoryError(error.message));
    return ok(data ? rowToLandingPage(data) : null);
  }
}
