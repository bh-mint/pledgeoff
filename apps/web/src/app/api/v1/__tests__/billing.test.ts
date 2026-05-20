import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ok, err } from 'neverthrow';
import type { Subscription } from '@pledgeoff/core';

const mockResolveUserId = vi.fn();
const mockGetOrCreateSubscriptionUseCase = { execute: vi.fn() };

vi.mock('@/lib/api-auth', () => ({ resolveUserId: mockResolveUserId }));
vi.mock('@/lib/container', () => ({
  container: {
    getOrCreateSubscriptionUseCase: mockGetOrCreateSubscriptionUseCase,
  },
}));

const TEST_USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

function makeSub(overrides: Partial<Subscription> = {}): Subscription {
  const now = new Date().toISOString();
  return {
    id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    userId: TEST_USER_ID,
    plan: 'free',
    status: 'active',
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    currentPeriodEnd: null,
    extraSeats: 0,
    stripeExtraSeatItemId: null,
    ottoIncludedUsed: 0,
    ottoIncludedResetAt: null,
    ottoPurchased: 0,
    pastDueSince: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('GET /api/v1/billing/subscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolveUserId.mockResolvedValue(TEST_USER_ID);
  });

  it('returns 401 when not authenticated', async () => {
    mockResolveUserId.mockResolvedValue(null);
    const { GET } = await import('../billing/subscription/route');
    const req = new Request('http://localhost/api/v1/billing/subscription');
    const res = await GET(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHENTICATED');
  });

  it('returns 200 with plan and status for free user', async () => {
    mockGetOrCreateSubscriptionUseCase.execute.mockResolvedValue(ok(makeSub({ plan: 'free', status: 'active' })));

    const { GET } = await import('../billing/subscription/route');
    const req = new Request('http://localhost/api/v1/billing/subscription', {
      headers: { Authorization: 'Bearer token' },
    });
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.plan).toBe('free');
    expect(body.data.status).toBe('active');
  });

  it('returns 200 with pro plan for active subscriber', async () => {
    mockGetOrCreateSubscriptionUseCase.execute.mockResolvedValue(
      ok(makeSub({ plan: 'pro', status: 'active', currentPeriodEnd: '2026-06-20T00:00:00.000Z' }))
    );

    const { GET } = await import('../billing/subscription/route');
    const req = new Request('http://localhost/api/v1/billing/subscription', {
      headers: { Authorization: 'Bearer token' },
    });
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.plan).toBe('pro');
    expect(body.data.currentPeriodEnd).toBe('2026-06-20T00:00:00.000Z');
  });

  it('keeps pro plan during past_due grace period (24h)', async () => {
    mockGetOrCreateSubscriptionUseCase.execute.mockResolvedValue(
      ok(makeSub({ plan: 'pro', status: 'past_due' }))
    );

    const { GET } = await import('../billing/subscription/route');
    const req = new Request('http://localhost/api/v1/billing/subscription', {
      headers: { Authorization: 'Bearer token' },
    });
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    // past_due = grace period activ, planul rămâne pro până la downgrade de cron
    expect(body.data.plan).toBe('pro');
    expect(body.data.status).toBe('past_due');
  });

  it('returns 500 when use case fails', async () => {
    mockGetOrCreateSubscriptionUseCase.execute.mockResolvedValue(
      err(new Error('DB connection failed'))
    );

    const { GET } = await import('../billing/subscription/route');
    const req = new Request('http://localhost/api/v1/billing/subscription', {
      headers: { Authorization: 'Bearer token' },
    });
    const res = await GET(req);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe('INTERNAL');
  });
});
