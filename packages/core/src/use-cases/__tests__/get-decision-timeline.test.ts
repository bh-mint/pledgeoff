import { describe, it, expect, vi } from 'vitest';
import { ok, err } from 'neverthrow';
import { GetDecisionTimelineUseCase } from '../get-decision-timeline';
import { type IIdeaRepository } from '../../ports/idea-repository';
import { DecisionRepositoryError, type IDecisionRepository } from '../../ports/decision-repository';
import { FeedbackRepositoryError, type IFeedbackRepository } from '../../ports/feedback-repository';
import type { Idea } from '../../domain/idea';
import type { Decision } from '../../domain/decision';
import type { Feedback } from '../../domain/feedback';

const userId = crypto.randomUUID();
const ideaId = crypto.randomUUID();

function makeIdea(overrides: Partial<Idea> = {}): Idea {
  return {
    id: ideaId,
    userId,
    text: 'A great idea for testing',
    niche: 'other',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeDecision(overrides: Partial<Decision> = {}): Decision {
  return {
    id: crypto.randomUUID(),
    ideaId,
    verdict: 'GO',
    reasoning: 'Strong demand signals detected',
    confidence: 0.82,
    score: 74,
    signalIds: [crypto.randomUUID()],
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeIdeaRepo(idea: Idea | null = makeIdea()): IIdeaRepository {
  return {
    save: vi.fn(),
    saveWithEvent: vi.fn().mockImplementation((i) => Promise.resolve(ok(i))),
    findById: vi.fn().mockResolvedValue(ok(idea)),
    findByUserId: vi.fn(),
    findByUserIds: vi.fn(),
    findByUserIdPaginated: vi.fn(),
    findByTeamId: vi.fn().mockResolvedValue(ok([])),
    countThisMonth: vi.fn(),
    delete: vi.fn().mockResolvedValue(ok(undefined)),
  };
}

function makeDecisionRepo(decisions: Decision[] = []): IDecisionRepository {
  return {
    save: vi.fn(),
    findByIdeaId: vi.fn(),
    findAllByIdeaId: vi.fn().mockResolvedValue(ok(decisions)),
  };
}

function makeFeedbackRepo(feedbackMap: Record<string, Feedback[]> = {}): IFeedbackRepository {
  return {
    save: vi.fn(),
    findByDecisionId: vi.fn().mockImplementation((id: string) =>
      Promise.resolve(ok(feedbackMap[id] ?? [])),
    ),
  };
}

const baseInput = { ideaId, userId, traceId: crypto.randomUUID() };

describe('GetDecisionTimelineUseCase', () => {
  it('returns empty entries when no decisions exist', async () => {
    const uc = new GetDecisionTimelineUseCase(
      makeIdeaRepo(),
      makeDecisionRepo([]),
      makeFeedbackRepo(),
    );
    const result = await uc.execute(baseInput);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.entries).toHaveLength(0);
      expect(result.value.ideaId).toBe(ideaId);
    }
  });

  it('returns single entry with no delta for first decision', async () => {
    const decision = makeDecision();
    const uc = new GetDecisionTimelineUseCase(
      makeIdeaRepo(),
      makeDecisionRepo([decision]),
      makeFeedbackRepo(),
    );
    const result = await uc.execute(baseInput);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.entries).toHaveLength(1);
      expect(result.value.entries[0]!.delta).toBeNull();
      expect(result.value.entries[0]!.decision.verdict).toBe('GO');
    }
  });

  it('computes delta between consecutive decisions', async () => {
    const d1 = makeDecision({ verdict: 'KILL', confidence: 0.4, score: 30, createdAt: '2026-01-01T00:00:00.000Z' });
    const d2 = makeDecision({ verdict: 'GO',   confidence: 0.8, score: 75, createdAt: '2026-01-02T00:00:00.000Z' });
    const uc = new GetDecisionTimelineUseCase(
      makeIdeaRepo(),
      makeDecisionRepo([d1, d2]),
      makeFeedbackRepo(),
    );
    const result = await uc.execute(baseInput);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const delta = result.value.entries[1]!.delta;
      expect(delta).not.toBeNull();
      expect(delta!.verdictChanged).toBe(true);
      expect(delta!.previousVerdict).toBe('KILL');
      expect(delta!.scoreDelta).toBe(45);
      expect(delta!.confidenceDelta).toBeCloseTo(0.4);
    }
  });

  it('counts feedback per decision', async () => {
    const decision = makeDecision();
    const thumbsUp: Feedback = { id: crypto.randomUUID(), ideaId, decisionId: decision.id, userId, vote: 'thumbs_up', createdAt: new Date().toISOString() };
    const thumbsDown: Feedback = { id: crypto.randomUUID(), ideaId, decisionId: decision.id, userId, vote: 'thumbs_down', createdAt: new Date().toISOString() };
    const uc = new GetDecisionTimelineUseCase(
      makeIdeaRepo(),
      makeDecisionRepo([decision]),
      makeFeedbackRepo({ [decision.id]: [thumbsUp, thumbsDown] }),
    );
    const result = await uc.execute(baseInput);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.entries[0]!.feedbackCounts.thumbsUp).toBe(1);
      expect(result.value.entries[0]!.feedbackCounts.thumbsDown).toBe(1);
    }
  });

  it('returns error when idea not found', async () => {
    const uc = new GetDecisionTimelineUseCase(
      makeIdeaRepo(null),
      makeDecisionRepo(),
      makeFeedbackRepo(),
    );
    const result = await uc.execute(baseInput);
    expect(result.isErr()).toBe(true);
  });

  it('returns error when user does not own the idea', async () => {
    const otherUserId = crypto.randomUUID();
    const uc = new GetDecisionTimelineUseCase(
      makeIdeaRepo(makeIdea({ userId: otherUserId })),
      makeDecisionRepo(),
      makeFeedbackRepo(),
    );
    const result = await uc.execute(baseInput);
    expect(result.isErr()).toBe(true);
  });

  it('returns decision repo error', async () => {
    const repoErr = new DecisionRepositoryError('DB error');
    const decisionRepo = makeDecisionRepo();
    decisionRepo.findAllByIdeaId = vi.fn().mockResolvedValue(err(repoErr));
    const uc = new GetDecisionTimelineUseCase(makeIdeaRepo(), decisionRepo, makeFeedbackRepo());
    const result = await uc.execute(baseInput);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error).toBeInstanceOf(DecisionRepositoryError);
  });

  it('returns feedback repo error', async () => {
    const decision = makeDecision();
    const fbErr = new FeedbackRepositoryError('DB error');
    const feedbackRepo = makeFeedbackRepo();
    feedbackRepo.findByDecisionId = vi.fn().mockResolvedValue(err(fbErr));
    const uc = new GetDecisionTimelineUseCase(
      makeIdeaRepo(),
      makeDecisionRepo([decision]),
      feedbackRepo,
    );
    const result = await uc.execute(baseInput);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error).toBeInstanceOf(FeedbackRepositoryError);
  });
});
