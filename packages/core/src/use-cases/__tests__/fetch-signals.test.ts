import { describe, it, expect, vi } from 'vitest';
import { ok, err } from 'neverthrow';
import { FetchSignalsUseCase } from '../fetch-signals';
import { SignalRepositoryError } from '../../ports/signal-repository';
import { IdempotencyStoreError } from '../../ports/idempotency-store';
import { SourceAdapterError } from '../../ports/source-adapter';
import type { ISignalRepository } from '../../ports/signal-repository';
import type { IEventBus } from '../../ports/event-bus';
import type { IIdempotencyStore } from '../../ports/idempotency-store';
import type { ISourceAdapter } from '../../ports/source-adapter';
import type { Signal } from '../../domain/signal';

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

function makeAdapter(signals: Signal[], sourceName = 'reddit'): ISourceAdapter {
  return {
    sourceName,
    fetch: vi.fn().mockResolvedValue(ok(signals)),
  };
}

describe('FetchSignalsUseCase', () => {
  const ideaId = crypto.randomUUID();
  const signals = [makeSignal(ideaId), makeSignal(ideaId)];
  const baseInput = {
    ideaId,
    ideaText: 'An interesting app idea for the market',
    traceId: crypto.randomUUID(),
    eventId: crypto.randomUUID(),
  };

  it('fetches from adapters, upserts signals and publishes event', async () => {
    const repo = makeRepo(signals);
    const bus = makeEventBus();
    const store = makeIdempotencyStore(false);
    const adapter = makeAdapter(signals);
    const useCase = new FetchSignalsUseCase(repo, bus, store, [adapter]);

    const result = await useCase.execute(baseInput);

    expect(result.isOk()).toBe(true);
    expect(adapter.fetch).toHaveBeenCalledWith(baseInput.ideaText, ideaId, baseInput.traceId);
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
    const adapter = makeAdapter(signals);
    const useCase = new FetchSignalsUseCase(repo, bus, store, [adapter]);

    const result = await useCase.execute(baseInput);

    expect(result.isOk()).toBe(true);
    expect(adapter.fetch).not.toHaveBeenCalled();
    expect(repo.upsertMany).not.toHaveBeenCalled();
    expect(bus.publish).not.toHaveBeenCalled();
  });

  it('continues when one source adapter fails (graceful degradation)', async () => {
    const redditSignals = [makeSignal(ideaId)];
    const githubSignals = [makeSignal(ideaId)];
    const allSignals = [...redditSignals, ...githubSignals];
    const repo = makeRepo(allSignals);
    const bus = makeEventBus();
    const store = makeIdempotencyStore(false);

    const failingAdapter: ISourceAdapter = {
      sourceName: 'reddit',
      fetch: vi.fn().mockResolvedValue(err(new SourceAdapterError('timeout', 'reddit'))),
    };
    const githubAdapter = makeAdapter(githubSignals, 'github');
    const useCase = new FetchSignalsUseCase(repo, bus, store, [failingAdapter, githubAdapter]);

    const result = await useCase.execute(baseInput);

    expect(result.isOk()).toBe(true);
    // Only github signals were upserted (reddit failed)
    expect(repo.upsertMany).toHaveBeenCalledWith(githubSignals);
  });

  it('returns empty and publishes event when all adapters fail', async () => {
    const repo = makeRepo([]);
    const bus = makeEventBus();
    const store = makeIdempotencyStore(false);
    const failingAdapter: ISourceAdapter = {
      sourceName: 'reddit',
      fetch: vi.fn().mockResolvedValue(err(new SourceAdapterError('timeout', 'reddit'))),
    };
    const useCase = new FetchSignalsUseCase(repo, bus, store, [failingAdapter]);

    const result = await useCase.execute(baseInput);

    expect(result.isOk()).toBe(true);
    expect(repo.upsertMany).toHaveBeenCalledWith([]);
  });

  it('returns error when signal repository fails', async () => {
    const repoError = new SignalRepositoryError('DB error');
    const repo = makeRepo(signals, { upsertMany: vi.fn().mockResolvedValue(err(repoError)) });
    const bus = makeEventBus();
    const store = makeIdempotencyStore(false);
    const adapter = makeAdapter(signals);
    const useCase = new FetchSignalsUseCase(repo, bus, store, [adapter]);

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
    const adapter = makeAdapter(signals);
    const useCase = new FetchSignalsUseCase(repo, bus, store, [adapter]);

    const result = await useCase.execute(baseInput);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(IdempotencyStoreError);
    }
  });
});
