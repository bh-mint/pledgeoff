import { Result, err, ok } from 'neverthrow';
import type { Signal } from '../domain/signal';
import type { ISignalRepository, SignalRepositoryError } from '../ports/signal-repository';
import type { IEventBus, EventBusError } from '../ports/event-bus';
import type { IIdempotencyStore, IdempotencyStoreError } from '../ports/idempotency-store';
import type { ISourceAdapter, SourceAdapterError } from '../ports/source-adapter';
import type { ILLMClient } from '../ports/llm-client';

export interface FetchSignalsInput {
  readonly ideaId: string;
  readonly ideaText: string;
  readonly traceId: string;
  readonly eventId: string;
}

export type FetchSignalsError = SignalRepositoryError | EventBusError | IdempotencyStoreError | SourceAdapterError;

export class FetchSignalsUseCase {
  constructor(
    private readonly signalRepo: ISignalRepository,
    private readonly eventBus: IEventBus,
    private readonly idempotencyStore: IIdempotencyStore,
    private readonly sourceAdapters: ISourceAdapter[],
    private readonly llmClient: ILLMClient,
  ) {}

  async execute(input: FetchSignalsInput): Promise<Result<Signal[], FetchSignalsError>> {
    const alreadyProcessed = await this.idempotencyStore.hasBeenProcessed(input.eventId);
    if (alreadyProcessed.isErr()) return err(alreadyProcessed.error);
    if (alreadyProcessed.value) return ok([]);

    // Generate targeted search queries via LLM; fall back to idea title on failure
    const fallbackQuery = input.ideaText.split('\n')[0] ?? input.ideaText;
    const queriesResult = await this.llmClient.generateSearchQueries({
      ideaText: input.ideaText,
      traceId: input.traceId,
    });
    // HN, DevTo, GitHub, Brave all use devto queries (short keyword phrases); Google uses its own
    const queries: Record<string, string[]> = queriesResult.isOk()
      ? { devto: queriesResult.value.devto, google: queriesResult.value.google, hn: queriesResult.value.devto, github: queriesResult.value.devto, brave: queriesResult.value.devto }
      : { devto: [fallbackQuery], google: [fallbackQuery], hn: [fallbackQuery], github: [fallbackQuery], brave: [fallbackQuery] };

    // Fetch from each adapter for each query in parallel
    const fetchPromises = this.sourceAdapters.flatMap((adapter) => {
      const adapterQueries = queries[adapter.sourceName] ?? [fallbackQuery];
      return adapterQueries.map((query) => adapter.fetch(query, input.ideaId, input.traceId));
    });

    const results = await Promise.allSettled(fetchPromises);

    // Merge results, deduplicate by URL
    const seen = new Set<string>();
    const signals: Signal[] = [];
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value.isOk()) {
        for (const s of r.value.value) {
          if (!seen.has(s.url)) {
            seen.add(s.url);
            signals.push(s);
          }
        }
      }
    }

    // LLM relevance filter: score all candidates, keep score >= 60; fallback to top-2 if all below threshold
    const filteredSignals = await this._filterByRelevance(signals, input.ideaText, input.traceId);

    const upsertResult = await this.signalRepo.upsertMany(filteredSignals);
    if (upsertResult.isErr()) return err(upsertResult.error);

    const markResult = await this.idempotencyStore.markAsProcessed(input.eventId);
    if (markResult.isErr()) return err(markResult.error);

    const publishResult = await this.eventBus.publish('signals.fetched.v1', {
      eventId: crypto.randomUUID(),
      eventType: 'signals.fetched.v1',
      eventVersion: 1,
      occurredAt: new Date().toISOString(),
      traceId: input.traceId,
      payload: {
        ideaId: input.ideaId,
        signalIds: upsertResult.value.map((s) => s.id),
        signalCount: upsertResult.value.length,
      },
    });
    if (publishResult.isErr()) return err(publishResult.error);

    return ok(upsertResult.value);
  }

  private async _filterByRelevance(signals: Signal[], ideaText: string, traceId: string): Promise<Signal[]> {
    if (signals.length === 0) return signals;

    const candidates = signals.map((s) => ({ id: s.id, title: s.title, summary: s.summary }));
    const scored = await this.llmClient.scoreSignalRelevance({ ideaText, signals: candidates, traceId });

    if (scored.isErr()) return signals; // on LLM failure, pass all through

    const scoreMap = new Map(scored.value.scores.map((s) => [s.id, s.score]));
    const THRESHOLD = 60;
    const passing = signals.filter((s) => (scoreMap.get(s.id) ?? 0) >= THRESHOLD);

    // Rescue top-1 per source that was completely filtered out — prevents source starvation
    // (e.g. brave signals dominating and dropping all GitHub signals)
    const passingIds = new Set(passing.map((s) => s.id));
    const coveredSources = new Set(passing.map((s) => s.source));
    const rescued: Signal[] = [];
    for (const source of new Set(signals.map((s) => s.source))) {
      if (!coveredSources.has(source)) {
        const top = signals
          .filter((s) => s.source === source && !passingIds.has(s.id))
          .sort((a, b) => (scoreMap.get(b.id) ?? 0) - (scoreMap.get(a.id) ?? 0))[0];
        if (top) rescued.push(top);
      }
    }

    const merged = [...passing, ...rescued];
    if (merged.length >= 2) return merged;

    // Fallback: return top-2 by score so pipeline never starves
    return [...signals]
      .sort((a, b) => (scoreMap.get(b.id) ?? 0) - (scoreMap.get(a.id) ?? 0))
      .slice(0, 2);
  }
}
