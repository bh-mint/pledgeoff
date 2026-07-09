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

interface OutboxRow {
  event_id: string;
  event_type: string;
  payload: DomainEvent<unknown>;
  attempts: number;
}

// A stream entry normalized from whichever shape Upstash returns. event is
// null when the payload cannot be recovered (poisoned message).
interface StreamEntry {
  id: string;
  event: DomainEvent<unknown> | null;
}

function coerceEvent(value: unknown): DomainEvent<unknown> | null {
  try {
    const parsed = typeof value === 'string' ? (JSON.parse(value) as unknown) : value;
    if (parsed && typeof parsed === 'object' && 'eventType' in parsed && 'eventId' in parsed) {
      return parsed as DomainEvent<unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

// XAUTOCLAIM/XREADGROUP have no deserializer in @upstash/redis, so entries
// arrive as raw RESP tuples `[id, [field, value, ...]]` — and parseRecursive
// JSON-parses string leaves, so the eventJson value may already be an object.
// The `{ id, message }` object shape is kept for forward compatibility.
function normalizeEntries(raw: unknown): StreamEntry[] {
  if (!Array.isArray(raw)) return [];
  const entries: StreamEntry[] = [];
  for (const item of raw) {
    if (Array.isArray(item) && item.length >= 2 && typeof item[0] === 'string') {
      const fields: unknown = item[1];
      let eventJson: unknown;
      if (Array.isArray(fields)) {
        for (let i = 0; i + 1 < fields.length; i += 2) {
          if (fields[i] === 'eventJson') {
            eventJson = fields[i + 1];
            break;
          }
        }
      } else if (fields && typeof fields === 'object') {
        eventJson = (fields as Record<string, unknown>).eventJson;
      }
      entries.push({ id: item[0], event: coerceEvent(eventJson) });
    } else if (item && typeof item === 'object' && 'id' in item) {
      const msg = item as { id: unknown; message?: Record<string, unknown> };
      entries.push({ id: String(msg.id), event: coerceEvent(msg.message?.eventJson) });
    }
  }
  return entries;
}

// XREADGROUP wraps entries per stream: `[[streamKey, entries], ...]` raw, or
// `[{ name, messages }]` object-shaped.
function normalizeStreams(raw: unknown): StreamEntry[] {
  if (!Array.isArray(raw)) return [];
  const entries: StreamEntry[] = [];
  for (const stream of raw) {
    if (Array.isArray(stream) && stream.length >= 2) {
      entries.push(...normalizeEntries(stream[1]));
    } else if (stream && typeof stream === 'object' && 'messages' in stream) {
      entries.push(...normalizeEntries((stream as { messages: unknown }).messages));
    }
  }
  return entries;
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

  // Unified entry point for cron: Redis Stream for fast-path delivery, then an
  // outbox sweep that delivers anything the stream lost, poisoned, or never
  // received. Consumers are idempotent (processed_events), so the occasional
  // double delivery is safe.
  //
  // Dispatching runs consumer handlers (emails, Slack, DB writes), so a large
  // backlog cannot fit one serverless invocation — the wall-clock budget stops
  // processing early and the next run continues; progress is durable per event.
  async processEvents(budgetMs = 22_000): Promise<{ processed: number; failed: number; blocked: number }> {
    const deadline = Date.now() + budgetMs;
    let stream = { processed: 0, failed: 0 };
    try {
      stream = await this.processStream(50, deadline);
    } catch (streamErr) {
      log.warn(
        { traceId: 'system', target: 'upstash', operation: 'processStream', outcome: 'error', errorMsg: streamErr instanceof Error ? streamErr.message : 'unknown' },
        'Redis Stream processing failed — outbox sweep will deliver',
      );
    }

    const outbox = await this.processOutbox(50, deadline);
    return {
      processed: stream.processed + outbox.processed,
      failed: stream.failed + outbox.failed,
      blocked: outbox.blocked,
    };
  }

  async processStream(batchSize = 50, deadline = Number.MAX_SAFE_INTEGER): Promise<{ processed: number; failed: number }> {
    await this.ensureGroup();

    let processed = 0;
    let failed = 0;

    // 1. Re-deliver timed-out PEL messages (claimed but not ACKed for >60s)
    const claimed = (await this.redis.xautoclaim(
      STREAM_KEY, GROUP, CONSUMER, MIN_IDLE_MS, '0-0', { count: batchSize },
    )) as unknown;
    const claimedEntries = Array.isArray(claimed) ? normalizeEntries(claimed[1]) : [];
    for (const entry of claimedEntries) {
      if (Date.now() > deadline) return { processed, failed };
      if (await this.dispatchEntry(entry)) processed++; else failed++;
    }

    if (Date.now() > deadline) return { processed, failed };

    // 2. Read new messages from the stream
    const streams = (await this.redis.xreadgroup(
      GROUP, CONSUMER, STREAM_KEY, '>', { count: batchSize },
    )) as unknown;
    for (const entry of normalizeStreams(streams)) {
      if (Date.now() > deadline) return { processed, failed };
      if (await this.dispatchEntry(entry)) processed++; else failed++;
    }

    return { processed, failed };
  }

  // Fallback: direct outbox poll (same as PostgresEventBus)
  async processOutbox(limit = 50, deadline = Number.MAX_SAFE_INTEGER): Promise<{ processed: number; failed: number; blocked: number }> {
    const { data, error } = await this.supabase
      .from('outbox')
      .select('event_id, event_type, payload, attempts')
      .eq('processed', false)
      .order('created_at')
      .limit(limit);

    if (error || !data) return { processed: 0, failed: 0, blocked: 0 };

    let processed = 0;
    let failed = 0;

    for (const row of data as OutboxRow[]) {
      if (Date.now() > deadline) break;
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

    return { processed, failed, blocked: 0 };
  }

  private async dispatchEntry(entry: StreamEntry): Promise<boolean> {
    // Poisoned message: the payload can never be recovered from the stream, so
    // ACK it to stop the infinite reclaim loop. The outbox row is untouched —
    // the sweep in processEvents delivers the event from there.
    if (entry.event === null) {
      log.error(
        { traceId: 'system', target: 'upstash', operation: 'dispatch', outcome: 'error', streamId: entry.id, errorCode: 'POISONED_MESSAGE' },
        'Stream message has no recoverable event — ACKing, outbox sweep will deliver',
      );
      await this.redis.xack(STREAM_KEY, GROUP, entry.id);
      return false;
    }

    const event = entry.event;
    try {
      await this.dispatchOne(event);
      await this.redis.xack(STREAM_KEY, GROUP, entry.id);
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
        { traceId: 'system', target: 'upstash', operation: 'dispatch', outcome: 'error', streamId: entry.id, errorMsg: e instanceof Error ? e.message : 'unknown' },
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
