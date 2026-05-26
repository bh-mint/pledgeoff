import { describe, it, expect } from 'vitest';
import { decisionFromPersistence } from '../decision';
import { ideaFromPersistence } from '../idea';
import { subscriptionFromPersistence } from '../subscription';
import { ottoConversationFromPersistence } from '../otto-conversation';
import { InvalidDomainDataError } from '../errors';

const uuid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

// ── Decision ──────────────────────────────────────────────────────────────

describe('decisionFromPersistence', () => {
  const valid = {
    id: uuid(),
    ideaId: uuid(),
    verdict: 'GO',
    reasoning: 'Strong market signals.',
    confidence: 0.8,
    score: 73,
    signalIds: [uuid()],
    createdAt: now(),
  };

  it('parses a valid decision', () => {
    const result = decisionFromPersistence(valid);
    expect(result.score).toBe(73);
    expect(result.verdict).toBe('GO');
  });

  it('throws when score is null', () => {
    expect(() => decisionFromPersistence({ ...valid, score: null }))
      .toThrow(InvalidDomainDataError);
  });

  it('throws when score is undefined', () => {
    const withoutScore = { ...valid, score: undefined };
    expect(() => decisionFromPersistence(withoutScore))
      .toThrow(InvalidDomainDataError);
  });

  it('throws when verdict is unknown', () => {
    expect(() => decisionFromPersistence({ ...valid, verdict: 'MAYBE' }))
      .toThrow(InvalidDomainDataError);
  });

  it('throws when id is not a UUID', () => {
    expect(() => decisionFromPersistence({ ...valid, id: 'not-a-uuid' }))
      .toThrow(InvalidDomainDataError);
  });

  it('throws when confidence is out of range', () => {
    expect(() => decisionFromPersistence({ ...valid, confidence: 1.5 }))
      .toThrow(InvalidDomainDataError);
  });

  it('InvalidDomainDataError has expected code', () => {
    try {
      decisionFromPersistence({ ...valid, score: null });
    } catch (e) {
      expect(e).toBeInstanceOf(InvalidDomainDataError);
      expect((e as InvalidDomainDataError).code).toBe('INVALID_DOMAIN_DATA');
    }
  });
});

// ── Idea ──────────────────────────────────────────────────────────────────

describe('ideaFromPersistence', () => {
  const valid = {
    id: uuid(),
    userId: uuid(),
    teamId: null,
    text: 'An idea for a developer tool that speeds up CI pipelines.',
    niche: 'dev_tools',
    createdAt: now(),
  };

  it('parses a valid idea', () => {
    const result = ideaFromPersistence(valid);
    expect(result.niche).toBe('dev_tools');
  });

  it('throws when userId is not a UUID', () => {
    expect(() => ideaFromPersistence({ ...valid, userId: '' }))
      .toThrow(InvalidDomainDataError);
  });

  it('throws when id is missing', () => {
    expect(() => ideaFromPersistence({ ...valid, id: undefined }))
      .toThrow(InvalidDomainDataError);
  });

  it('throws when text is too short', () => {
    expect(() => ideaFromPersistence({ ...valid, text: 'short' }))
      .toThrow(InvalidDomainDataError);
  });

  it('throws when niche is unknown', () => {
    expect(() => ideaFromPersistence({ ...valid, niche: 'crypto' }))
      .toThrow(InvalidDomainDataError);
  });
});

// ── Subscription ──────────────────────────────────────────────────────────

describe('subscriptionFromPersistence', () => {
  const valid = {
    id: uuid(),
    userId: uuid(),
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    plan: 'free',
    status: 'active',
    currentPeriodEnd: null,
    extraSeats: 0,
    stripeExtraSeatItemId: null,
    pastDueSince: null,
    ottoIncludedUsed: 0,
    ottoIncludedResetAt: null,
    ottoPurchased: 0,
    createdAt: now(),
    updatedAt: now(),
  };

  it('parses a valid subscription', () => {
    const result = subscriptionFromPersistence(valid);
    expect(result.plan).toBe('free');
  });

  it('throws on legacy plan name "pro"', () => {
    expect(() => subscriptionFromPersistence({ ...valid, plan: 'pro' }))
      .toThrow(InvalidDomainDataError);
  });

  it('throws on legacy plan name "pro_plus"', () => {
    expect(() => subscriptionFromPersistence({ ...valid, plan: 'pro_plus' }))
      .toThrow(InvalidDomainDataError);
  });

  it('throws on unknown status', () => {
    expect(() => subscriptionFromPersistence({ ...valid, status: 'dunno' }))
      .toThrow(InvalidDomainDataError);
  });

  it('accepts all valid plan values', () => {
    for (const plan of ['free', 'founder', 'team', 'studio', 'enterprise'] as const) {
      expect(() => subscriptionFromPersistence({ ...valid, plan })).not.toThrow();
    }
  });
});

// ── OttoConversation ──────────────────────────────────────────────────────

describe('ottoConversationFromPersistence', () => {
  const valid = {
    id: uuid(),
    userId: uuid(),
    ideaId: uuid(),
    messages: [],
    createdAt: now(),
    updatedAt: now(),
  };

  it('parses a valid conversation', () => {
    const result = ottoConversationFromPersistence(valid);
    expect(result.messages).toHaveLength(0);
  });

  it('throws when userId is not a UUID', () => {
    expect(() => ottoConversationFromPersistence({ ...valid, userId: 'bad' }))
      .toThrow(InvalidDomainDataError);
  });

  it('throws when ideaId is missing', () => {
    expect(() => ottoConversationFromPersistence({ ...valid, ideaId: undefined }))
      .toThrow(InvalidDomainDataError);
  });

  it('parses conversation with messages', () => {
    const withMessages = {
      ...valid,
      messages: [{ role: 'user', content: 'Hello', createdAt: now() }],
    };
    const result = ottoConversationFromPersistence(withMessages);
    expect(result.messages).toHaveLength(1);
  });

  it('throws when message role is invalid', () => {
    const withBadRole = {
      ...valid,
      messages: [{ role: 'admin', content: 'Hello', createdAt: now() }],
    };
    expect(() => ottoConversationFromPersistence(withBadRole))
      .toThrow(InvalidDomainDataError);
  });
});
