import { describe, it, expect, vi } from 'vitest';
import { ok, err } from 'neverthrow';
import { DecideUseCase } from '../decide';
import { LLMClientError } from '../../ports/llm-client';
import { SignalRepositoryError } from '../../ports/signal-repository';
import { InvalidDecisionError } from '../../domain/decision';
import type { ISignalRepository } from '../../ports/signal-repository';
import type { IDecisionRepository } from '../../ports/decision-repository';
import type { ILLMClient, LLMDecisionResponse, CalibrationExample } from '../../ports/llm-client';
import type { IEventBus } from '../../ports/event-bus';
import type { IIdempotencyStore } from '../../ports/idempotency-store';
import type { IDecisionOutcomeRepository } from '../../ports/decision-outcome-repository';
import type { Signal } from '../../domain/signal';

const ideaId = crypto.randomUUID();

const makeSignal = (): Signal => ({
  id: crypto.randomUUID(),
  ideaId,
  source: 'reddit',
  url: 'https://reddit.com/r/startups/comments/abc',
  title: 'People want this',
  summary: 'Strong interest',
  sentiment: 'positive',
  fetchedAt: new Date().toISOString(),
});

const llmResponse: LLMDecisionResponse = {
  verdict: 'GO',
  reasoning: 'Strong market demand and technical feasibility confirmed.',
  confidence: 0.87,
};

function makeSignalRepo(signals: Signal[] = [makeSignal()]): ISignalRepository {
  return {
    upsertMany: vi.fn(),
    findByIdeaId: vi.fn().mockResolvedValue(ok(signals)),
    findTopByEmbedding: vi.fn(),
    saveEmbeddings: vi.fn().mockResolvedValue(ok(undefined)),
  };
}

function makeDecisionRepo(): IDecisionRepository {
  return {
    save: vi.fn().mockImplementation((d) => Promise.resolve(ok(d))),
    findByIdeaId: vi.fn().mockResolvedValue(ok(null)),
    findAllByIdeaId: vi.fn().mockResolvedValue(ok([])),
  };
}

function makeLLMClient(response = llmResponse): ILLMClient {
  return {
    generateSearchQueries: vi.fn(),
    scoreSignalRelevance: vi.fn(),
    generateDecision: vi.fn().mockResolvedValue(ok(response)),
    generateSimulation: vi.fn(),
    generateLanding: vi.fn(),
    analyzeCustomers: vi.fn(), analyzeBuild: vi.fn(), analyzeCompetitors: vi.fn(),
    chatWithOtto: vi.fn(),
    generateLaunchKit: vi.fn(),
    generatePriorityExplanation: vi.fn(),
    analyzeFeatures: vi.fn(),
    generateBattlecard: vi.fn(),
    generateMarketLandscape: vi.fn(), generateInterviewGuide: vi.fn(), analyzeTranscript: vi.fn(),
  };
}

function makeEventBus(): IEventBus {
  return { publish: vi.fn().mockResolvedValue(ok(undefined)), subscribe: vi.fn() };
}

function makeIdempotencyStore(processed = false): IIdempotencyStore {
  return {
    hasBeenProcessed: vi.fn().mockResolvedValue(ok(processed)),
    markAsProcessed: vi.fn().mockResolvedValue(ok(undefined)),
  };
}

function makeOutcomeRepo(examples: CalibrationExample[] = []): IDecisionOutcomeRepository {
  return {
    upsert: vi.fn(),
    findByIdea: vi.fn(),
    findByUser: vi.fn(),
    findAll: vi.fn(),
    findCalibrationExamples: vi.fn().mockResolvedValue(ok(examples)),
  };
}

const baseInput = {
  ideaId,
  ideaText: 'An interesting app idea for the market',
  traceId: crypto.randomUUID(),
  eventId: crypto.randomUUID(),
};

describe('DecideUseCase', () => {
  it('generates and persists a decision, publishes event', async () => {
    const useCase = new DecideUseCase(
      makeSignalRepo(),
      makeDecisionRepo(),
      makeLLMClient(),
      makeEventBus(),
      makeIdempotencyStore(false),
    );

    const result = await useCase.execute(baseInput);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.verdict).toBe('GO');
      expect(result.value.ideaId).toBe(ideaId);
      expect(result.value.confidence).toBe(0.87);
    }
  });

  it('returns LLM error when LLM call fails', async () => {
    const llmError = new LLMClientError('LLM timeout');
    const useCase = new DecideUseCase(
      makeSignalRepo(),
      makeDecisionRepo(),
      { generateSearchQueries: vi.fn(), scoreSignalRelevance: vi.fn(), generateDecision: vi.fn().mockResolvedValue(err(llmError)), generateSimulation: vi.fn(), generateLanding: vi.fn(), analyzeCustomers: vi.fn(), analyzeBuild: vi.fn(), analyzeCompetitors: vi.fn(), chatWithOtto: vi.fn(), generateLaunchKit: vi.fn(), generatePriorityExplanation: vi.fn(), analyzeFeatures: vi.fn(), generateBattlecard: vi.fn(), generateMarketLandscape: vi.fn(), generateInterviewGuide: vi.fn(), analyzeTranscript: vi.fn() },
      makeEventBus(),
      makeIdempotencyStore(false),
    );

    const result = await useCase.execute(baseInput);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(LLMClientError);
    }
  });

  it('returns signal repository error when signals fetch fails', async () => {
    const signalError = new SignalRepositoryError('DB error');
    const useCase = new DecideUseCase(
      { upsertMany: vi.fn(), findByIdeaId: vi.fn().mockResolvedValue(err(signalError)), findTopByEmbedding: vi.fn(), saveEmbeddings: vi.fn() },
      makeDecisionRepo(),
      makeLLMClient(),
      makeEventBus(),
      makeIdempotencyStore(false),
    );

    const result = await useCase.execute(baseInput);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(SignalRepositoryError);
    }
  });

  it('returns InvalidDecisionError when dimensions are missing expected names', async () => {
    const badDimensions = [
      { name: 'Wrong Dim 1', weight: 0.5, score: 70 },
      { name: 'Wrong Dim 2', weight: 0.5, score: 60 },
    ];
    const llm = makeLLMClient({ ...llmResponse, dimensions: badDimensions });
    const useCase = new DecideUseCase(
      makeSignalRepo(), makeDecisionRepo(), llm, makeEventBus(), makeIdempotencyStore(false),
    );

    const result = await useCase.execute(baseInput);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error).toBeInstanceOf(InvalidDecisionError);
  });

  it('returns InvalidDecisionError when dimension weights do not sum to 1', async () => {
    const badDimensions = [
      { name: 'Market Demand', weight: 0.60, score: 80 },
      { name: 'Competition',   weight: 0.60, score: 70 },
      { name: 'Feasibility',   weight: 0.20, score: 75 },
      { name: 'Timing',        weight: 0.15, score: 65 },
    ];
    const llm = makeLLMClient({ ...llmResponse, dimensions: badDimensions });
    const useCase = new DecideUseCase(
      makeSignalRepo(), makeDecisionRepo(), llm, makeEventBus(), makeIdempotencyStore(false),
    );

    const result = await useCase.execute(baseInput);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error).toBeInstanceOf(InvalidDecisionError);
  });

  it('accepts valid dimensions and computes score', async () => {
    const goodDimensions = [
      { name: 'Market Demand', weight: 0.40, score: 80 },
      { name: 'Competition',   weight: 0.25, score: 70 },
      { name: 'Feasibility',   weight: 0.20, score: 90 },
      { name: 'Timing',        weight: 0.15, score: 75 },
    ];
    const llm = makeLLMClient({ ...llmResponse, dimensions: goodDimensions });
    const useCase = new DecideUseCase(
      makeSignalRepo(), makeDecisionRepo(), llm, makeEventBus(), makeIdempotencyStore(false),
    );

    const result = await useCase.execute(baseInput);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.score).toBeDefined();
      expect(result.value.dimensions).toHaveLength(4);
    }
  });

  it('publishes decision.ready.v1 event with correct payload', async () => {
    const bus = makeEventBus();
    const useCase = new DecideUseCase(
      makeSignalRepo(),
      makeDecisionRepo(),
      makeLLMClient(),
      bus,
      makeIdempotencyStore(false),
    );

    await useCase.execute(baseInput);

    expect(bus.publish).toHaveBeenCalledWith('decision.ready.v1', expect.objectContaining({
      eventType: 'decision.ready.v1',
      payload: expect.objectContaining({ ideaId, verdict: 'GO' }),
    }));
  });

  it('calls generateDecision without calibrationExamples when outcomeRepo returns 0 examples', async () => {
    const llm = makeLLMClient();
    const outcomeRepo = makeOutcomeRepo([]);  // empty — no calibration
    const useCase = new DecideUseCase(
      makeSignalRepo(),
      makeDecisionRepo(),
      llm,
      makeEventBus(),
      makeIdempotencyStore(false),
      undefined,
      outcomeRepo,
    );

    const result = await useCase.execute(baseInput);

    expect(result.isOk()).toBe(true);
    expect(llm.generateDecision).toHaveBeenCalledWith(
      expect.objectContaining({ calibrationExamples: undefined }),
    );
  });

  it('injects calibrationExamples into generateDecision when outcomeRepo returns examples', async () => {
    const examples: CalibrationExample[] = [
      { ideaText: 'App for dog walkers', verdict: 'GO', outcome: 'built_worked', reasoning: 'Strong demand in niche.' },
      { ideaText: 'Blockchain for dentists', verdict: 'KILL', outcome: 'not_built', reasoning: 'No real need found.' },
    ];
    const llm = makeLLMClient();
    const outcomeRepo = makeOutcomeRepo(examples);
    const useCase = new DecideUseCase(
      makeSignalRepo(),
      makeDecisionRepo(),
      llm,
      makeEventBus(),
      makeIdempotencyStore(false),
      undefined,
      outcomeRepo,
    );

    const result = await useCase.execute(baseInput);

    expect(result.isOk()).toBe(true);
    expect(outcomeRepo.findCalibrationExamples).toHaveBeenCalledWith(3);
    expect(llm.generateDecision).toHaveBeenCalledWith(
      expect.objectContaining({ calibrationExamples: examples }),
    );
  });

  it('injects loss pattern example with lostToCompetitor when outcomeRepo returns built_failed outcome', async () => {
    const examples: CalibrationExample[] = [
      {
        ideaText: 'AI coding tool for startups',
        verdict: 'GO',
        outcome: 'built_failed',
        reasoning: 'Signals were positive but market too competitive.',
        lostToCompetitor: 'GitHub Copilot',
      },
    ];
    const llm = makeLLMClient();
    const outcomeRepo = makeOutcomeRepo(examples);
    const useCase = new DecideUseCase(
      makeSignalRepo(),
      makeDecisionRepo(),
      llm,
      makeEventBus(),
      makeIdempotencyStore(false),
      undefined,
      outcomeRepo,
    );

    const result = await useCase.execute(baseInput);

    expect(result.isOk()).toBe(true);
    expect(llm.generateDecision).toHaveBeenCalledWith(
      expect.objectContaining({
        calibrationExamples: expect.arrayContaining([
          expect.objectContaining({ lostToCompetitor: 'GitHub Copilot', outcome: 'built_failed' }),
        ]),
      }),
    );
  });
});
