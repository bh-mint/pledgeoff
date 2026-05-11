import { describe, it, expect, vi } from 'vitest';
import { ok, err } from 'neverthrow';
import { FetchSignalsUseCase } from '../fetch-signals';
import { DecideUseCase } from '../decide';
import { SourceAdapterError } from '../../ports/source-adapter';
import { LLMClientError } from '../../ports/llm-client';
import type { ISignalRepository } from '../../ports/signal-repository';
import type { IEventBus } from '../../ports/event-bus';
import type { IIdempotencyStore } from '../../ports/idempotency-store';
import type { ISourceAdapter } from '../../ports/source-adapter';
import type { ILLMClient } from '../../ports/llm-client';
import type { IDecisionRepository } from '../../ports/decision-repository';
import type { Signal } from '../../domain/signal';

const IDEA_ID = 'idea-chaos-001';
const TRACE_ID = 'trace-chaos-001';
const EVENT_ID = 'event-chaos-001';
const IDEA_TEXT = 'A tool to validate startup ideas using AI';

const makeSignal = (): Signal => ({
  id: crypto.randomUUID(),
  ideaId: IDEA_ID,
  source: 'reddit',
  url: 'https://reddit.com/r/test',
  title: 'Test signal',
  summary: 'Test summary',
  sentiment: 'neutral',
  fetchedAt: new Date().toISOString(),
});

function makeSignalRepo(signals: Signal[] = []): ISignalRepository {
  return {
    upsertMany: vi.fn().mockResolvedValue(ok(signals)),
    findByIdeaId: vi.fn().mockResolvedValue(ok(signals)),
  };
}

function makeEventBus(): IEventBus {
  return { publish: vi.fn().mockResolvedValue(ok(undefined)), subscribe: vi.fn() };
}

function makeIdempotencyStore(): IIdempotencyStore {
  return {
    hasBeenProcessed: vi.fn().mockResolvedValue(ok(false)),
    markAsProcessed: vi.fn().mockResolvedValue(ok(undefined)),
  };
}

function makeDecisionRepo(): IDecisionRepository {
  return {
    save: vi.fn().mockResolvedValue(ok(undefined)),
    findByIdeaId: vi.fn().mockResolvedValue(ok(null)),
  };
}

function makeSource(name: 'reddit' | 'github', fail = false): ISourceAdapter {
  return {
    sourceName: name,
    fetch: fail
      ? vi.fn().mockResolvedValue(err(new SourceAdapterError('connection refused', name)))
      : vi.fn().mockResolvedValue(ok([makeSignal()])),
  };
}

// Chaos 1: Reddit down — GitHub still works, signals published with partial results
describe('Chaos: Reddit adapter down', () => {
  it('publishes signals from GitHub only — does not throw', async () => {
    const signalRepo = makeSignalRepo();
    const eventBus = makeEventBus();
    const useCase = new FetchSignalsUseCase(
      signalRepo,
      eventBus,
      makeIdempotencyStore(),
      [makeSource('reddit', true), makeSource('github', false)],
    );

    const result = await useCase.execute({ ideaId: IDEA_ID, ideaText: IDEA_TEXT, traceId: TRACE_ID, eventId: EVENT_ID });

    expect(result.isOk()).toBe(true);
    expect(eventBus.publish).toHaveBeenCalledOnce();
  });
});

// Chaos 2: GitHub down — Reddit still works
describe('Chaos: GitHub adapter down', () => {
  it('publishes signals from Reddit only — does not throw', async () => {
    const signalRepo = makeSignalRepo();
    const eventBus = makeEventBus();
    const useCase = new FetchSignalsUseCase(
      signalRepo,
      eventBus,
      makeIdempotencyStore(),
      [makeSource('reddit', false), makeSource('github', true)],
    );

    const result = await useCase.execute({ ideaId: IDEA_ID, ideaText: IDEA_TEXT, traceId: TRACE_ID, eventId: EVENT_ID });

    expect(result.isOk()).toBe(true);
    expect(eventBus.publish).toHaveBeenCalledOnce();
  });
});

// Chaos 3: Both sources down — publishes event with 0 signals (no crash)
describe('Chaos: Both adapters down', () => {
  it('publishes signals.fetched.v1 with 0 signals — does not throw', async () => {
    const signalRepo = makeSignalRepo([]);
    const eventBus = makeEventBus();
    const useCase = new FetchSignalsUseCase(
      signalRepo,
      eventBus,
      makeIdempotencyStore(),
      [makeSource('reddit', true), makeSource('github', true)],
    );

    const result = await useCase.execute({ ideaId: IDEA_ID, ideaText: IDEA_TEXT, traceId: TRACE_ID, eventId: EVENT_ID });

    expect(result.isOk()).toBe(true);
    expect(eventBus.publish).toHaveBeenCalledOnce();
  });
});

// Chaos 4: LLM down — DecideUseCase returns err, no decision saved
describe('Chaos: LLM (Groq) down', () => {
  it('returns error result — does not throw, does not save decision', async () => {
    const signals = [makeSignal()];
    const signalRepo = makeSignalRepo(signals);
    const decisionRepo = makeDecisionRepo();

    const llm: ILLMClient = {
      generateDecision: vi.fn().mockResolvedValue(
        err(new LLMClientError('connection timeout')),
      ),
      generateSimulation: vi.fn(),
    };

    const useCase = new DecideUseCase(signalRepo, decisionRepo, llm, makeEventBus(), makeIdempotencyStore());

    const result = await useCase.execute({ ideaId: IDEA_ID, ideaText: IDEA_TEXT, traceId: TRACE_ID, eventId: EVENT_ID });

    expect(result.isErr()).toBe(true);
    expect(decisionRepo.save).not.toHaveBeenCalled();
  });
});
