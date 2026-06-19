import { describe, it, expect, vi } from 'vitest';
import { ok, err } from 'neverthrow';
import { RecordOutcomeUseCase } from '../record-outcome';
import { DecisionOutcomeRepositoryError } from '../../ports/decision-outcome-repository';
import { DecisionRepositoryError } from '../../ports/decision-repository';
import { InvalidVerdictError } from '../../domain/decision-outcome';
import type { IDecisionOutcomeRepository } from '../../ports/decision-outcome-repository';
import type { IDecisionRepository } from '../../ports/decision-repository';
import type { Decision } from '../../domain/decision';
import type { DecisionOutcome } from '../../domain/decision-outcome';

const makeDecision = (overrides: Partial<Decision> = {}): Decision => ({
  id: 'dec-1',
  ideaId: 'idea-1',
  verdict: 'GO',
  reasoning: 'Strong signals',
  confidence: 0.85,
  score: 78,
  signalIds: [],
  dimensions: [],
  createdAt: new Date().toISOString(),
  ...overrides,
});

const makeOutcome = (overrides: Partial<DecisionOutcome> = {}): DecisionOutcome => ({
  id: 'outcome-1',
  ideaId: 'idea-1',
  userId: 'user-1',
  verdictAtTime: 'GO',
  outcomeType: 'built_worked',
  notes: null,
  reportedAt: new Date().toISOString(),
  ...overrides,
});

function makeDeps(opts: { decisions?: Decision[]; saved?: DecisionOutcome } = {}) {
  const decisions = opts.decisions ?? [makeDecision()];
  const saved = opts.saved ?? makeOutcome();

  const outcomeRepo: IDecisionOutcomeRepository = {
    upsert: vi.fn().mockResolvedValue(ok(saved)),
    findByIdea: vi.fn(),
    findByUser: vi.fn(),
    findAll: vi.fn(),
    findCalibrationExamples: vi.fn().mockResolvedValue(ok([])),
  };

  const decisionRepo: IDecisionRepository = {
    save: vi.fn(),
    findByIdeaId: vi.fn(),
    findAllByIdeaId: vi.fn().mockResolvedValue(ok(decisions)),
  };

  return { outcomeRepo, decisionRepo };
}

const BASE_INPUT = {
  ideaId: 'idea-1',
  userId: 'user-1',
  outcomeType: 'built_worked' as const,
  notes: null,
  traceId: 'trace-1',
};

describe('RecordOutcomeUseCase', () => {
  it('records outcome for idea with GO decision', async () => {
    const { outcomeRepo, decisionRepo } = makeDeps();
    const uc = new RecordOutcomeUseCase(outcomeRepo, decisionRepo);

    const result = await uc.execute(BASE_INPUT);

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().outcomeType).toBe('built_worked');
    expect(result._unsafeUnwrap().verdictAtTime).toBe('GO');
  });

  it('uses most recent decision verdict', async () => {
    const older = makeDecision({ id: 'dec-1', verdict: 'KILL', createdAt: '2026-01-01T00:00:00Z' });
    const newer = makeDecision({ id: 'dec-2', verdict: 'GO', createdAt: '2026-03-01T00:00:00Z' });
    const { outcomeRepo, decisionRepo } = makeDeps({ decisions: [older, newer] });
    const uc = new RecordOutcomeUseCase(outcomeRepo, decisionRepo);

    await uc.execute(BASE_INPUT);

    const upsertCall = vi.mocked(outcomeRepo.upsert).mock.calls[0]![0];
    expect(upsertCall.verdictAtTime).toBe('GO');
  });

  it('returns InvalidVerdictError when idea has no decisions', async () => {
    const { outcomeRepo, decisionRepo } = makeDeps({ decisions: [] });
    const uc = new RecordOutcomeUseCase(outcomeRepo, decisionRepo);

    const result = await uc.execute(BASE_INPUT);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(InvalidVerdictError);
  });

  it('propagates decision repository error', async () => {
    const { outcomeRepo, decisionRepo } = makeDeps();
    vi.mocked(decisionRepo.findAllByIdeaId).mockResolvedValueOnce(err(new DecisionRepositoryError('db error')));
    const uc = new RecordOutcomeUseCase(outcomeRepo, decisionRepo);

    const result = await uc.execute(BASE_INPUT);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(DecisionRepositoryError);
  });

  it('propagates outcome repository error on upsert', async () => {
    const { outcomeRepo, decisionRepo } = makeDeps();
    vi.mocked(outcomeRepo.upsert).mockResolvedValueOnce(err(new DecisionOutcomeRepositoryError('db write failed')));
    const uc = new RecordOutcomeUseCase(outcomeRepo, decisionRepo);

    const result = await uc.execute(BASE_INPUT);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(DecisionOutcomeRepositoryError);
  });

  it('saves notes when provided', async () => {
    const { outcomeRepo, decisionRepo } = makeDeps();
    const uc = new RecordOutcomeUseCase(outcomeRepo, decisionRepo);

    await uc.execute({ ...BASE_INPUT, notes: 'Got 100 signups' });

    const upsertCall = vi.mocked(outcomeRepo.upsert).mock.calls[0]![0];
    expect(upsertCall.notes).toBe('Got 100 signups');
  });
});
