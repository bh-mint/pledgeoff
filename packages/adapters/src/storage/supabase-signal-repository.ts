import { Result, ok, err } from 'neverthrow';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Signal } from '@pledgeoff/core';
import { SignalRepositoryError, type ISignalRepository } from '@pledgeoff/core';

type SignalRow = {
  id: string;
  idea_id: string;
  source: string;
  url: string;
  title: string;
  summary: string;
  sentiment: string;
  fetched_at: string;
};

function rowToSignal(row: SignalRow): Signal {
  return {
    id: row.id,
    ideaId: row.idea_id,
    source: row.source as Signal['source'],
    url: row.url,
    title: row.title,
    summary: row.summary,
    sentiment: row.sentiment as Signal['sentiment'],
    fetchedAt: row.fetched_at,
  };
}

export class SupabaseSignalRepository implements ISignalRepository {
  constructor(private readonly client: SupabaseClient) {}

  async upsertMany(signals: Signal[]): Promise<Result<Signal[], SignalRepositoryError>> {
    if (signals.length === 0) return ok([]);

    const rows = signals.map((s) => ({
      id: s.id,
      idea_id: s.ideaId,
      source: s.source,
      url: s.url,
      title: s.title,
      summary: s.summary,
      sentiment: s.sentiment,
      fetched_at: s.fetchedAt,
    }));

    const { data, error } = await this.client
      .from('signals')
      .upsert(rows, { onConflict: 'source,url', ignoreDuplicates: false })
      .select()
      .returns<SignalRow[]>();

    if (error) return err(new SignalRepositoryError(error.message));
    return ok((data ?? []).map(rowToSignal));
  }

  async findByIdeaId(ideaId: string): Promise<Result<Signal[], SignalRepositoryError>> {
    const { data, error } = await this.client
      .from('signals')
      .select()
      .eq('idea_id', ideaId)
      .returns<SignalRow[]>();

    if (error) return err(new SignalRepositoryError(error.message));
    return ok((data ?? []).map(rowToSignal));
  }
}
