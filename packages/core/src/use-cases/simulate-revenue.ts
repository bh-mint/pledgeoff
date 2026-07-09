import { Result, err, ok } from 'neverthrow';
import type { Simulation } from '../domain/simulation';
import type { Verdict } from '../domain/decision';
import type { ISimulationRepository, SimulationRepositoryError } from '../ports/simulation-repository';
import type { ISignalRepository, SignalRepositoryError } from '../ports/signal-repository';
import type { ILLMClient, LLMClientError } from '../ports/llm-client';
import type { ICompetitorAnalysisRepository } from '../ports/competitor-analysis-repository';
import type { IMarketDataRepository, CompetitorMarketData } from '../ports/market-data-repository';

const MAX_MARKET_DATA_LOOKUPS = 5;

export interface SimulateRevenueInput {
  readonly ideaId: string;
  readonly ideaText: string;
  readonly verdict: Verdict;
  readonly userId: string;
  readonly traceId: string;
  readonly founderContext?: string;
}

export type SimulateRevenueError =
  | SimulationRepositoryError
  | SignalRepositoryError
  | LLMClientError;

export class SimulateRevenueUseCase {
  constructor(
    private readonly simulationRepo: ISimulationRepository,
    private readonly signalRepo: ISignalRepository,
    private readonly llmClient: ILLMClient,
    private readonly competitorRepo?: ICompetitorAnalysisRepository,
    private readonly marketDataRepo?: IMarketDataRepository,
  ) {}

  async execute(input: SimulateRevenueInput): Promise<Result<Simulation, SimulateRevenueError>> {
    // Return cached simulation if already run for this idea
    const existing = await this.simulationRepo.findByIdeaId(input.ideaId);
    if (existing.isErr()) return err(existing.error);
    if (existing.value) return ok(existing.value);

    const signalsResult = await this.signalRepo.findByIdeaId(input.ideaId);
    if (signalsResult.isErr()) return err(signalsResult.error);

    const marketData = await this.lookupMarketData(input.ideaId, input.traceId);

    const llmResult = await this.llmClient.generateSimulation({
      ideaText: input.ideaText,
      signals: signalsResult.value,
      verdict: input.verdict,
      traceId: input.traceId,
      founderContext: input.founderContext,
      marketData,
    });
    if (llmResult.isErr()) return err(llmResult.error);

    const simulation: Simulation = {
      id: crypto.randomUUID(),
      ideaId: input.ideaId,
      userId: input.userId,
      tamLow: llmResult.value.tamLow,
      tamHigh: llmResult.value.tamHigh,
      scenarios: llmResult.value.scenarios,
      breakEvenMonths: llmResult.value.breakEvenMonths,
      assumptions: llmResult.value.assumptions,
      createdAt: new Date().toISOString(),
    };

    const saveResult = await this.simulationRepo.save(simulation);
    if (saveResult.isErr()) return err(saveResult.error);

    return ok(simulation);
  }

  /**
   * Best-effort enrichment: verified market data must never block or fail a
   * simulation. Lookup errors are logged inside the adapter and dropped here;
   * absence of data (no repos wired, no competitors, no matches) yields
   * undefined and the prompt simply omits the verified-data block.
   */
  private async lookupMarketData(
    ideaId: string,
    traceId: string,
  ): Promise<readonly CompetitorMarketData[] | undefined> {
    if (!this.competitorRepo || !this.marketDataRepo) return undefined;

    const analysisResult = await this.competitorRepo.findByIdeaId(ideaId);
    if (analysisResult.isErr() || !analysisResult.value) return undefined;

    const names = analysisResult.value.competitors
      .slice(0, MAX_MARKET_DATA_LOOKUPS)
      .map((c) => c.name);
    if (names.length === 0) return undefined;

    const lookups = await Promise.all(
      names.map((name) => this.marketDataRepo!.findOrganization(name, traceId)),
    );

    const found = lookups.flatMap((r) => (r.isOk() && r.value !== null ? [r.value] : []));
    return found.length > 0 ? found : undefined;
  }
}
