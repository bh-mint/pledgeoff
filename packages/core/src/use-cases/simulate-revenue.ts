import { Result, err, ok } from 'neverthrow';
import type { Simulation } from '../domain/simulation';
import type { Verdict } from '../domain/decision';
import type { ISimulationRepository, SimulationRepositoryError } from '../ports/simulation-repository';
import type { ISignalRepository, SignalRepositoryError } from '../ports/signal-repository';
import type { ILLMClient, LLMClientError } from '../ports/llm-client';

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
  ) {}

  async execute(input: SimulateRevenueInput): Promise<Result<Simulation, SimulateRevenueError>> {
    // Return cached simulation if already run for this idea
    const existing = await this.simulationRepo.findByIdeaId(input.ideaId);
    if (existing.isErr()) return err(existing.error);
    if (existing.value) return ok(existing.value);

    const signalsResult = await this.signalRepo.findByIdeaId(input.ideaId);
    if (signalsResult.isErr()) return err(signalsResult.error);

    const llmResult = await this.llmClient.generateSimulation({
      ideaText: input.ideaText,
      signals: signalsResult.value,
      verdict: input.verdict,
      traceId: input.traceId,
      founderContext: input.founderContext,
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
}
