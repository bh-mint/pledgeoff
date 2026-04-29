import { describe, it, expect } from 'vitest';
import { DecisionSchema, VerdictSchema } from '../decision';

describe('VerdictSchema', () => {
  it('accepts GO, KILL, PIVOT', () => {
    expect(VerdictSchema.safeParse('GO').success).toBe(true);
    expect(VerdictSchema.safeParse('KILL').success).toBe(true);
    expect(VerdictSchema.safeParse('PIVOT').success).toBe(true);
  });

  it('rejects unknown verdict', () => {
    expect(VerdictSchema.safeParse('MAYBE').success).toBe(false);
    expect(VerdictSchema.safeParse('go').success).toBe(false);
  });
});

describe('DecisionSchema', () => {
  const validDecision = {
    id: crypto.randomUUID(),
    ideaId: crypto.randomUUID(),
    verdict: 'GO' as const,
    reasoning: 'Strong market demand signals from Reddit and GitHub indicate product-market fit.',
    confidence: 0.82,
    signalIds: [crypto.randomUUID(), crypto.randomUUID()],
    createdAt: new Date().toISOString(),
  };

  it('parses a valid decision', () => {
    const result = DecisionSchema.safeParse(validDecision);
    expect(result.success).toBe(true);
  });

  it('rejects confidence below 0', () => {
    const result = DecisionSchema.safeParse({ ...validDecision, confidence: -0.1 });
    expect(result.success).toBe(false);
  });

  it('rejects confidence above 1', () => {
    const result = DecisionSchema.safeParse({ ...validDecision, confidence: 1.1 });
    expect(result.success).toBe(false);
  });

  it('accepts confidence at boundaries 0 and 1', () => {
    expect(DecisionSchema.safeParse({ ...validDecision, confidence: 0 }).success).toBe(true);
    expect(DecisionSchema.safeParse({ ...validDecision, confidence: 1 }).success).toBe(true);
  });
});
