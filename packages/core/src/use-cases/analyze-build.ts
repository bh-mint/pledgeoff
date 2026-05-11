import { Result, err, ok } from 'neverthrow';
import type { BuildAnalysis } from '../domain/build-analysis';
import type { IBuildAnalysisRepository, BuildAnalysisRepositoryError } from '../ports/build-analysis-repository';
import type { ISignalRepository, SignalRepositoryError } from '../ports/signal-repository';
import type { ILLMClient, LLMClientError } from '../ports/llm-client';

export const MIN_GITHUB_SIGNALS = 3;

export interface AnalyzeBuildInput {
  readonly ideaId: string;
  readonly ideaText: string;
  readonly userId: string;
  readonly traceId: string;
}

export type AnalyzeBuildError = BuildAnalysisRepositoryError | SignalRepositoryError | LLMClientError;

export class AnalyzeBuildUseCase {
  constructor(
    private readonly buildAnalysisRepo: IBuildAnalysisRepository,
    private readonly signalRepo: ISignalRepository,
    private readonly llmClient: ILLMClient,
  ) {}

  async execute(input: AnalyzeBuildInput): Promise<Result<BuildAnalysis, AnalyzeBuildError>> {
    const existing = await this.buildAnalysisRepo.findByIdeaId(input.ideaId);
    if (existing.isErr()) return err(existing.error);
    if (existing.value) return ok(existing.value);

    const signalsResult = await this.signalRepo.findByIdeaId(input.ideaId);
    if (signalsResult.isErr()) return err(signalsResult.error);

    const signals = signalsResult.value;
    const githubSignals = signals.filter((s) => s.source === 'github');

    const llmResult = await this.llmClient.analyzeBuild({
      ideaText: input.ideaText,
      signals,
      traceId: input.traceId,
    });
    if (llmResult.isErr()) return err(llmResult.error);

    const analysis: BuildAnalysis = {
      id: crypto.randomUUID(),
      ideaId: input.ideaId,
      userId: input.userId,
      stack: llmResult.value.stack,
      gaps: llmResult.value.gaps,
      signalCount: githubSignals.length,
      createdAt: new Date().toISOString(),
    };

    const saveResult = await this.buildAnalysisRepo.save(analysis);
    if (saveResult.isErr()) return err(saveResult.error);

    return ok(analysis);
  }
}
