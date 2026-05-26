import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ok, err } from 'neverthrow';
import { IdeaRepositoryError } from '@pledgeoff/core';

const mockResolveUserId = vi.fn();
const mockGetUserPlan = vi.fn();
const mockCheckRateLimit = vi.fn();
const mockCreateIdeaUseCase = { execute: vi.fn() };
const mockIdeaRepo = {
  findByUserId: vi.fn(),
  countThisMonth: vi.fn(),
};
const mockDecisionRepo = { findByIdeaId: vi.fn() };
const mockIdempotencyStore = {
  hasBeenProcessed: vi.fn(),
  markAsProcessed: vi.fn(),
};
const mockAuditLog = { log: vi.fn() };
const mockEventBus = { processOutbox: vi.fn() };

vi.mock('@/lib/api-auth', () => ({ resolveUserId: mockResolveUserId, resolveUserIdFromRequest: mockResolveUserId }));
vi.mock('@/server/billing/getUserPlan', () => ({ getUserPlan: mockGetUserPlan }));
vi.mock('@/lib/rate-limiter', () => ({ checkRateLimit: mockCheckRateLimit }));
vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>();
  return { ...actual, after: () => undefined };
});
vi.mock('@/lib/container', () => ({
  container: {
    _unsafeRepos: {
      ideaRepo: mockIdeaRepo,
      decisionRepo: mockDecisionRepo,
      idempotencyStore: mockIdempotencyStore,
    },
    ideaRepo: mockIdeaRepo,
    createIdeaUseCase: mockCreateIdeaUseCase,
    auditLog: mockAuditLog,
    eventBus: mockEventBus,
  },
}));

const TEST_USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const VALID_IDEA_TEXT = 'An interesting B2B SaaS idea for the construction market';

function makeRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/v1/ideas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

describe('POST /api/v1/ideas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolveUserId.mockResolvedValue(TEST_USER_ID);
    mockGetUserPlan.mockResolvedValue('free');
    mockCheckRateLimit.mockResolvedValue({ allowed: true });
    mockIdeaRepo.countThisMonth.mockResolvedValue(ok(0));
    mockIdempotencyStore.hasBeenProcessed.mockResolvedValue(ok(false));
    mockIdempotencyStore.markAsProcessed.mockResolvedValue(ok(undefined));
    mockAuditLog.log.mockResolvedValue(undefined);
    mockEventBus.processOutbox.mockResolvedValue({ processed: 0 });
  });

  it('returns 401 when Authorization header is missing', async () => {
    mockResolveUserId.mockResolvedValue(null);
    const { POST } = await import('../ideas/route');
    const res = await POST(makeRequest({ text: VALID_IDEA_TEXT }));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHENTICATED');
  });

  it('returns 400 when body is not valid JSON', async () => {
    const { POST } = await import('../ideas/route');
    const req = new Request('http://localhost/api/v1/ideas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token' },
      body: 'not-json{{{',
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('INVALID_JSON');
  });

  it('returns 422 when idea text is missing', async () => {
    const { POST } = await import('../ideas/route');
    const res = await POST(makeRequest({ text: '' }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_FAILED');
  });

  it('returns 403 when monthly plan limit is reached', async () => {
    mockGetUserPlan.mockResolvedValue('free');
    mockIdeaRepo.countThisMonth.mockResolvedValue(ok(3));

    const { POST } = await import('../ideas/route');
    const res = await POST(makeRequest({ text: VALID_IDEA_TEXT }));

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe('PLAN_LIMIT_REACHED');
  });

  it('returns 429 when rate limited', async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, retryAfterMs: 5000 });

    const { POST } = await import('../ideas/route');
    const res = await POST(makeRequest({ text: VALID_IDEA_TEXT }));

    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error.code).toBe('RATE_LIMITED');
  });

  it('returns 409 when idempotency key was already processed', async () => {
    mockIdempotencyStore.hasBeenProcessed.mockResolvedValue(ok(true));

    const { POST } = await import('../ideas/route');
    const res = await POST(makeRequest({ text: VALID_IDEA_TEXT }, { 'idempotency-key': 'key-123' }));

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.code).toBe('ALREADY_PROCESSED');
  });

  it('returns 201 with idea data on success', async () => {
    const idea = {
      id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      userId: TEST_USER_ID,
      text: VALID_IDEA_TEXT,
      createdAt: new Date().toISOString(),
    };
    mockCreateIdeaUseCase.execute.mockResolvedValue(ok(idea));

    const { POST } = await import('../ideas/route');
    const res = await POST(makeRequest({ text: VALID_IDEA_TEXT }));

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.id).toBe(idea.id);
    expect(body.data.text).toBe(idea.text);
  });

  it('returns 500 when use case returns internal error', async () => {
    mockCreateIdeaUseCase.execute.mockResolvedValue(err(new IdeaRepositoryError('DB down')));

    const { POST } = await import('../ideas/route');
    const res = await POST(makeRequest({ text: VALID_IDEA_TEXT }));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe('INTERNAL');
  });
});

describe('GET /api/v1/ideas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolveUserId.mockResolvedValue(TEST_USER_ID);
  });

  it('returns 401 when not authenticated', async () => {
    mockResolveUserId.mockResolvedValue(null);
    const { GET } = await import('../ideas/route');
    const req = new Request('http://localhost/api/v1/ideas');
    const res = await GET(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHENTICATED');
  });

  it('returns 200 with ideas array', async () => {
    const ideas = [
      { id: 'id-1', userId: TEST_USER_ID, text: 'First idea text here ok', createdAt: new Date().toISOString() },
    ];
    mockIdeaRepo.findByUserId.mockResolvedValue(ok(ideas));
    mockDecisionRepo.findByIdeaId.mockResolvedValue(ok(null));

    const { GET } = await import('../ideas/route');
    const req = new Request('http://localhost/api/v1/ideas', {
      headers: { Authorization: 'Bearer token' },
    });
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe('id-1');
  });

  it('returns 500 when repo fails', async () => {
    mockIdeaRepo.findByUserId.mockResolvedValue(err(new IdeaRepositoryError('DB error')));

    const { GET } = await import('../ideas/route');
    const req = new Request('http://localhost/api/v1/ideas', {
      headers: { Authorization: 'Bearer token' },
    });
    const res = await GET(req);

    expect(res.status).toBe(500);
  });
});
