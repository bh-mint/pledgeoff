import { describe, it, expect } from 'vitest';
import { ok, err } from 'neverthrow';
import { GetUsersAccuracyReportUseCase } from '../get-users-accuracy-report';
import { DecisionOutcome } from '../../domain/decision-outcome';
import { DecisionOutcomeRepositoryError } from '../../ports/decision-outcome-repository';

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

const makeRepo = (outcomes: DecisionOutcome[]) => ({
  findAll: async () => ok(outcomes),
  findByIdea: async () => ok(null),
  findByUser: async () => ok([]),
  upsert: async (o: DecisionOutcome) => ok(o),
});

const makeErrRepo = () => ({
  findAll: async () => err(new DecisionOutcomeRepositoryError('db error')),
  findByIdea: async () => ok(null),
  findByUser: async () => ok([]),
  upsert: async (o: DecisionOutcome) => ok(o),
});

describe('GetUsersAccuracyReportUseCase', () => {
  it('returns empty array when no outcomes exist', async () => {
    const uc = new GetUsersAccuracyReportUseCase(makeRepo([]));
    const result = await uc.execute();
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual([]);
  });

  it('excludes users with fewer than 3 outcomes', async () => {
    const outcomes = [
      makeOutcome({ userId: 'user-1' }),
      makeOutcome({ userId: 'user-1' }),
      makeOutcome({ userId: 'user-2' }),
      makeOutcome({ userId: 'user-2' }),
    ];
    const uc = new GetUsersAccuracyReportUseCase(makeRepo(outcomes));
    const result = await uc.execute();
    expect(result._unsafeUnwrap()).toEqual([]);
  });

  it('includes users with exactly 3 outcomes', async () => {
    const outcomes = [
      makeOutcome({ userId: 'user-1' }),
      makeOutcome({ userId: 'user-1' }),
      makeOutcome({ userId: 'user-1' }),
    ];
    const uc = new GetUsersAccuracyReportUseCase(makeRepo(outcomes));
    const result = await uc.execute();
    const reports = result._unsafeUnwrap();
    expect(reports).toHaveLength(1);
    expect(reports[0]?.userId).toBe('user-1');
  });

  it('returns separate reports per user', async () => {
    const outcomes = [
      ...Array.from({ length: 3 }, () => makeOutcome({ userId: 'user-a' })),
      ...Array.from({ length: 4 }, () => makeOutcome({ userId: 'user-b' })),
    ];
    const uc = new GetUsersAccuracyReportUseCase(makeRepo(outcomes));
    const result = await uc.execute();
    const reports = result._unsafeUnwrap();
    expect(reports).toHaveLength(2);
    const userIds = reports.map((r) => r.userId).sort();
    expect(userIds).toEqual(['user-a', 'user-b']);
  });

  it('computes correct accuracy per user', async () => {
    const outcomes = [
      makeOutcome({ userId: 'user-1', verdictAtTime: 'GO', outcomeType: 'built_worked' }),
      makeOutcome({ userId: 'user-1', verdictAtTime: 'GO', outcomeType: 'built_worked' }),
      makeOutcome({ userId: 'user-1', verdictAtTime: 'KILL', outcomeType: 'built_failed' }),
    ];
    const uc = new GetUsersAccuracyReportUseCase(makeRepo(outcomes));
    const result = await uc.execute();
    const reports = result._unsafeUnwrap();
    expect(reports[0]?.stats.accuracyRate).toBe(67); // 2/3 correct
  });

  it('propagates repository errors', async () => {
    const uc = new GetUsersAccuracyReportUseCase(makeErrRepo());
    const result = await uc.execute();
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toBe('db error');
  });
});
