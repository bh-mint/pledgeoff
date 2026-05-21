import { Result, ok, err } from 'neverthrow';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { LaunchKit } from '@pledgeoff/core';
import { LaunchKitRepositoryError, type ILaunchKitRepository } from '@pledgeoff/core';

type LaunchKitRow = {
  id: string;
  idea_id: string;
  user_id: string;
  headlines: LaunchKit['headlines'];
  email_sequence: LaunchKit['emailSequence'];
  pricing_recommendation: LaunchKit['pricingRecommendation'];
  created_at: string;
};

function rowToLaunchKit(row: LaunchKitRow): LaunchKit {
  return {
    id: row.id,
    ideaId: row.idea_id,
    userId: row.user_id,
    headlines: row.headlines,
    emailSequence: row.email_sequence,
    pricingRecommendation: row.pricing_recommendation,
    createdAt: row.created_at,
  };
}

export class SupabaseLaunchKitRepository implements ILaunchKitRepository {
  constructor(private readonly client: SupabaseClient) {}

  async save(kit: LaunchKit): Promise<Result<LaunchKit, LaunchKitRepositoryError>> {
    const { data, error } = await this.client
      .from('launch_kits')
      .insert({
        id: kit.id,
        idea_id: kit.ideaId,
        user_id: kit.userId,
        headlines: kit.headlines,
        email_sequence: kit.emailSequence,
        pricing_recommendation: kit.pricingRecommendation,
        created_at: kit.createdAt,
      })
      .select()
      .single<LaunchKitRow>();

    if (error) return err(new LaunchKitRepositoryError(error.message));
    return ok(rowToLaunchKit(data));
  }

  async findByIdeaId(ideaId: string): Promise<Result<LaunchKit | null, LaunchKitRepositoryError>> {
    const { data, error } = await this.client
      .from('launch_kits')
      .select()
      .eq('idea_id', ideaId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<LaunchKitRow>();

    if (error) return err(new LaunchKitRepositoryError(error.message));
    return ok(data ? rowToLaunchKit(data) : null);
  }
}
