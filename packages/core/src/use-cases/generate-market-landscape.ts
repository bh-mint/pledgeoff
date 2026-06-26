import { ok, err, type Result } from 'neverthrow';
import type { MarketLandscape } from '../domain/market-landscape';
import { diffMarketLandscape } from '../domain/snapshot-diff';
import type { IMarketLandscapeRepository, MarketLandscapeRepositoryError } from '../ports/IMarketLandscapeRepository';
import type { ISignalRepository, SignalRepositoryError } from '../ports/signal-repository';
import type { ILLMClient, LLMClientError } from '../ports/llm-client';
import type { ILandscapeSnapshotRepository, SnapshotRepositoryError } from '../ports/snapshot-repository';
import type { IEventBus, EventBusError } from '../ports/event-bus';

type GenerateMarketLandscapeError =
  | LLMClientError
  | MarketLandscapeRepositoryError
  | SignalRepositoryError
  | SnapshotRepositoryError
  | EventBusError;

interface Input {
  readonly ideaId: string;
  readonly userId: string;
  readonly ideaText: string;
  readonly traceId: string;
  readonly founderContext?: string;
  readonly forceRerun?: boolean;
}

export class GenerateMarketLandscapeUseCase {
  constructor(
    private readonly llmClient: ILLMClient,
    private readonly repo: IMarketLandscapeRepository,
    private readonly signalRepo: ISignalRepository,
    private readonly snapshotRepo?: ILandscapeSnapshotRepository,
    private readonly eventBus?: IEventBus,
  ) {}

  async execute(input: Input): Promise<Result<MarketLandscape, GenerateMarketLandscapeError>> {
    const existing = await this.repo.findByIdeaId(input.ideaId);
    if (existing.isErr()) return err(existing.error);

    if (existing.value && !input.forceRerun) return ok(existing.value);

    if (existing.value && this.snapshotRepo) {
      const snapResult = await this.snapshotRepo.save(input.ideaId, existing.value);
      if (snapResult.isErr()) return err(snapResult.error);
    }

    const signalsResult = await this.signalRepo.findByIdeaId(input.ideaId);
    if (signalsResult.isErr()) return err(signalsResult.error);
    const signals = signalsResult.value;

    const llmResult = await this.llmClient.generateMarketLandscape({
      ideaText: input.ideaText,
      signals,
      traceId: input.traceId,
      founderContext: input.founderContext,
    });
    if (llmResult.isErr()) return err(llmResult.error);

    const landscape: MarketLandscape = {
      id: crypto.randomUUID(),
      ideaId: input.ideaId,
      userId: input.userId,
      segments: llmResult.value.segments,
      trends: llmResult.value.trends,
      uncoveredOpportunities: llmResult.value.uncoveredOpportunities,
      createdAt: new Date().toISOString(),
    };

    const saveResult = await this.repo.save(landscape);
    if (saveResult.isErr()) return err(saveResult.error);

    if (existing.value && this.eventBus) {
      const diffs = diffMarketLandscape(existing.value, landscape);
      if (diffs.length > 0) {
        await this.eventBus.publish('competitor.changed.v1', {
          eventId: crypto.randomUUID(),
          eventType: 'competitor.changed.v1',
          eventVersion: 1,
          occurredAt: new Date().toISOString(),
          traceId: input.traceId,
          payload: {
            ideaId: input.ideaId,
            source: 'landscape',
            diffs,
            majorChanges: diffs.filter((d) => d.significance === 'major').length,
          },
        });
      }
    }

    return ok(saveResult.value);
  }
}
