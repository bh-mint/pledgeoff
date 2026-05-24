/**
 * Integration tests for P15–P18 API routes:
 *   P15 — GET /api/v1/queue
 *   P17 — GET /api/v1/ideas/[id]/audit-trail
 *   P18 — POST /api/v1/ideas/[id]/outcome
 *   P18 — GET  /api/v1/ideas/[id]/outcome
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ok, err } from 'neverthrow';
import { InvalidVerdictError, DecisionOutcomeRepositoryError } from '@pledgeoff/core';

// ── shared mocks ─────────────────────────────────────────────────────────────

const {
  mockResolveUserId,
  mockGetDecisionQueueUseCase,
  mockRecordOutcomeUseCase,
  mockGetDecisionTimelineUseCase,
  mockDecisionOutcomeRepo,
} = vi.hoisted(() => ({
  mockResolveUserId: vi.fn(),
  mockGetDecisionQueueUseCase: { execute: vi.fn() },
  mockRecordOutcomeUseCase: { execute: vi.fn() },
  mockGetDecisionTimelineUseCase: { execute: vi.fn() },
  mockDecisionOutcomeRepo: { findByIdea: vi.fn() },
}));

vi.mock('@/lib/api-auth', () => ({
  resolveUserId: mockResolveUserId,
  resolveUserIdFromRequest: mockResolveUserId,
}));
vi.mock('@pledgeoff/observability', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));
vi.mock('@/lib/container', () => ({
  container: {
    _repos: { decisionOutcomeRepo: mockDecisionOutcomeRepo },
    getDecisionQueueUseCase: mockGetDecisionQueueUseCase,
    recordOutcomeUseCase: mockRecordOutcomeUseCase,
    getDecisionTimelineUseCase: mockGetDecisionTimelineUseCase,
  },
}));

// Static imports — Vitest resolves [id] path correctly at build time
import { GET as getQueue } from '../queue/route';
import { GET as getAuditTrail } from '../ideas/[id]/audit-trail/route';
import { POST as postOutcome, GET as getOutcome } from '../ideas/[id]/outcome/route';

const TEST_USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const OTHER_USER_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const IDEA_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const ID_PARAMS = { params: Promise.resolve({ id: IDEA_ID }) };

// ── P15: GET /api/v1/queue ───────────────────────────────────────────────────

describe('GET /api/v1/queue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolveUserId.mockResolvedValue(TEST_USER_ID);
  });

  it('returns 401 when not authenticated', async () => {
    mockResolveUserId.mockResolvedValue(null);
    const res = await getQueue(new Request('http://localhost/api/v1/queue'));
    expect(res.status).toBe(401);
  });

  it('returns queue items on success', async () => {
    const items = [{ ideaId: IDEA_ID, priorityScore: 90, priorityExplanation: 'High signal' }];
    mockGetDecisionQueueUseCase.execute.mockResolvedValue(ok({ items }));
    const res = await getQueue(new Request('http://localhost/api/v1/queue'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.items).toHaveLength(1);
  });

  it('returns empty items list for new user', async () => {
    mockGetDecisionQueueUseCase.execute.mockResolvedValue(ok({ items: [] }));
    const res = await getQueue(new Request('http://localhost/api/v1/queue'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.items).toEqual([]);
  });

  it('returns 500 when use case fails', async () => {
    const { DecisionQueueRepositoryError } = await import('@pledgeoff/core');
    mockGetDecisionQueueUseCase.execute.mockResolvedValue(
      err(new DecisionQueueRepositoryError('db error'))
    );
    const res = await getQueue(new Request('http://localhost/api/v1/queue'));
    expect(res.status).toBe(500);
  });
});

// ── P17: GET /api/v1/ideas/[id]/audit-trail ──────────────────────────────────

describe('GET /api/v1/ideas/[id]/audit-trail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolveUserId.mockResolvedValue(TEST_USER_ID);
  });

  it('returns 401 when not authenticated', async () => {
    mockResolveUserId.mockResolvedValue(null);
    const res = await getAuditTrail(
      new Request(`http://localhost/api/v1/ideas/${IDEA_ID}/audit-trail`),
      ID_PARAMS,
    );
    expect(res.status).toBe(401);
  });

  it('returns timeline on success', async () => {
    const timeline = { ideaId: IDEA_ID, decisions: [], signals: [] };
    mockGetDecisionTimelineUseCase.execute.mockResolvedValue(ok(timeline));
    const res = await getAuditTrail(
      new Request(`http://localhost/api/v1/ideas/${IDEA_ID}/audit-trail`),
      ID_PARAMS,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.ideaId).toBe(IDEA_ID);
  });

  it('returns 404 when idea not found', async () => {
    mockGetDecisionTimelineUseCase.execute.mockResolvedValue(err(new Error('Not found')));
    const res = await getAuditTrail(
      new Request(`http://localhost/api/v1/ideas/${IDEA_ID}/audit-trail`),
      ID_PARAMS,
    );
    expect(res.status).toBe(404);
  });

  it('returns 500 on non-not-found error', async () => {
    mockGetDecisionTimelineUseCase.execute.mockResolvedValue(err(new Error('db timeout')));
    const res = await getAuditTrail(
      new Request(`http://localhost/api/v1/ideas/${IDEA_ID}/audit-trail`),
      ID_PARAMS,
    );
    expect(res.status).toBe(500);
  });
});

// ── P18: POST /api/v1/ideas/[id]/outcome ─────────────────────────────────────

describe('POST /api/v1/ideas/[id]/outcome', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolveUserId.mockResolvedValue(TEST_USER_ID);
  });

  function makeOutcomeReq(body: unknown) {
    return new Request(`http://localhost/api/v1/ideas/${IDEA_ID}/outcome`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  it('returns 401 when not authenticated', async () => {
    mockResolveUserId.mockResolvedValue(null);
    const res = await postOutcome(makeOutcomeReq({ outcomeType: 'built_worked' }), ID_PARAMS);
    expect(res.status).toBe(401);
  });

  it('returns 400 on invalid outcomeType', async () => {
    const res = await postOutcome(makeOutcomeReq({ outcomeType: 'invalid_value' }), ID_PARAMS);
    expect(res.status).toBe(400);
  });

  it('returns 400 on malformed JSON', async () => {
    const req = new Request(`http://localhost/api/v1/ideas/${IDEA_ID}/outcome`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    });
    const res = await postOutcome(req, ID_PARAMS);
    expect(res.status).toBe(400);
  });

  it('returns 200 and outcome on success', async () => {
    const outcome = {
      id: 'o1', ideaId: IDEA_ID, userId: TEST_USER_ID,
      verdictAtTime: 'GO', outcomeType: 'built_worked',
      notes: null, reportedAt: new Date().toISOString(),
    };
    mockRecordOutcomeUseCase.execute.mockResolvedValue(ok(outcome));
    const res = await postOutcome(makeOutcomeReq({ outcomeType: 'built_worked' }), ID_PARAMS);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.outcomeType).toBe('built_worked');
  });

  it('returns 404 when no decision found for idea', async () => {
    mockRecordOutcomeUseCase.execute.mockResolvedValue(err(new InvalidVerdictError()));
    const res = await postOutcome(makeOutcomeReq({ outcomeType: 'built_worked' }), ID_PARAMS);
    expect(res.status).toBe(404);
  });

  it('accepts optional notes field', async () => {
    const outcome = {
      id: 'o1', ideaId: IDEA_ID, userId: TEST_USER_ID,
      verdictAtTime: 'KILL', outcomeType: 'not_built',
      notes: 'Too much competition', reportedAt: new Date().toISOString(),
    };
    mockRecordOutcomeUseCase.execute.mockResolvedValue(ok(outcome));
    const res = await postOutcome(
      makeOutcomeReq({ outcomeType: 'not_built', notes: 'Too much competition' }),
      ID_PARAMS,
    );
    expect(res.status).toBe(200);
  });
});

// ── P18: GET /api/v1/ideas/[id]/outcome ──────────────────────────────────────

describe('GET /api/v1/ideas/[id]/outcome', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolveUserId.mockResolvedValue(TEST_USER_ID);
  });

  it('returns 401 when not authenticated', async () => {
    mockResolveUserId.mockResolvedValue(null);
    const res = await getOutcome(
      new Request(`http://localhost/api/v1/ideas/${IDEA_ID}/outcome`),
      ID_PARAMS,
    );
    expect(res.status).toBe(401);
  });

  it('returns null when no outcome exists', async () => {
    mockDecisionOutcomeRepo.findByIdea.mockResolvedValue(ok(null));
    const res = await getOutcome(
      new Request(`http://localhost/api/v1/ideas/${IDEA_ID}/outcome`),
      ID_PARAMS,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeNull();
  });

  it('returns outcome when it belongs to the user', async () => {
    const outcome = {
      id: 'o1', ideaId: IDEA_ID, userId: TEST_USER_ID,
      verdictAtTime: 'GO', outcomeType: 'built_worked',
      notes: null, reportedAt: new Date().toISOString(),
    };
    mockDecisionOutcomeRepo.findByIdea.mockResolvedValue(ok(outcome));
    const res = await getOutcome(
      new Request(`http://localhost/api/v1/ideas/${IDEA_ID}/outcome`),
      ID_PARAMS,
    );
    expect(res.status).toBe(200);
  });

  it('returns 404 when outcome belongs to a different user', async () => {
    const outcome = {
      id: 'o1', ideaId: IDEA_ID, userId: OTHER_USER_ID,
      verdictAtTime: 'GO', outcomeType: 'built_worked',
      notes: null, reportedAt: new Date().toISOString(),
    };
    mockDecisionOutcomeRepo.findByIdea.mockResolvedValue(ok(outcome));
    const res = await getOutcome(
      new Request(`http://localhost/api/v1/ideas/${IDEA_ID}/outcome`),
      ID_PARAMS,
    );
    expect(res.status).toBe(404);
  });

  it('returns 500 when repo fails', async () => {
    mockDecisionOutcomeRepo.findByIdea.mockResolvedValue(
      err(new DecisionOutcomeRepositoryError('db error'))
    );
    const res = await getOutcome(
      new Request(`http://localhost/api/v1/ideas/${IDEA_ID}/outcome`),
      ID_PARAMS,
    );
    expect(res.status).toBe(500);
  });
});
