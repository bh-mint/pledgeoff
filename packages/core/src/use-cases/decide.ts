import { Result, err, ok } from 'neverthrow';
import type { Decision } from '../domain/decision';
import { computeScore, validateDimensions, InvalidDecisionError } from '../domain/decision';
import type { IDecisionRepository, DecisionRepositoryError } from '../ports/decision-repository';
import type { ISignalRepository, SignalRepositoryError } from '../ports/signal-repository';
import type { ILLMClient, LLMClientError, CalibrationExample } from '../ports/llm-client';
import type { IEventBus, EventBusError } from '../ports/event-bus';
import type { IIdempotencyStore, IdempotencyStoreError } from '../ports/idempotency-store';
import type { IEmbeddingClient } from '../ports/embedding-client';
import type { IDecisionOutcomeRepository } from '../ports/decision-outcome-repository';

const TOP_SIGNALS_LIMIT = 15;

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
  | IdempotencyStoreError
  | InvalidDecisionError;

export class DecideUseCase {
  constructor(
    private readonly signalRepo: ISignalRepository,
    private readonly decisionRepo: IDecisionRepository,
    private readonly llmClient: ILLMClient,
    private readonly eventBus: IEventBus,
    private readonly idempotencyStore: IIdempotencyStore,
    private readonly embeddingClient?: IEmbeddingClient,
    private readonly outcomeRepo?: IDecisionOutcomeRepository,
  ) {}

  async execute(input: DecideInput): Promise<Result<Decision, DecideError>> {
    const alreadyProcessed = await this.idempotencyStore.hasBeenProcessed(input.eventId);
    if (alreadyProcessed.isErr()) return err(alreadyProcessed.error);

    if (alreadyProcessed.value) {
      const existing = await this.decisionRepo.findByIdeaId(input.ideaId);
      if (existing.isErr()) return err(existing.error);
      if (existing.value) return ok(existing.value);
    }

    // Use cosine similarity ranking if embedding client is available; fallback to full scan
    let signalsResult;
    if (this.embeddingClient) {
      const embeddingResult = await this.embeddingClient.embed(input.ideaText);
      if (embeddingResult.isOk()) {
        signalsResult = await this.signalRepo.findTopByEmbedding(
          embeddingResult.value,
          input.ideaId,
          TOP_SIGNALS_LIMIT,
        );
      }
    }
    if (!signalsResult) {
      signalsResult = await this.signalRepo.findByIdeaId(input.ideaId);
    }
    if (signalsResult.isErr()) return err(signalsResult.error);

    let calibrationExamples: CalibrationExample[] | undefined;
    if (this.outcomeRepo) {
      const calibResult = await this.outcomeRepo.findCalibrationExamples(3);
      if (calibResult.isOk() && calibResult.value.length > 0) {
        calibrationExamples = calibResult.value;
      }
    }

    const llmResult = await this.llmClient.generateDecision({
      ideaText: input.ideaText,
      signals: signalsResult.value,
      traceId: input.traceId,
      calibrationExamples,
    });
    if (llmResult.isErr()) return err(llmResult.error);

    const dims = llmResult.value.dimensions;
    if (dims?.length) {
      const validationResult = validateDimensions(dims);
      if (validationResult.isErr()) return err(validationResult.error);
    }

    const decision: Decision = {
      id: crypto.randomUUID(),
      ideaId: input.ideaId,
      verdict: llmResult.value.verdict,
      reasoning: llmResult.value.reasoning,
      confidence: llmResult.value.confidence,
      score: computeScore(dims),
      signalIds: signalsResult.value.map((s) => s.id),
      dimensions: dims,
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
