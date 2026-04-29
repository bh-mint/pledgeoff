import { describe, it, expect } from 'vitest';
import { SignalSchema } from '../signal';

describe('SignalSchema', () => {
  const validSignal = {
    id: crypto.randomUUID(),
    ideaId: crypto.randomUUID(),
    source: 'reddit' as const,
    url: 'https://reddit.com/r/startups/comments/abc',
    title: 'People want this feature',
    summary: 'Multiple users expressed strong interest in this idea',
    sentiment: 'positive' as const,
    fetchedAt: new Date().toISOString(),
  };

  it('parses a valid signal', () => {
    const result = SignalSchema.safeParse(validSignal);
    expect(result.success).toBe(true);
  });

  it('rejects unknown source', () => {
    const result = SignalSchema.safeParse({ ...validSignal, source: 'twitter' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid URL', () => {
    const result = SignalSchema.safeParse({ ...validSignal, url: 'not-a-url' });
    expect(result.success).toBe(false);
  });

  it('rejects unknown sentiment', () => {
    const result = SignalSchema.safeParse({ ...validSignal, sentiment: 'mixed' });
    expect(result.success).toBe(false);
  });

  it('accepts github as source', () => {
    const result = SignalSchema.safeParse({ ...validSignal, source: 'github' });
    expect(result.success).toBe(true);
  });
});
