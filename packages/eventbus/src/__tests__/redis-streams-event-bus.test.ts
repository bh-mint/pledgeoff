import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RedisStreamsEventBus } from '../redis-streams-event-bus';
import type { DomainEvent } from '@pledgeoff/core';

type RedisMocks = {
  xadd: ReturnType<typeof vi.fn>;
  xgroup: ReturnType<typeof vi.fn>;
  xreadgroup: ReturnType<typeof vi.fn>;
  xautoclaim: ReturnType<typeof vi.fn>;
  xack: ReturnType<typeof vi.fn>;
};

vi.mock('@upstash/redis', () => {
  const xadd = vi.fn().mockResolvedValue('1-0');
  const xgroup = vi.fn().mockResolvedValue('OK');
  const xreadgroup = vi.fn().mockResolvedValue(null);
  const xautoclaim = vi.fn().mockResolvedValue(['0-0', []]);
  const xack = vi.fn().mockResolvedValue(1);
  return {
    Redis: vi.fn().mockImplementation(() => ({ xadd, xgroup, xreadgroup, xautoclaim, xack })),
    _mocks: { xadd, xgroup, xreadgroup, xautoclaim, xack },
  };
});

async function getRedisMocks(): Promise<RedisMocks> {
  const mod = await import('@upstash/redis');
  return (mod as unknown as { _mocks: RedisMocks })._mocks;
}

function makeSupabase(overrides: {
  insertError?: { message: string } | null;
  selectData?: unknown[];
} = {}) {
  const updateEq = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn().mockReturnValue({ eq: updateEq });
  const limitMock = vi.fn().mockResolvedValue({ data: overrides.selectData ?? [], error: null });
  const orderMock = vi.fn().mockReturnValue({ limit: limitMock });
  const eqMock = vi.fn().mockReturnValue({ order: orderMock });
  const select = vi.fn().mockReturnValue({ eq: eqMock });
  const insert = vi.fn().mockResolvedValue({ error: overrides.insertError ?? null });
  return {
    from: vi.fn().mockReturnValue({ insert, select, update }),
    _mocks: { insert, select, update, updateEq },
  };
}

function makeEvent(eventType = 'idea.created.v1'): DomainEvent<{ ideaId: string }> {
  return {
    eventId: crypto.randomUUID(),
    eventType,
    eventVersion: 1,
    occurredAt: new Date().toISOString(),
    traceId: crypto.randomUUID(),
    payload: { ideaId: crypto.randomUUID() },
  };
}

describe('RedisStreamsEventBus', () => {
  beforeEach(async () => {
    const { xadd, xgroup, xreadgroup, xautoclaim, xack } = await getRedisMocks();
    xadd.mockClear().mockResolvedValue('1-0');
    xgroup.mockClear().mockResolvedValue('OK');
    xreadgroup.mockClear().mockResolvedValue(null);
    xautoclaim.mockClear().mockResolvedValue(['0-0', []]);
    xack.mockClear().mockResolvedValue(1);
  });

  describe('publish', () => {
    it('inserts into outbox and XADDs to stream', async () => {
      const supabase = makeSupabase();
      const bus = new RedisStreamsEventBus(supabase as never, 'https://x.upstash.io', 'token');
      const event = makeEvent();

      const result = await bus.publish('idea.created.v1', event);

      expect(result.isOk()).toBe(true);
      expect(supabase.from).toHaveBeenCalledWith('outbox');
      const { xadd } = await getRedisMocks();
      expect(xadd).toHaveBeenCalledWith('pledgeoff:events', '*', { eventJson: JSON.stringify(event) });
    });

    it('returns err when outbox insert fails', async () => {
      const supabase = makeSupabase({ insertError: { message: 'DB down' } });
      const bus = new RedisStreamsEventBus(supabase as never, 'https://x.upstash.io', 'token');

      const result = await bus.publish('idea.created.v1', makeEvent());

      expect(result.isErr()).toBe(true);
    });

    it('succeeds even when XADD fails (outbox is fallback)', async () => {
      const supabase = makeSupabase();
      const bus = new RedisStreamsEventBus(supabase as never, 'https://x.upstash.io', 'token');
      const { xadd } = await getRedisMocks();
      xadd.mockRejectedValueOnce(new Error('stream unavailable'));

      const result = await bus.publish('idea.created.v1', makeEvent());

      expect(result.isOk()).toBe(true);
    });
  });

  describe('processStream', () => {
    it('dispatches stream messages to subscribed handlers', async () => {
      const event = makeEvent('idea.created.v1');
      const supabase = makeSupabase();
      const bus = new RedisStreamsEventBus(supabase as never, 'https://x.upstash.io', 'token');
      const handler = vi.fn().mockResolvedValue(undefined);
      bus.subscribe('idea.created.v1', handler);

      const { xreadgroup } = await getRedisMocks();
      xreadgroup.mockResolvedValue([
        { name: 'pledgeoff:events', messages: [{ id: '1-0', message: { eventJson: JSON.stringify(event) } }] },
      ]);

      const stats = await bus.processStream();

      expect(stats.processed).toBe(1);
      expect(stats.failed).toBe(0);
      expect(handler).toHaveBeenCalledWith(event);
      const { xack } = await getRedisMocks();
      expect(xack).toHaveBeenCalledWith('pledgeoff:events', 'pledgeoff-workers', '1-0');
    });

    it('returns 0 when no new messages', async () => {
      const supabase = makeSupabase();
      const bus = new RedisStreamsEventBus(supabase as never, 'https://x.upstash.io', 'token');

      const stats = await bus.processStream();

      expect(stats.processed).toBe(0);
      expect(stats.failed).toBe(0);
    });

    it('counts failed when handler throws', async () => {
      const event = makeEvent('idea.created.v1');
      const supabase = makeSupabase();
      const bus = new RedisStreamsEventBus(supabase as never, 'https://x.upstash.io', 'token');
      bus.subscribe('idea.created.v1', vi.fn().mockRejectedValue(new Error('handler crashed')));

      const { xreadgroup } = await getRedisMocks();
      xreadgroup.mockResolvedValue([
        { name: 'pledgeoff:events', messages: [{ id: '1-0', message: { eventJson: JSON.stringify(event) } }] },
      ]);

      const stats = await bus.processStream();

      expect(stats.failed).toBe(1);
      expect(stats.processed).toBe(0);
    });

    it('processes PEL messages from xautoclaim', async () => {
      const event = makeEvent('signals.fetched.v1');
      const supabase = makeSupabase();
      const bus = new RedisStreamsEventBus(supabase as never, 'https://x.upstash.io', 'token');
      const handler = vi.fn().mockResolvedValue(undefined);
      bus.subscribe('signals.fetched.v1', handler);

      const { xautoclaim } = await getRedisMocks();
      xautoclaim.mockResolvedValue(['0-0', [{ id: '0-1', message: { eventJson: JSON.stringify(event) } }]]);

      const stats = await bus.processStream();

      expect(stats.processed).toBe(1);
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('processEvents (unified entry point)', () => {
    it('falls back to outbox when Redis stream is unavailable', async () => {
      const event = makeEvent();
      const supabase = makeSupabase({
        selectData: [{ event_id: event.eventId, event_type: event.eventType, payload: event, attempts: 0 }],
      });
      const bus = new RedisStreamsEventBus(supabase as never, 'https://x.upstash.io', 'token');
      bus.subscribe(event.eventType, vi.fn().mockResolvedValue(undefined));

      // xautoclaim throws → processStream throws → processEvents falls back to outbox
      const { xautoclaim } = await getRedisMocks();
      xautoclaim.mockRejectedValueOnce(new Error('Redis unavailable'));

      const stats = await bus.processEvents();

      expect(stats.processed).toBe(1);
    });
  });
});
