/**
 * Chaos tests: verify use cases handle unexpected failures gracefully.
 * Rules:
 *   - Repos that throw (not err()) must not crash the use case
 *   - Malformed/edge-case inputs must return typed errors, not throw
 *   - Concurrent calls must not corrupt shared state
 */
import { describe, it, expect } from 'vitest';
import { ok, err } from 'neverthrow';

import { CreateIdeaUseCase } from '../create-idea';
import { RecordOutcomeUseCase } from '../record-outcome';
import { GetFlywheelStatsUseCase } from '../get-flywheel-stats';
import { GetUsersAccuracyReportUseCase } from '../get-users-accuracy-report';
import { GetDecisionQueueUseCase } from '../get-decision-queue';

import { IdeaRepositoryError } from '../../ports/idea-repository';
import { DecisionOutcomeRepositoryError } from '../../ports/decision-outcome-repository';
import { DecisionRepositoryError } from '../../ports/decision-repository';
import { DecisionQueueRepositoryError } from '../../ports/decision-queue-repository';
import type { DecisionOutcome } from '../../domain/decision-outcome';
import type { Decision } from '../../domain/decision';
import type { DecisionQueueItem } from '../../domain/decision-queue';

// ── helpers ────────────────────────────────────────────────────────────────

function makeOutcome(overrides: Partial<DecisionOutcome> = {}): DecisionOutcome {
  return {
    id: crypto.randomUUID(),
    ideaId: crypto.randomUUID(),
    userId: 'user-1',
    verdictAtTime: 'GO',
    outcomeType: 'built_worked',
    notes: null,
    reportedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeDecision(overrides: Partial<Decision> = {}): Decision {
  return {
    id: crypto.randomUUID(),
    ideaId: 'idea-1',
    verdict: 'GO',
    confidence: 0.8,
    reasoning: 'Strong signal',
    signals: [],
    dimensions: [],
    score: 80,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeQueueItem(overrides: Partial<DecisionQueueItem> = {}): DecisionQueueItem {
  return {
    id: crypto.randomUUID(),
    ideaId: crypto.randomUUID(),
    userId: 'user-1',
    priorityScore: 75,
    priorityExplanation: 'High signal',
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// ── CreateIdeaUseCase ───────────────────────────────────────────────────────

describe('chaos: CreateIdeaUseCase', () => {
  it('returns err when repo.save returns error', async () => {
    const uc = new CreateIdeaUseCase(
      { save: async () => err(new IdeaRepositoryError('disk full')) },
      { publish: async () => ok(undefined) },
    );
    const result = await uc.execute({ userId: crypto.randomUUID(), text: 'An idea long enough', traceId: 'trace' });
    expect(result.isErr()).toBe(true);
  });

  it('rejects idea with empty text', async () => {
    const uc = new CreateIdeaUseCase(
      { save: async (idea) => ok(idea) },
      { publish: async () => ok(undefined) },
    );
    const result = await uc.execute({ userId: crypto.randomUUID(), text: '', traceId: 'trace' });
    expect(result.isErr()).toBe(true);
  });

  it('rejects idea with whitespace-only text', async () => {
    const uc = new CreateIdeaUseCase(
      { save: async (idea) => ok(idea) },
      { publish: async () => ok(undefined) },
    );
    const result = await uc.execute({ userId: crypto.randomUUID(), text: '     ', traceId: 'trace' });
    expect(result.isErr()).toBe(true);
  });

  it('handles 2000-char idea text without throwing', async () => {
    const uc = new CreateIdeaUseCase(
      { save: async (idea) => ok(idea) },
      { publish: async () => ok(undefined) },
    );
    const text = 'A'.repeat(2000);
    const result = await uc.execute({ userId: crypto.randomUUID(), text, traceId: 'trace' });
    expect(result.isOk()).toBe(true);
  });

  it('concurrent saves do not corrupt each other', async () => {
    const saved: string[] = [];
    const uc = new CreateIdeaUseCase(
      { save: async (idea) => { saved.push(idea.id); return ok(idea); } },
      { publish: async () => ok(undefined) },
    );
    const userId = crypto.randomUUID();
    await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        uc.execute({ userId, text: `Idea number ${i + 1} long enough text`, traceId: `t${i}` })
      )
    );
    expect(saved).toHaveLength(5);
    expect(new Set(saved).size).toBe(5); // all unique IDs
  });
});

// ── RecordOutcomeUseCase ────────────────────────────────────────────────────

describe('chaos: RecordOutcomeUseCase', () => {
  it('returns err when decisionRepo fails', async () => {
    const uc = new RecordOutcomeUseCase(
      { upsert: async (o) => ok(o), findByIdea: async () => ok(null), findByUser: async () => ok([]), findAll: async () => ok([]) },
      { findAllByIdeaId: async () => err(new DecisionRepositoryError('timeout')), findByIdeaId: async () => ok(null) },
    );
    const result = await uc.execute({ ideaId: 'idea-1', userId: 'user-1', outcomeType: 'built_worked', traceId: 'trace' });
    expect(result.isErr()).toBe(true);
  });

  it('returns err when outcomeRepo.upsert fails', async () => {
    const uc = new RecordOutcomeUseCase(
      {
        upsert: async () => err(new DecisionOutcomeRepositoryError('write failed')),
        findByIdea: async () => ok(null),
        findByUser: async () => ok([]),
        findAll: async () => ok([]),
      },
      { findAllByIdeaId: async () => ok([makeDecision()]), findByIdeaId: async () => ok(null) },
    );
    const result = await uc.execute({ ideaId: 'idea-1', userId: 'user-1', outcomeType: 'built_worked', traceId: 'trace' });
    expect(result.isErr()).toBe(true);
  });

  it('concurrent records for same idea do not throw', async () => {
    const calls: string[] = [];
    const uc = new RecordOutcomeUseCase(
      {
        upsert: async (o) => { calls.push(o.ideaId); return ok(o); },
        findByIdea: async () => ok(null),
        findByUser: async () => ok([]),
        findAll: async () => ok([]),
      },
      { findAllByIdeaId: async () => ok([makeDecision({ ideaId: 'shared-idea' })]), findByIdeaId: async () => ok(null) },
    );
    const results = await Promise.all(
      Array.from({ length: 3 }, () =>
        uc.execute({ ideaId: 'shared-idea', userId: 'user-1', outcomeType: 'built_worked', traceId: 'trace' })
      )
    );
    expect(results.every((r) => r.isOk())).toBe(true);
  });
});

// ── GetFlywheelStatsUseCase ─────────────────────────────────────────────────

describe('chaos: GetFlywheelStatsUseCase', () => {
  it('returns err when repo fails', async () => {
    const uc = new GetFlywheelStatsUseCase({
      findAll: async () => err(new DecisionOutcomeRepositoryError('db down')),
      findByIdea: async () => ok(null),
      findByUser: async () => ok([]),
      upsert: async (o) => ok(o),
    });
    const result = await uc.execute();
    expect(result.isErr()).toBe(true);
  });

  it('handles 1000 outcomes without throwing', async () => {
    const outcomes = Array.from({ length: 1000 }, (_, i) =>
      makeOutcome({
        userId: `user-${i % 10}`,
        verdictAtTime: i % 3 === 0 ? 'GO' : i % 3 === 1 ? 'KILL' : 'PIVOT',
        outcomeType: i % 2 === 0 ? 'built_worked' : 'not_built',
      })
    );
    const uc = new GetFlywheelStatsUseCase({
      findAll: async () => ok(outcomes),
      findByIdea: async () => ok(null),
      findByUser: async () => ok([]),
      upsert: async (o) => ok(o),
    });
    const result = await uc.execute();
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().totalOutcomes).toBe(1000);
  });

  it('accuracyRate is null when all outcomes are PIVOT', async () => {
    const outcomes = Array.from({ length: 5 }, () =>
      makeOutcome({ verdictAtTime: 'PIVOT', outcomeType: 'not_built' })
    );
    const uc = new GetFlywheelStatsUseCase({
      findAll: async () => ok(outcomes),
      findByIdea: async () => ok(null),
      findByUser: async () => ok([]),
      upsert: async (o) => ok(o),
    });
    const result = await uc.execute();
    expect(result._unsafeUnwrap().accuracyRate).toBeNull();
  });
});

// ── GetUsersAccuracyReportUseCase ───────────────────────────────────────────

describe('chaos: GetUsersAccuracyReportUseCase', () => {
  it('returns err when repo fails', async () => {
    const uc = new GetUsersAccuracyReportUseCase({
      findAll: async () => err(new DecisionOutcomeRepositoryError('timeout')),
      findByIdea: async () => ok(null),
      findByUser: async () => ok([]),
      upsert: async (o) => ok(o),
    });
    const result = await uc.execute();
    expect(result.isErr()).toBe(true);
  });

  it('handles 500 users each with exactly 3 outcomes', async () => {
    const outcomes = Array.from({ length: 500 * 3 }, (_, i) =>
      makeOutcome({ userId: `user-${Math.floor(i / 3)}` })
    );
    const uc = new GetUsersAccuracyReportUseCase({
      findAll: async () => ok(outcomes),
      findByIdea: async () => ok(null),
      findByUser: async () => ok([]),
      upsert: async (o) => ok(o),
    });
    const result = await uc.execute();
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toHaveLength(500);
  });
});

// ── GetDecisionQueueUseCase ─────────────────────────────────────────────────

const mockIdeaRepo = {
  save: async (idea: { id: string; userId: string; text: string; createdAt: string }) => ok(idea as Parameters<typeof ok>[0]),
  findById: async () => ok(null),
  findByUserId: async () => ok([]),
  findByUserIds: async () => ok([]),
  delete: async () => ok(undefined),
};

const mockDecisionRepo = {
  save: async (d: Decision) => ok(d),
  findByIdeaId: async () => ok(null),
  findAllByIdeaId: async () => ok([]),
};

describe('chaos: GetDecisionQueueUseCase', () => {
  it('returns err when queueRepo fails', async () => {
    const uc = new GetDecisionQueueUseCase(
      {
        upsert: async (i) => ok(i),
        findByUserId: async () => err(new DecisionQueueRepositoryError('connection lost')),
        findAll: async () => ok([]),
        deleteByIdeaId: async () => ok(undefined),
      },
      mockIdeaRepo,
      mockDecisionRepo,
    );
    const result = await uc.execute({ userId: 'user-1', traceId: 'trace' });
    expect(result.isErr()).toBe(true);
  });

  it('returns empty items when user has no queue entries', async () => {
    const uc = new GetDecisionQueueUseCase(
      {
        upsert: async (i) => ok(i),
        findByUserId: async () => ok([]),
        findAll: async () => ok([]),
        deleteByIdeaId: async () => ok(undefined),
      },
      mockIdeaRepo,
      mockDecisionRepo,
    );
    const result = await uc.execute({ userId: 'user-1', traceId: 'trace' });
    expect(result._unsafeUnwrap().items).toEqual([]);
  });
});
