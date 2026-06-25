import { Result, ok, err } from 'neverthrow';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Battlecard, BattlecardEntry } from '@pledgeoff/core';
import { BattlecardRepositoryError, type IBattlecardRepository } from '@pledgeoff/core';

type BattlecardRow = {
  id: string;
  idea_id: string;
  user_id: string;
  entries: BattlecardEntry[];
  created_at: string;
};

function rowToBattlecard(row: BattlecardRow): Battlecard {
  return {
    id: row.id,
    ideaId: row.idea_id,
    userId: row.user_id,
    entries: row.entries,
    createdAt: row.created_at,
  };
}

export class SupabaseBattlecardRepository implements IBattlecardRepository {
  constructor(private readonly client: SupabaseClient) {}

  async save(battlecard: Battlecard): Promise<Result<Battlecard, BattlecardRepositoryError>> {
    const { data, error } = await this.client
      .from('battlecards')
      .upsert({
        id: battlecard.id,
        idea_id: battlecard.ideaId,
        user_id: battlecard.userId,
        entries: battlecard.entries,
        created_at: battlecard.createdAt,
      }, { onConflict: 'idea_id' })
      .select()
      .single<BattlecardRow>();

    if (error) return err(new BattlecardRepositoryError(error.message));
    return ok(rowToBattlecard(data));
  }

  async findByIdeaId(ideaId: string): Promise<Result<Battlecard | null, BattlecardRepositoryError>> {
    const { data, error } = await this.client
      .from('battlecards')
      .select()
      .eq('idea_id', ideaId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<BattlecardRow>();

    if (error) return err(new BattlecardRepositoryError(error.message));
    return ok(data ? rowToBattlecard(data) : null);
  }
}
