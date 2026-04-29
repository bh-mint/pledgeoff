import { Result, ok, err } from 'neverthrow';
import type { SupabaseClient } from '@supabase/supabase-js';
import { IdempotencyStoreError, type IIdempotencyStore } from '@pledgeoff/core';

export class SupabaseIdempotencyStore implements IIdempotencyStore {
  constructor(private readonly client: SupabaseClient) {}

  async hasBeenProcessed(eventId: string): Promise<Result<boolean, IdempotencyStoreError>> {
    const { data, error } = await this.client
      .from('processed_events')
      .select('event_id')
      .eq('event_id', eventId)
      .maybeSingle();

    if (error) return err(new IdempotencyStoreError(error.message));
    return ok(data !== null);
  }

  async markAsProcessed(eventId: string): Promise<Result<void, IdempotencyStoreError>> {
    const { error } = await this.client
      .from('processed_events')
      .insert({ event_id: eventId });

    // PK conflict means already processed — not an error from idempotency perspective
    if (error && error.code !== '23505') {
      return err(new IdempotencyStoreError(error.message));
    }
    return ok(undefined);
  }
}
