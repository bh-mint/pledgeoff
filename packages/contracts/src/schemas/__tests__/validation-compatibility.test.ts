import { describe, expect, it } from 'vitest';
import { CreateIdeaRequestSchema } from '../ideas';
import { SignalsFetchedV1Schema } from '../../events/signals-fetched.v1';

const uuid = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

describe('request and event validation compatibility', () => {
  it('keeps optional fields absent and strips unknown request fields', () => {
    expect(CreateIdeaRequestSchema.parse({ text: 'A useful developer tool', admin: true }))
      .toEqual({ text: 'A useful developer tool' });
  });

  it('preserves explicit nulls and accepts a valid team UUID', () => {
    expect(CreateIdeaRequestSchema.parse({ text: 'A useful developer tool', teamId: null, context: null }))
      .toEqual({ text: 'A useful developer tool', teamId: null, context: null });
    expect(CreateIdeaRequestSchema.parse({ text: 'A useful developer tool', teamId: uuid }).teamId)
      .toBe(uuid);
  });

  it('enforces text boundaries and retains field errors consumed by API handlers', () => {
    for (const length of [10, 2000]) {
      expect(CreateIdeaRequestSchema.safeParse({ text: 'x'.repeat(length) }).success).toBe(true);
    }
    for (const length of [9, 2001]) {
      const result = CreateIdeaRequestSchema.safeParse({ text: 'x'.repeat(length) });
      expect(result.success).toBe(false);
      if (result.success) throw new Error('Invalid text was accepted');
      expect(result.error.flatten().fieldErrors.text).toHaveLength(1);
      expect(result.error.flatten().formErrors).toEqual([]);
    }
  });

  it('validates event identifiers, timestamps and signal arrays', () => {
    const event = {
      eventId: uuid, eventType: 'signals.fetched.v1', eventVersion: 1,
      occurredAt: '2026-10-27T06:00:00.000Z', traceId: 'compatibility-test',
      payload: { ideaId: uuid, signalIds: [uuid], signalCount: 1 },
    };
    expect(SignalsFetchedV1Schema.parse(event)).toEqual(event);
    expect(SignalsFetchedV1Schema.safeParse({ ...event, occurredAt: 'yesterday' }).success).toBe(false);
    expect(SignalsFetchedV1Schema.safeParse({ ...event, payload: { ...event.payload, signalIds: ['invalid'] } }).success).toBe(false);
    expect(SignalsFetchedV1Schema.safeParse({ ...event, payload: { ...event.payload, signalCount: -1 } }).success).toBe(false);
  });
});
