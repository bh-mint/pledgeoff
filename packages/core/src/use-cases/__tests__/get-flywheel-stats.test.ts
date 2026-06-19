import { describe, it, expect, vi } from 'vitest';
import { ok, err } from 'neverthrow';
import { GetFlywheelStatsUseCase } from '../get-flywheel-stats';
import { DecisionOutcomeRepositoryError } from '../../ports/decision-outcome-repository';
import type { IDecisionOutcomeRepository } from '../../ports/decision-outcome-repository';
import type { DecisionOutcome } from '../../domain/decision-outcome';

const makeOutcome = (overrides: Partial<DecisionOutcome>): DecisionOutcome => ({
  id: crypto.randomUUID(),
  ideaId: 'idea-1',
  userId: 'user-1',
  verdictAtTime: 'GO',
  outcomeType: 'built_worked',
  notes: null,
  reportedAt: '2026-03-15T00:00:00Z',
  ...overrides,
});

function makeRepo(outcomes: DecisionOutcome[]): IDecisionOutcomeRepository {
  return {
    upsert: vi.fn(),
    findByIdea: vi.fn(),
    findByUser: vi.fn(),
    findAll: vi.fn().mockResolvedValue(ok(outcomes)),
    findCalibrationExamples: vi.fn().mockResolvedValue(ok([])),
  };
}

describe('GetFlywheelStatsUseCase', () => {
  it('returns null accuracy when fewer than 3 outcomes', async () => {
    const repo = makeRepo([makeOutcome({ verdictAtTime: 'GO', outcomeType: 'built_worked' })]);
    const uc = new GetFlywheelStatsUseCase(repo);

    const result = await uc.execute();

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().accuracyRate).toBeNull();
  });

  it('calculates 100% accuracy when all GO→built_worked', async () => {
    const outcomes = [
      makeOutcome({ verdictAtTime: 'GO', outcomeType: 'built_worked' }),
      makeOutcome({ verdictAtTime: 'GO', outcomeType: 'built_worked' }),
      makeOutcome({ verdictAtTime: 'GO', outcomeType: 'built_worked' }),
    ];
    const uc = new GetFlywheelStatsUseCase(makeRepo(outcomes));

    const result = await uc.execute();

    expect(result._unsafeUnwrap().accuracyRate).toBe(100);
  });

  it('calculates 50% accuracy for mixed outcomes', async () => {
    const outcomes = [
      makeOutcome({ verdictAtTime: 'GO', outcomeType: 'built_worked' }),
      makeOutcome({ verdictAtTime: 'GO', outcomeType: 'built_failed' }),
      makeOutcome({ verdictAtTime: 'KILL', outcomeType: 'not_built' }),
      makeOutcome({ verdictAtTime: 'KILL', outcomeType: 'built_worked' }),
    ];
    const uc = new GetFlywheelStatsUseCase(makeRepo(outcomes));

    const result = await uc.execute();

    // 2 correct (GO+built_worked, KILL+not_built) / 4 measurable = 50%
    expect(result._unsafeUnwrap().accuracyRate).toBe(50);
  });

  it('counts byVerdict correctly', async () => {
    const outcomes = [
      makeOutcome({ verdictAtTime: 'GO', outcomeType: 'built_worked' }),
      makeOutcome({ verdictAtTime: 'GO', outcomeType: 'built_failed' }),
      makeOutcome({ verdictAtTime: 'KILL', outcomeType: 'not_built' }),
      makeOutcome({ verdictAtTime: 'PIVOT', outcomeType: 'built_failed' }),
    ];
    const uc = new GetFlywheelStatsUseCase(makeRepo(outcomes));

    const { byVerdict } = (await uc.execute())._unsafeUnwrap();

    expect(byVerdict.GO.total).toBe(2);
    expect(byVerdict.GO.correct).toBe(1);
    expect(byVerdict.KILL.total).toBe(1);
    expect(byVerdict.KILL.correct).toBe(1);
    expect(byVerdict.PIVOT.total_reported).toBe(1);
  });

  it('returns error when repo fails', async () => {
    const repo: IDecisionOutcomeRepository = {
      upsert: vi.fn(),
      findByIdea: vi.fn(),
      findByUser: vi.fn(),
      findAll: vi.fn().mockResolvedValue(err(new DecisionOutcomeRepositoryError('db error'))),
      findCalibrationExamples: vi.fn().mockResolvedValue(ok([])),
    };
    const uc = new GetFlywheelStatsUseCase(repo);

    const result = await uc.execute();

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(DecisionOutcomeRepositoryError);
  });

  it('builds accuracy trend by month', async () => {
    const outcomes = [
      makeOutcome({ verdictAtTime: 'GO', outcomeType: 'built_worked', reportedAt: '2026-01-10T00:00:00Z' }),
      makeOutcome({ verdictAtTime: 'GO', outcomeType: 'built_failed', reportedAt: '2026-02-15T00:00:00Z' }),
      makeOutcome({ verdictAtTime: 'GO', outcomeType: 'built_worked', reportedAt: '2026-02-20T00:00:00Z' }),
    ];
    const uc = new GetFlywheelStatsUseCase(makeRepo(outcomes));

    const { accuracyTrend } = (await uc.execute())._unsafeUnwrap();

    expect(accuracyTrend).toHaveLength(2);
    expect(accuracyTrend[0]!.month).toBe('2026-01');
    expect(accuracyTrend[0]!.rate).toBe(100);
    expect(accuracyTrend[1]!.month).toBe('2026-02');
    expect(accuracyTrend[1]!.rate).toBe(50);
  });
});
