import { describe, it, expect } from 'vitest';
import { FeedbackSchema, FeedbackVoteSchema } from '../feedback.js';

describe('FeedbackVoteSchema', () => {
  it('accepts thumbs_up and thumbs_down', () => {
    expect(FeedbackVoteSchema.safeParse('thumbs_up').success).toBe(true);
    expect(FeedbackVoteSchema.safeParse('thumbs_down').success).toBe(true);
  });

  it('rejects unknown vote values', () => {
    expect(FeedbackVoteSchema.safeParse('like').success).toBe(false);
    expect(FeedbackVoteSchema.safeParse(1).success).toBe(false);
  });
});

describe('FeedbackSchema', () => {
  const validFeedback = {
    id: crypto.randomUUID(),
    ideaId: crypto.randomUUID(),
    decisionId: crypto.randomUUID(),
    userId: crypto.randomUUID(),
    vote: 'thumbs_up' as const,
    createdAt: new Date().toISOString(),
  };

  it('parses valid feedback', () => {
    const result = FeedbackSchema.safeParse(validFeedback);
    expect(result.success).toBe(true);
  });

  it('parses thumbs_down vote', () => {
    const result = FeedbackSchema.safeParse({ ...validFeedback, vote: 'thumbs_down' });
    expect(result.success).toBe(true);
  });

  it('rejects missing fields', () => {
    const result = FeedbackSchema.safeParse({
      id: validFeedback.id,
      ideaId: validFeedback.ideaId,
      userId: validFeedback.userId,
      vote: validFeedback.vote,
      createdAt: validFeedback.createdAt,
    });
    expect(result.success).toBe(false);
  });
});
