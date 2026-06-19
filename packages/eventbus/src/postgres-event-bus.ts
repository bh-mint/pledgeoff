import { Result, ok, err } from 'neverthrow';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { DomainEvent, EventBusError, IEventBus } from '@pledgeoff/core';
import { EventBusError as EventBusErrorClass } from '@pledgeoff/core';

type Handler<TPayload> = (event: DomainEvent<TPayload>) => Promise<void>;

interface OutboxRow {
  event_id: string;
  event_type: string;
  payload: DomainEvent<unknown>;
  attempts: number;
}

export class PostgresEventBus implements IEventBus {
  private readonly handlers = new Map<string, Handler<unknown>[]>();

  constructor(private readonly supabase: SupabaseClient) {}

  async publish<TPayload>(
    eventType: string,
    event: DomainEvent<TPayload>,
  ): Promise<Result<void, EventBusError>> {
    const { error } = await this.supabase.from('outbox').insert({
      event_id: event.eventId,
      event_type: eventType,
      payload: event,
      processed: false,
    });

    if (error) {
      return err(new EventBusErrorClass(`Failed to insert into outbox: ${error.message}`));
    }

    return ok(undefined);
  }

  subscribe<TPayload>(
    eventType: string,
    handler: (event: DomainEvent<TPayload>) => Promise<void>,
  ): void {
    const existing = this.handlers.get(eventType) ?? [];
    this.handlers.set(eventType, [...existing, handler as Handler<unknown>]);
  }

  // Unified entry point for cron
  async processEvents(limit = 50): Promise<{ processed: number; failed: number; blocked: number }> {
    return this.processOutbox(limit);
  }

  async processOutbox(limit = 50): Promise<{ processed: number; failed: number; blocked: number }> {
    const { data, error } = await this.supabase
      .from('outbox')
      .select('event_id, event_type, payload, attempts')
      .eq('processed', false)
      .lte('attempts', 3)
      .order('created_at')
      .limit(limit);

    if (error || !data) return { processed: 0, failed: 0, blocked: 0 };

    let processed = 0;
    let failed = 0;

    for (const row of data as OutboxRow[]) {
      // Atomically claim the event before dispatching — prevents concurrent workers
      // (cron + after()) from processing the same event simultaneously
      const { data: claimed } = await this.supabase
        .from('outbox')
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq('event_id', row.event_id)
        .eq('processed', false)
        .select('event_id');

      if (!claimed?.length) continue;

      try {
        await this.dispatchOne(row.payload);
        processed++;
      } catch (dispatchError) {
        const message = dispatchError instanceof Error ? dispatchError.message : 'unknown';
        // Restore to unprocessed so it can be retried (up to max attempts)
        await this.supabase
          .from('outbox')
          .update({ processed: false, attempts: row.attempts + 1, last_error: message })
          .eq('event_id', row.event_id);
        failed++;
      }
    }

    // Count events permanently blocked (exhausted all 3 retry attempts)
    const { count: blockedCount } = await this.supabase
      .from('outbox')
      .select('*', { count: 'exact', head: true })
      .eq('processed', false)
      .gt('attempts', 3);

    const blocked = blockedCount ?? 0;

    return { processed, failed, blocked };
  }

  private async dispatchOne(event: DomainEvent<unknown>): Promise<void> {
    const subscribers = this.handlers.get(event.eventType) ?? [];
    await Promise.all(subscribers.map((h) => h(event)));
  }
}
