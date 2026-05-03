import { Result, err, ok } from 'neverthrow';
import type { Signal } from '../domain/signal';
import type { ISignalRepository, SignalRepositoryError } from '../ports/signal-repository';
import type { IEventBus, EventBusError } from '../ports/event-bus';
import type { IIdempotencyStore, IdempotencyStoreError } from '../ports/idempotency-store';
import type { ISourceAdapter, SourceAdapterError } from '../ports/source-adapter';

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
  ) {}

  async execute(input: FetchSignalsInput): Promise<Result<Signal[], FetchSignalsError>> {
    const alreadyProcessed = await this.idempotencyStore.hasBeenProcessed(input.eventId);
    if (alreadyProcessed.isErr()) return err(alreadyProcessed.error);
    if (alreadyProcessed.value) return ok([]);

    const signals: Signal[] = [];
    for (const adapter of this.sourceAdapters) {
      const result = await adapter.fetch(input.ideaText, input.ideaId, input.traceId);
      if (result.isOk()) {
        signals.push(...result.value);
      }
      // Partial failure: one source down doesn't abort — log and continue
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
