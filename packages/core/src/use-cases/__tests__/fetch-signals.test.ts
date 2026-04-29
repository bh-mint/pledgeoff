import { describe, it, expect, vi } from 'vitest';
import { ok, err } from 'neverthrow';
import { FetchSignalsUseCase } from '../fetch-signals.js';
import { SignalRepositoryError } from '../../ports/signal-repository.js';
import { IdempotencyStoreError } from '../../ports/idempotency-store.js';
import type { ISignalRepository } from '../../ports/signal-repository.js';
import type { IEventBus } from '../../ports/event-bus.js';
import type { IIdempotencyStore } from '../../ports/idempotency-store.js';
import type { Signal } from '../../domain/signal.js';

const makeSignal = (ideaId: string): Signal => ({
  id: crypto.randomUUID(),
  ideaId,
  source: 'reddit',
  url: 'https://reddit.com/r/startups/comments/abc',
  title: 'People want this',
  summary: 'Strong positive sentiment',
  sentiment: 'positive',
  fetchedAt: new Date().toISOString(),
});

function makeRepo(signals: Signal[], overrides: Partial<ISignalRepository> = {}): ISignalRepository {
  return {
    upsertMany: vi.fn().mockResolvedValue(ok(signals)),
    findByIdeaId: vi.fn(),
    ...overrides,
  };
}

function makeEventBus(): IEventBus {
  return { publish: vi.fn().mockResolvedValue(ok(undefined)), subscribe: vi.fn() };
}

function makeIdempotencyStore(alreadyProcessed = false): IIdempotencyStore {
  return {
    hasBeenProcessed: vi.fn().mockResolvedValue(ok(alreadyProcessed)),
    markAsProcessed: vi.fn().mockResolvedValue(ok(undefined)),
  };
}

describe('FetchSignalsUseCase', () => {
  const ideaId = crypto.randomUUID();
  const signals = [makeSignal(ideaId), makeSignal(ideaId)];
  const baseInput = {
    ideaId,
    ideaText: 'An interesting app idea for the market',
    signals,
    traceId: crypto.randomUUID(),
    eventId: crypto.randomUUID(),
  };

  it('upserts signals and publishes event', async () => {
    const repo = makeRepo(signals);
    const bus = makeEventBus();
    const store = makeIdempotencyStore(false);
    const useCase = new FetchSignalsUseCase(repo, bus, store);

    const result = await useCase.execute(baseInput);

    expect(result.isOk()).toBe(true);
    expect(repo.upsertMany).toHaveBeenCalledWith(signals);
    expect(store.markAsProcessed).toHaveBeenCalledWith(baseInput.eventId);
    expect(bus.publish).toHaveBeenCalledWith('signals.fetched.v1', expect.objectContaining({
      eventType: 'signals.fetched.v1',
      payload: expect.objectContaining({ ideaId, signalCount: 2 }),
    }));
  });

  it('skips processing if event was already processed (idempotency)', async () => {
    const repo = makeRepo(signals);
    const bus = makeEventBus();
    const store = makeIdempotencyStore(true);
    const useCase = new FetchSignalsUseCase(repo, bus, store);

    const result = await useCase.execute(baseInput);

    expect(result.isOk()).toBe(true);
    expect(repo.upsertMany).not.toHaveBeenCalled();
    expect(bus.publish).not.toHaveBeenCalled();
  });

  it('returns error when signal repository fails', async () => {
    const repoError = new SignalRepositoryError('DB error');
    const repo = makeRepo(signals, { upsertMany: vi.fn().mockResolvedValue(err(repoError)) });
    const bus = makeEventBus();
    const store = makeIdempotencyStore(false);
    const useCase = new FetchSignalsUseCase(repo, bus, store);

    const result = await useCase.execute(baseInput);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(SignalRepositoryError);
    }
  });

  it('returns error when idempotency check fails', async () => {
    const storeError = new IdempotencyStoreError('Store error');
    const repo = makeRepo(signals);
    const bus = makeEventBus();
    const store: IIdempotencyStore = {
      hasBeenProcessed: vi.fn().mockResolvedValue(err(storeError)),
      markAsProcessed: vi.fn(),
    };
    const useCase = new FetchSignalsUseCase(repo, bus, store);

    const result = await useCase.execute(baseInput);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(IdempotencyStoreError);
    }
  });
});
