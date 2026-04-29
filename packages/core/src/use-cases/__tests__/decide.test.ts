import { describe, it, expect, vi } from 'vitest';
import { ok, err } from 'neverthrow';
import { DecideUseCase } from '../decide.js';
import { LLMClientError } from '../../ports/llm-client.js';
import { SignalRepositoryError } from '../../ports/signal-repository.js';
import type { ISignalRepository } from '../../ports/signal-repository.js';
import type { IDecisionRepository } from '../../ports/decision-repository.js';
import type { ILLMClient, LLMDecisionResponse } from '../../ports/llm-client.js';
import type { IEventBus } from '../../ports/event-bus.js';
import type { IIdempotencyStore } from '../../ports/idempotency-store.js';
import type { Signal } from '../../domain/signal.js';

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
  };
}

function makeDecisionRepo(): IDecisionRepository {
  return {
    save: vi.fn().mockImplementation((d) => Promise.resolve(ok(d))),
    findByIdeaId: vi.fn().mockResolvedValue(ok(null)),
  };
}

function makeLLMClient(response = llmResponse): ILLMClient {
  return { generateDecision: vi.fn().mockResolvedValue(ok(response)) };
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
      { generateDecision: vi.fn().mockResolvedValue(err(llmError)) },
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
      { upsertMany: vi.fn(), findByIdeaId: vi.fn().mockResolvedValue(err(signalError)) },
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
});
