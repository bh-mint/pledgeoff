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
    const queries: Record<string, string[]> = queriesResult.isOk()
      ? { producthunt: queriesResult.value.producthunt, google: queriesResult.value.google }
      : { producthunt: [fallbackQuery], google: [fallbackQuery] };

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

    const upsertResult = await this.signalRepo.upsertMany(signals);
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
}
