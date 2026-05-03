import { describe, it, expect, vi } from 'vitest';
import { PostgresEventBus } from '../postgres-event-bus';
import type { DomainEvent } from '@pledgeoff/core';

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

function makeSupabase(overrides: {
  insertError?: { message: string } | null;
  selectData?: unknown[];
  selectError?: { message: string } | null;
} = {}) {
  const updateMock = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: null }),
  });
  const selectMock = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      order: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({
          data: overrides.selectData ?? [],
          error: overrides.selectError ?? null,
        }),
      }),
    }),
  });
  const insertMock = vi.fn().mockResolvedValue({ error: overrides.insertError ?? null });

  return {
    from: vi.fn().mockReturnValue({
      insert: insertMock,
      select: selectMock,
      update: updateMock,
    }),
    _mocks: { insertMock, selectMock, updateMock },
  };
}

describe('PostgresEventBus', () => {
  it('inserts event into outbox on publish', async () => {
    const supabase = makeSupabase();
    const bus = new PostgresEventBus(supabase as never);
    const event = makeEvent();

    const result = await bus.publish('idea.created.v1', event);

    expect(result.isOk()).toBe(true);
    expect(supabase.from).toHaveBeenCalledWith('outbox');
  });

  it('returns error when outbox insert fails', async () => {
    const supabase = makeSupabase({ insertError: { message: 'DB down' } });
    const bus = new PostgresEventBus(supabase as never);

    const result = await bus.publish('idea.created.v1', makeEvent());

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toContain('DB down');
    }
  });

  it('dispatches to subscriber in-process after publish', async () => {
    const supabase = makeSupabase();
    const bus = new PostgresEventBus(supabase as never);
    const event = makeEvent('idea.created.v1');
    const handler = vi.fn().mockResolvedValue(undefined);

    bus.subscribe('idea.created.v1', handler);
    await bus.publish('idea.created.v1', event);

    expect(handler).toHaveBeenCalledWith(event);
  });

  it('processOutbox marks rows as processed on success', async () => {
    const event = makeEvent();
    const row = { event_id: event.eventId, event_type: event.eventType, payload: event, attempts: 0 };

    const supabase = makeSupabase({ selectData: [row] });
    const bus = new PostgresEventBus(supabase as never);
    const handler = vi.fn().mockResolvedValue(undefined);
    bus.subscribe(event.eventType, handler);

    const stats = await bus.processOutbox();

    expect(stats.processed).toBe(1);
    expect(stats.failed).toBe(0);
    expect(handler).toHaveBeenCalledWith(event);
  });

  it('processOutbox increments attempts on handler failure', async () => {
    const event = makeEvent();
    const row = { event_id: event.eventId, event_type: event.eventType, payload: event, attempts: 0 };
    const updateEqMock = vi.fn().mockResolvedValue({ error: null });
    const updateMock = vi.fn().mockReturnValue({ eq: updateEqMock });

    const supabase = {
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null }),
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [row], error: null }),
            }),
          }),
        }),
        update: updateMock,
      }),
    };

    const bus = new PostgresEventBus(supabase as never);
    bus.subscribe(event.eventType, vi.fn().mockRejectedValue(new Error('handler crashed')));

    const stats = await bus.processOutbox();

    expect(stats.failed).toBe(1);
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ attempts: 1 }));
  });

  it('does not dispatch to unrelated subscribers', async () => {
    const supabase = makeSupabase();
    const bus = new PostgresEventBus(supabase as never);
    const handler = vi.fn().mockResolvedValue(undefined);

    bus.subscribe('signals.fetched.v1', handler);
    await bus.publish('idea.created.v1', makeEvent('idea.created.v1'));

    expect(handler).not.toHaveBeenCalled();
  });
});
