import { describe, it, expect, vi } from 'vitest';
import { ok, err } from 'neverthrow';
import { GetDecisionQueueUseCase } from '../get-decision-queue';
import { DecisionQueueRepositoryError } from '../../ports/decision-queue-repository';
import type { IDecisionQueueRepository } from '../../ports/decision-queue-repository';
import type { IIdeaRepository } from '../../ports/idea-repository';
import type { IDecisionRepository } from '../../ports/decision-repository';
import type { Idea } from '../../domain/idea';
import type { Decision } from '../../domain/decision';
import type { DecisionQueueEntry } from '../../domain/decision-queue';

const makeIdea = (overrides: Partial<Idea> = {}): Idea => ({
  id: 'idea-1',
  userId: 'user-1',
  teamId: null,
  text: 'A SaaS tool for developers',
  niche: 'other',
  createdAt: new Date().toISOString(),
  ...overrides,
});

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

const makeEntry = (overrides: Partial<DecisionQueueEntry> = {}): DecisionQueueEntry => ({
  id: 'qe-1',
  userId: 'user-1',
  ideaId: 'idea-1',
  priorityScore: 0.72,
  lastSignalChange: null,
  changeSummary: 'Competitor failed → opportunity rose',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

function makeDeps(opts: {
  entries?: DecisionQueueEntry[];
  ideas?: Idea[];
  decision?: Decision | null;
} = {}) {
  const entries = opts.entries ?? [makeEntry()];
  const ideas = opts.ideas ?? [makeIdea()];
  const decision = opts.decision !== undefined ? opts.decision : makeDecision();

  const queueRepo: IDecisionQueueRepository = {
    upsert: vi.fn(),
    findByUserId: vi.fn().mockResolvedValue(ok(entries)),
    findByIdeaId: vi.fn(),
  };

  const ideaRepo: IIdeaRepository = {
    save: vi.fn(),
    findById: vi.fn(),
    findByUserId: vi.fn(),
    findByUserIds: vi.fn().mockResolvedValue(ok(ideas)),
    countThisMonth: vi.fn(),
  };

  const decisionRepo: IDecisionRepository = {
    save: vi.fn(),
    findByIdeaId: vi.fn().mockResolvedValue(ok(decision)),
    findAllByIdeaId: vi.fn(),
  };

  return { queueRepo, ideaRepo, decisionRepo };
}

const INPUT = { userId: 'user-1', traceId: 'trace-1' };

describe('GetDecisionQueueUseCase', () => {
  it('returns empty when queue is empty', async () => {
    const { queueRepo, ideaRepo, decisionRepo } = makeDeps({ entries: [] });
    const uc = new GetDecisionQueueUseCase(queueRepo, ideaRepo, decisionRepo);

    const result = await uc.execute(INPUT);

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().items).toHaveLength(0);
  });

  it('enriches queue entry with idea text and verdict', async () => {
    const { queueRepo, ideaRepo, decisionRepo } = makeDeps();
    const uc = new GetDecisionQueueUseCase(queueRepo, ideaRepo, decisionRepo);

    const result = await uc.execute(INPUT);

    expect(result.isOk()).toBe(true);
    const items = result._unsafeUnwrap().items;
    expect(items[0]?.ideaText).toBe('A SaaS tool for developers');
    expect(items[0]?.verdict).toBe('GO');
    expect(items[0]?.confidence).toBe(0.85);
  });

  it('returns null verdict when idea has no decision yet', async () => {
    const { queueRepo, ideaRepo, decisionRepo } = makeDeps({ decision: null });
    const uc = new GetDecisionQueueUseCase(queueRepo, ideaRepo, decisionRepo);

    const result = await uc.execute(INPUT);

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().items[0]?.verdict).toBeNull();
  });

  it('sorts items by priority_score descending', async () => {
    const entries = [
      makeEntry({ id: 'qe-1', ideaId: 'idea-1', priorityScore: 0.4 }),
      makeEntry({ id: 'qe-2', ideaId: 'idea-2', priorityScore: 0.9 }),
      makeEntry({ id: 'qe-3', ideaId: 'idea-3', priorityScore: 0.6 }),
    ];
    const ideas = [
      makeIdea({ id: 'idea-1', text: 'Idea A' }),
      makeIdea({ id: 'idea-2', text: 'Idea B' }),
      makeIdea({ id: 'idea-3', text: 'Idea C' }),
    ];
    const { queueRepo, ideaRepo, decisionRepo } = makeDeps({ entries, ideas });
    const uc = new GetDecisionQueueUseCase(queueRepo, ideaRepo, decisionRepo);

    const result = await uc.execute(INPUT);
    const items = result._unsafeUnwrap().items;

    expect(items[0]?.priorityScore).toBe(0.9);
    expect(items[1]?.priorityScore).toBe(0.6);
    expect(items[2]?.priorityScore).toBe(0.4);
  });

  it('skips orphaned queue entries (deleted ideas)', async () => {
    const entries = [
      makeEntry({ id: 'qe-1', ideaId: 'idea-1' }),
      makeEntry({ id: 'qe-2', ideaId: 'idea-deleted' }), // no matching idea
    ];
    const ideas = [makeIdea({ id: 'idea-1' })];
    const { queueRepo, ideaRepo, decisionRepo } = makeDeps({ entries, ideas });
    const uc = new GetDecisionQueueUseCase(queueRepo, ideaRepo, decisionRepo);

    const result = await uc.execute(INPUT);

    expect(result._unsafeUnwrap().items).toHaveLength(1);
  });

  it('returns error when queue repo fails', async () => {
    const { queueRepo, ideaRepo, decisionRepo } = makeDeps();
    vi.mocked(queueRepo.findByUserId).mockResolvedValueOnce(err(new DecisionQueueRepositoryError('db error')));
    const uc = new GetDecisionQueueUseCase(queueRepo, ideaRepo, decisionRepo);

    const result = await uc.execute(INPUT);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(DecisionQueueRepositoryError);
  });
});
