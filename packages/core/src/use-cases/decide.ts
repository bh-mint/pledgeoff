import { Result, err, ok } from 'neverthrow';
import type { Decision } from '../domain/decision';
import type { IDecisionRepository, DecisionRepositoryError } from '../ports/decision-repository';
import type { ISignalRepository, SignalRepositoryError } from '../ports/signal-repository';
import type { ILLMClient, LLMClientError } from '../ports/llm-client';
import type { IEventBus, EventBusError } from '../ports/event-bus';
import type { IIdempotencyStore, IdempotencyStoreError } from '../ports/idempotency-store';

export interface DecideInput {
  readonly ideaId: string;
  readonly ideaText: string;
  readonly traceId: string;
  readonly eventId: string;
}

export type DecideError =
  | SignalRepositoryError
  | LLMClientError
  | DecisionRepositoryError
  | EventBusError
  | IdempotencyStoreError;

export class DecideUseCase {
  constructor(
    private readonly signalRepo: ISignalRepository,
    private readonly decisionRepo: IDecisionRepository,
    private readonly llmClient: ILLMClient,
    private readonly eventBus: IEventBus,
    private readonly idempotencyStore: IIdempotencyStore,
  ) {}

  async execute(input: DecideInput): Promise<Result<Decision, DecideError>> {
    const alreadyProcessed = await this.idempotencyStore.hasBeenProcessed(input.eventId);
    if (alreadyProcessed.isErr()) return err(alreadyProcessed.error);

    if (alreadyProcessed.value) {
      const existing = await this.decisionRepo.findByIdeaId(input.ideaId);
      if (existing.isErr()) return err(existing.error);
      if (existing.value) return ok(existing.value);
    }

    const signalsResult = await this.signalRepo.findByIdeaId(input.ideaId);
    if (signalsResult.isErr()) return err(signalsResult.error);

    const llmResult = await this.llmClient.generateDecision({
      ideaText: input.ideaText,
      signals: signalsResult.value,
      traceId: input.traceId,
    });
    if (llmResult.isErr()) return err(llmResult.error);

    const decision: Decision = {
      id: crypto.randomUUID(),
      ideaId: input.ideaId,
      verdict: llmResult.value.verdict,
      reasoning: llmResult.value.reasoning,
      confidence: llmResult.value.confidence,
      signalIds: signalsResult.value.map((s) => s.id),
      dimensions: llmResult.value.dimensions,
      createdAt: new Date().toISOString(),
    };

    const saveResult = await this.decisionRepo.save(decision);
    if (saveResult.isErr()) return err(saveResult.error);

    const markResult = await this.idempotencyStore.markAsProcessed(input.eventId);
    if (markResult.isErr()) return err(markResult.error);

    const publishResult = await this.eventBus.publish('decision.ready.v1', {
      eventId: crypto.randomUUID(),
      eventType: 'decision.ready.v1',
      eventVersion: 1,
      occurredAt: new Date().toISOString(),
      traceId: input.traceId,
      payload: {
        ideaId: input.ideaId,
        decisionId: decision.id,
        verdict: decision.verdict,
        confidence: decision.confidence,
      },
    });
    if (publishResult.isErr()) return err(publishResult.error);

    return ok(decision);
  }
}
