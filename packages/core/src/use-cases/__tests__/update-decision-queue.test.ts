import { describe, it, expect, vi } from 'vitest';
import { ok, err } from 'neverthrow';
import { UpdateDecisionQueueUseCase } from '../update-decision-queue';
import { IdeaRepositoryError } from '../../ports/idea-repository';
import { DecisionQueueRepositoryError } from '../../ports/decision-queue-repository';
import { LLMClientError } from '../../ports/llm-client';
import type { IIdeaRepository } from '../../ports/idea-repository';
import type { IDecisionRepository } from '../../ports/decision-repository';
import type { IDecisionQueueRepository } from '../../ports/decision-queue-repository';
import type { ILLMClient } from '../../ports/llm-client';
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

const makeQueueEntry = (overrides: Partial<DecisionQueueEntry> = {}): DecisionQueueEntry => ({
  id: 'qe-1',
  userId: 'user-1',
  ideaId: 'idea-1',
  priorityScore: 0.5,
  lastSignalChange: null,
  changeSummary: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

function makeDeps(opts: {
  ideas?: Idea[];
  decision?: Decision | null;
  existing?: DecisionQueueEntry | null;
} = {}) {
  const ideas = opts.ideas ?? [makeIdea()];
  const decision = opts.decision !== undefined ? opts.decision : makeDecision();
  const existing = opts.existing !== undefined ? opts.existing : null;

  const ideaRepo: IIdeaRepository = {
    save: vi.fn(),
    saveWithEvent: vi.fn().mockImplementation((i) => Promise.resolve(ok(i))),
    findById: vi.fn(),
    findByUserId: vi.fn().mockResolvedValue(ok(ideas)),
    findByUserIds: vi.fn(),
    findByUserIdPaginated: vi.fn(),
    findByTeamId: vi.fn().mockResolvedValue(ok([])),
    countThisMonth: vi.fn(),
    delete: vi.fn().mockResolvedValue(ok(undefined)),
  };

  const decisionRepo: IDecisionRepository = {
    save: vi.fn(),
    findByIdeaId: vi.fn().mockResolvedValue(ok(decision)),
    findAllByIdeaId: vi.fn(),
  };

  const queueRepo: IDecisionQueueRepository = {
    upsert: vi.fn().mockImplementation((e: DecisionQueueEntry) => Promise.resolve(ok(e))),
    findByUserId: vi.fn(),
    findByIdeaId: vi.fn().mockResolvedValue(ok(existing)),
  };

  const llmClient: ILLMClient = {
    generateSearchQueries: vi.fn(),
    scoreSignalRelevance: vi.fn(),
    generateDecision: vi.fn(),
    generateSimulation: vi.fn(),
    generateLanding: vi.fn(),
    analyzeCustomers: vi.fn(),
    analyzeBuild: vi.fn(),
    analyzeCompetitors: vi.fn(),
    chatWithOtto: vi.fn(),
    generateLaunchKit: vi.fn(),
    generatePriorityExplanation: vi.fn().mockResolvedValue(ok({ explanation: 'Competitor failed → opportunity rose' })),
    analyzeFeatures: vi.fn(),
    generateBattlecard: vi.fn(),
  };

  return { ideaRepo, decisionRepo, queueRepo, llmClient };
}

const INPUT = { userId: 'user-1', traceId: 'trace-1' };

describe('UpdateDecisionQueueUseCase', () => {
  it('returns empty entries when user has no ideas', async () => {
    const { ideaRepo, decisionRepo, queueRepo, llmClient } = makeDeps({ ideas: [] });
    const uc = new UpdateDecisionQueueUseCase(ideaRepo, decisionRepo, queueRepo, llmClient);

    const result = await uc.execute(INPUT);

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().entries).toHaveLength(0);
  });

  it('upserts one entry per idea', async () => {
    const { ideaRepo, decisionRepo, queueRepo, llmClient } = makeDeps();
    const uc = new UpdateDecisionQueueUseCase(ideaRepo, decisionRepo, queueRepo, llmClient);

    const result = await uc.execute(INPUT);

    expect(result.isOk()).toBe(true);
    expect(queueRepo.upsert).toHaveBeenCalledTimes(1);
  });

  it('computes higher score for GO verdict than KILL', async () => {
    const { ideaRepo, decisionRepo, queueRepo, llmClient } = makeDeps({ decision: makeDecision({ verdict: 'GO' }) });
    const uc = new UpdateDecisionQueueUseCase(ideaRepo, decisionRepo, queueRepo, llmClient);
    const goResult = await uc.execute(INPUT);
    const goScore = (goResult._unsafeUnwrap().entries[0] as DecisionQueueEntry).priorityScore;

    const deps2 = makeDeps({ decision: makeDecision({ verdict: 'KILL' }) });
    const uc2 = new UpdateDecisionQueueUseCase(deps2.ideaRepo, deps2.decisionRepo, deps2.queueRepo, deps2.llmClient);
    const killResult = await uc2.execute(INPUT);
    const killScore = (killResult._unsafeUnwrap().entries[0] as DecisionQueueEntry).priorityScore;

    expect(goScore).toBeGreaterThan(killScore);
  });

  it('calls LLM when score shifts >20%', async () => {
    const { ideaRepo, decisionRepo, queueRepo, llmClient } = makeDeps({
      existing: makeQueueEntry({ priorityScore: 0.1 }), // low score
      decision: makeDecision({ verdict: 'GO', confidence: 1.0, score: 100 }), // will produce ~0.86
    });
    const uc = new UpdateDecisionQueueUseCase(ideaRepo, decisionRepo, queueRepo, llmClient);

    await uc.execute(INPUT);

    expect(llmClient.generatePriorityExplanation).toHaveBeenCalled();
  });

  it('does not call LLM when score shift is small', async () => {
    const { ideaRepo, decisionRepo, queueRepo, llmClient } = makeDeps({
      existing: makeQueueEntry({ priorityScore: 0.69 }), // close to computed ~0.70
      decision: makeDecision({ verdict: 'GO', confidence: 0.85, score: 78 }),
    });
    const uc = new UpdateDecisionQueueUseCase(ideaRepo, decisionRepo, queueRepo, llmClient);

    await uc.execute(INPUT);

    expect(llmClient.generatePriorityExplanation).not.toHaveBeenCalled();
  });

  it('proceeds without LLM explanation when LLM fails (non-blocking)', async () => {
    const { ideaRepo, decisionRepo, queueRepo, llmClient } = makeDeps({
      existing: makeQueueEntry({ priorityScore: 0.1 }),
      decision: makeDecision({ verdict: 'GO', confidence: 1.0, score: 100 }),
    });
    vi.mocked(llmClient.generatePriorityExplanation).mockResolvedValueOnce(err(new LLMClientError('timeout')));
    const uc = new UpdateDecisionQueueUseCase(ideaRepo, decisionRepo, queueRepo, llmClient);

    const result = await uc.execute(INPUT);

    expect(result.isOk()).toBe(true);
    expect(queueRepo.upsert).toHaveBeenCalled();
  });

  it('returns error when idea repo fails', async () => {
    const { ideaRepo, decisionRepo, queueRepo, llmClient } = makeDeps();
    vi.mocked(ideaRepo.findByUserId).mockResolvedValueOnce(err(new IdeaRepositoryError('db error')));
    const uc = new UpdateDecisionQueueUseCase(ideaRepo, decisionRepo, queueRepo, llmClient);

    const result = await uc.execute(INPUT);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(IdeaRepositoryError);
  });

  it('returns error when queue repo upsert fails', async () => {
    const { ideaRepo, decisionRepo, queueRepo, llmClient } = makeDeps();
    vi.mocked(queueRepo.upsert).mockResolvedValueOnce(err(new DecisionQueueRepositoryError('write failed')));
    const uc = new UpdateDecisionQueueUseCase(ideaRepo, decisionRepo, queueRepo, llmClient);

    const result = await uc.execute(INPUT);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(DecisionQueueRepositoryError);
  });

  it('counts significant changes correctly', async () => {
    const ideas = [makeIdea({ id: 'i1' }), makeIdea({ id: 'i2', text: 'Another idea' })];
    const { ideaRepo, decisionRepo, queueRepo, llmClient } = makeDeps({ ideas });
    // Both ideas have big score shift
    vi.mocked(queueRepo.findByIdeaId).mockResolvedValue(ok(makeQueueEntry({ priorityScore: 0.1 })));
    vi.mocked(decisionRepo.findByIdeaId).mockResolvedValue(ok(makeDecision({ verdict: 'GO', confidence: 1.0, score: 100 })));
    const uc = new UpdateDecisionQueueUseCase(ideaRepo, decisionRepo, queueRepo, llmClient);

    const result = await uc.execute(INPUT);

    expect(result._unsafeUnwrap().significantChanges).toBe(2);
  });
});
