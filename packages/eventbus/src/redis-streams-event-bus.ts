import { Redis } from '@upstash/redis';
import { Result, ok, err } from 'neverthrow';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { DomainEvent, EventBusError, IEventBus } from '@pledgeoff/core';
import { EventBusError as EventBusErrorClass } from '@pledgeoff/core';
import { createLogger } from '@pledgeoff/observability';

const log = createLogger({ adapter: 'redis-streams' });

const STREAM_KEY = 'pledgeoff:events';
const GROUP = 'pledgeoff-workers';
const CONSUMER = 'worker';
const MIN_IDLE_MS = 60_000; // reclaim messages unACKed for >60s

type Handler<TPayload> = (event: DomainEvent<TPayload>) => Promise<void>;

interface StreamMessage {
  id: string;
  message: { eventJson: string };
}

interface OutboxRow {
  event_id: string;
  event_type: string;
  payload: DomainEvent<unknown>;
  attempts: number;
}

export class RedisStreamsEventBus implements IEventBus {
  private readonly redis: Redis;
  private readonly handlers = new Map<string, Handler<unknown>[]>();
  private groupEnsured = false;

  constructor(
    private readonly supabase: SupabaseClient,
    redisUrl: string,
    redisToken: string,
  ) {
    this.redis = new Redis({ url: redisUrl, token: redisToken });
  }

  async publish<TPayload>(
    eventType: string,
    event: DomainEvent<TPayload>,
  ): Promise<Result<void, EventBusError>> {
    // Outbox first — source of truth for durability
    const { error } = await this.supabase.from('outbox').insert({
      event_id: event.eventId,
      event_type: eventType,
      payload: event,
      processed: false,
    });

    if (error) {
      return err(new EventBusErrorClass(`Failed to insert into outbox: ${error.message}`));
    }

    // Redis Stream — fast delivery (fire-and-forget; outbox is the durability fallback)
    try {
      await this.redis.xadd(STREAM_KEY, '*', { eventJson: JSON.stringify(event) });
    } catch (streamErr) {
      log.warn(
        { traceId: event.traceId, target: 'upstash', operation: 'xadd', outcome: 'error', errorMsg: streamErr instanceof Error ? streamErr.message : 'unknown' },
        'XADD failed — outbox poller will deliver',
      );
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

  // Unified entry point for cron — tries Redis Stream, falls back to outbox
  async processEvents(): Promise<{ processed: number; failed: number }> {
    try {
      return await this.processStream();
    } catch (streamErr) {
      log.warn(
        { traceId: 'system', target: 'upstash', operation: 'processStream', outcome: 'error', errorMsg: streamErr instanceof Error ? streamErr.message : 'unknown' },
        'Redis Stream processing failed — falling back to outbox',
      );
      return this.processOutbox();
    }
  }

  async processStream(batchSize = 50): Promise<{ processed: number; failed: number }> {
    await this.ensureGroup();

    let processed = 0;
    let failed = 0;

    // 1. Re-deliver timed-out PEL messages (claimed but not ACKed for >60s)
    // xautoclaim returns [nextId, StreamMessage[]] from Upstash REST
    const claimed = await this.redis.xautoclaim(
      STREAM_KEY, GROUP, CONSUMER, MIN_IDLE_MS, '0-0', { count: batchSize },
    ) as unknown as [string, StreamMessage[]];

    const claimedMsgs: StreamMessage[] = Array.isArray(claimed) && Array.isArray(claimed[1]) ? claimed[1] : [];
    for (const msg of claimedMsgs) {
      if (await this.dispatchMessage(msg)) processed++; else failed++;
    }

    // 2. Read new messages from the stream
    // xreadgroup returns [{name: string, messages: StreamMessage[]}] | null
    const streams = await this.redis.xreadgroup(
      GROUP, CONSUMER, STREAM_KEY, '>', { count: batchSize },
    ) as unknown as { name: string; messages: StreamMessage[] }[] | null;

    if (streams) {
      for (const stream of streams) {
        for (const msg of stream.messages ?? []) {
          if (await this.dispatchMessage(msg)) processed++; else failed++;
        }
      }
    }

    return { processed, failed };
  }

  // Fallback: direct outbox poll (same as PostgresEventBus)
  async processOutbox(limit = 50): Promise<{ processed: number; failed: number }> {
    const { data, error } = await this.supabase
      .from('outbox')
      .select('event_id, event_type, payload, attempts')
      .eq('processed', false)
      .order('created_at')
      .limit(limit);

    if (error || !data) return { processed: 0, failed: 0 };

    let processed = 0;
    let failed = 0;

    for (const row of data as OutboxRow[]) {
      try {
        await this.dispatchOne(row.payload);
        await this.supabase
          .from('outbox')
          .update({ processed: true, processed_at: new Date().toISOString() })
          .eq('event_id', row.event_id);
        processed++;
      } catch (e) {
        await this.supabase
          .from('outbox')
          .update({ attempts: row.attempts + 1, last_error: e instanceof Error ? e.message : 'unknown' })
          .eq('event_id', row.event_id);
        failed++;
      }
    }

    return { processed, failed };
  }

  private async dispatchMessage(msg: StreamMessage): Promise<boolean> {
    try {
      const event = JSON.parse(msg.message.eventJson) as DomainEvent<unknown>;
      await this.dispatchOne(event);
      await this.redis.xack(STREAM_KEY, GROUP, msg.id);
      await this.supabase
        .from('outbox')
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq('event_id', event.eventId);
      log.info(
        { traceId: event.traceId, target: 'upstash', operation: 'dispatch', outcome: 'success', eventType: event.eventType },
        'Stream event dispatched',
      );
      return true;
    } catch (e) {
      log.error(
        { traceId: 'system', target: 'upstash', operation: 'dispatch', outcome: 'error', streamId: msg.id, errorMsg: e instanceof Error ? e.message : 'unknown' },
        'Stream message dispatch failed',
      );
      return false;
    }
  }

  private async dispatchOne(event: DomainEvent<unknown>): Promise<void> {
    const subscribers = this.handlers.get(event.eventType) ?? [];
    await Promise.all(subscribers.map((h) => h(event)));
  }

  private async ensureGroup(): Promise<void> {
    if (this.groupEnsured) return;
    try {
      await this.redis.xgroup(STREAM_KEY, { type: 'CREATE', group: GROUP, id: '$', options: { MKSTREAM: true } });
    } catch {
      // BUSYGROUP error = group already exists, safe to ignore
    }
    this.groupEnsured = true;
  }
}
