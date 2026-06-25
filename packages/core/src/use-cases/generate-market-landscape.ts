import { ok, err, type Result } from 'neverthrow';
import type { MarketLandscape } from '../domain/market-landscape';
import type { IMarketLandscapeRepository, MarketLandscapeRepositoryError } from '../ports/IMarketLandscapeRepository';
import type { ISignalRepository, SignalRepositoryError } from '../ports/signal-repository';
import type { ILLMClient, LLMClientError } from '../ports/llm-client';

type GenerateMarketLandscapeError = LLMClientError | MarketLandscapeRepositoryError | SignalRepositoryError;

interface Input {
  readonly ideaId: string;
  readonly userId: string;
  readonly ideaText: string;
  readonly traceId: string;
}

export class GenerateMarketLandscapeUseCase {
  constructor(
    private readonly llmClient: ILLMClient,
    private readonly repo: IMarketLandscapeRepository,
    private readonly signalRepo: ISignalRepository,
  ) {}

  async execute(input: Input): Promise<Result<MarketLandscape, GenerateMarketLandscapeError>> {
    const existing = await this.repo.findByIdeaId(input.ideaId);
    if (existing.isErr()) return err(existing.error);
    if (existing.value) return ok(existing.value);

    const signalsResult = await this.signalRepo.findByIdeaId(input.ideaId);
    if (signalsResult.isErr()) return err(signalsResult.error);
    const signals = signalsResult.value;

    const llmResult = await this.llmClient.generateMarketLandscape({
      ideaText: input.ideaText,
      signals,
      traceId: input.traceId,
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
    return ok(saveResult.value);
  }
}
