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
import type { ILLMClient } from '../../ports/llm-client';
import type { Signal } from '../../domain/signal';

const makeSignal = (ideaId: string): Signal => ({
  id: crypto.randomUUID(),
  ideaId,
  source: 'reddit',
  url: `https://reddit.com/r/startups/comments/${crypto.randomUUID()}`,
  title: 'People want this',
  summary: 'Strong positive sentiment',
  sentiment: 'positive',
  fetchedAt: new Date().toISOString(),
});

function makeRepo(signals: Signal[], overrides: Partial<ISignalRepository> = {}): ISignalRepository {
  return {
    upsertMany: vi.fn().mockResolvedValue(ok(signals)),
    findByIdeaId: vi.fn(),
    findTopByEmbedding: vi.fn(),
    saveEmbeddings: vi.fn().mockResolvedValue(ok(undefined)),
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

function makeLLMClient(queries = { devto: ['code review pull request automation'], google: ['code review tool'] }): ILLMClient {
  return {
    generateSearchQueries: vi.fn().mockResolvedValue(ok(queries)),
    scoreSignalRelevance: vi.fn().mockResolvedValue(ok({ scores: [] })),
    generateDecision: vi.fn(),
    generateSimulation: vi.fn(),
    generateLanding: vi.fn(),
    analyzeCustomers: vi.fn(),
    analyzeBuild: vi.fn(), analyzeCompetitors: vi.fn(),
    chatWithOtto: vi.fn(),
    generateLaunchKit: vi.fn(),
  };
}

describe('FetchSignalsUseCase', () => {
  const ideaId = crypto.randomUUID();
  const signals = [makeSignal(ideaId), makeSignal(ideaId)];
  const baseInput = {
    ideaId,
    ideaText: 'AI code review assistant\n\nDetects bugs and security issues in pull requests.',
    traceId: crypto.randomUUID(),
    eventId: crypto.randomUUID(),
  };

  it('generates queries via LLM then fetches from adapters', async () => {
    const queries = { devto: ['code review pull request automation'], google: ['code review tool developer'] };
    const llm = makeLLMClient(queries);
    const adapter = makeAdapter(signals, 'devto');
    const repo = makeRepo(signals);
    const useCase = new FetchSignalsUseCase(repo, makeEventBus(), makeIdempotencyStore(), [adapter], llm);

    const result = await useCase.execute(baseInput);

    expect(result.isOk()).toBe(true);
    expect(llm.generateSearchQueries).toHaveBeenCalledWith({ ideaText: baseInput.ideaText, traceId: baseInput.traceId });
    expect(adapter.fetch).toHaveBeenCalledWith(queries.devto[0], ideaId, baseInput.traceId);
  });

  it('falls back to idea title when LLM query generation fails', async () => {
    const llm = makeLLMClient();
    (llm.generateSearchQueries as ReturnType<typeof vi.fn>).mockResolvedValue(err(new Error('LLM timeout')));
    const adapter = makeAdapter(signals, 'devto');
    const repo = makeRepo(signals);
    const useCase = new FetchSignalsUseCase(repo, makeEventBus(), makeIdempotencyStore(), [adapter], llm);

    const result = await useCase.execute(baseInput);

    expect(result.isOk()).toBe(true);
    expect(adapter.fetch).toHaveBeenCalledWith('AI code review assistant', ideaId, baseInput.traceId);
  });

  it('deduplicates signals with the same URL across queries', async () => {
    const sharedSignal = makeSignal(ideaId);
    const uniqueSignal = makeSignal(ideaId);
    // Two calls return same URL — should be deduplicated
    const adapter: ISourceAdapter = {
      sourceName: 'devto',
      fetch: vi.fn()
        .mockResolvedValueOnce(ok([sharedSignal]))
        .mockResolvedValueOnce(ok([{ ...sharedSignal, id: crypto.randomUUID() }, uniqueSignal])),
    };
    const queries = { devto: ['query1', 'query2'], google: [] };
    const llm = makeLLMClient(queries);
    const repo = makeRepo([sharedSignal, uniqueSignal]);
    const useCase = new FetchSignalsUseCase(repo, makeEventBus(), makeIdempotencyStore(), [adapter], llm);

    await useCase.execute(baseInput);

    const upsertCall = ((repo.upsertMany as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] ?? []) as Signal[];
    const urls = upsertCall.map((s) => s.url);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it('skips processing if event was already processed (idempotency)', async () => {
    const adapter = makeAdapter(signals);
    const repo = makeRepo(signals);
    const llm = makeLLMClient();
    const useCase = new FetchSignalsUseCase(repo, makeEventBus(), makeIdempotencyStore(true), [adapter], llm);

    const result = await useCase.execute(baseInput);

    expect(result.isOk()).toBe(true);
    expect(llm.generateSearchQueries).not.toHaveBeenCalled();
    expect(adapter.fetch).not.toHaveBeenCalled();
  });

  it('continues when one source adapter fails (graceful degradation)', async () => {
    const githubSignals = [makeSignal(ideaId)];
    const repo = makeRepo(githubSignals);
    const failingAdapter: ISourceAdapter = {
      sourceName: 'reddit',
      fetch: vi.fn().mockResolvedValue(err(new SourceAdapterError('timeout', 'reddit'))),
    };
    const hnAdapter = makeAdapter(githubSignals, 'devto');
    const llm = makeLLMClient({ devto: ['query'], google: ['query'] });
    const useCase = new FetchSignalsUseCase(repo, makeEventBus(), makeIdempotencyStore(), [failingAdapter, hnAdapter], llm);

    const result = await useCase.execute(baseInput);

    expect(result.isOk()).toBe(true);
    expect(repo.upsertMany).toHaveBeenCalledWith(githubSignals);
  });

  it('returns error when signal repository fails', async () => {
    const repoError = new SignalRepositoryError('DB error');
    const repo = makeRepo(signals, { upsertMany: vi.fn().mockResolvedValue(err(repoError)) });
    const llm = makeLLMClient();
    const useCase = new FetchSignalsUseCase(repo, makeEventBus(), makeIdempotencyStore(), [makeAdapter(signals)], llm);

    const result = await useCase.execute(baseInput);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error).toBeInstanceOf(SignalRepositoryError);
  });

  it('rescues at least one signal per source when relevance filter would starve a source', async () => {
    const braveSignal1 = { ...makeSignal(ideaId), source: 'brave' as const, url: 'https://brave.com/1' };
    const braveSignal2 = { ...makeSignal(ideaId), source: 'brave' as const, url: 'https://brave.com/2' };
    const githubSignal = { ...makeSignal(ideaId), source: 'github' as const, url: 'https://github.com/issues/1' };

    const braveAdapter: ISourceAdapter = { sourceName: 'brave', fetch: vi.fn().mockResolvedValue(ok([braveSignal1, braveSignal2])) };
    const githubAdapter: ISourceAdapter = { sourceName: 'github', fetch: vi.fn().mockResolvedValue(ok([githubSignal])) };

    const allSignals = [braveSignal1, braveSignal2, githubSignal];
    const repo = makeRepo(allSignals);
    const llm = makeLLMClient({ devto: ['query'], google: ['query'] });
    // Brave scores above threshold, GitHub below — old code would drop github entirely
    (llm.scoreSignalRelevance as ReturnType<typeof vi.fn>).mockResolvedValue(ok({
      scores: [
        { id: braveSignal1.id, score: 80 },
        { id: braveSignal2.id, score: 75 },
        { id: githubSignal.id, score: 40 },
      ],
    }));

    const useCase = new FetchSignalsUseCase(repo, makeEventBus(), makeIdempotencyStore(), [braveAdapter, githubAdapter], llm);
    await useCase.execute(baseInput);

    const upsertCall = ((repo.upsertMany as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] ?? []) as Signal[];
    const sources = new Set(upsertCall.map((s) => s.source));
    expect(sources.has('github')).toBe(true);
  });

  it('returns error when idempotency check fails', async () => {
    const storeError = new IdempotencyStoreError('Store error');
    const store: IIdempotencyStore = {
      hasBeenProcessed: vi.fn().mockResolvedValue(err(storeError)),
      markAsProcessed: vi.fn(),
    };
    const llm = makeLLMClient();
    const useCase = new FetchSignalsUseCase(makeRepo(signals), makeEventBus(), store, [makeAdapter(signals)], llm);

    const result = await useCase.execute(baseInput);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error).toBeInstanceOf(IdempotencyStoreError);
  });
});
