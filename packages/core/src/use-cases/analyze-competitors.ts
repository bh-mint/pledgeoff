import { Result, err, ok } from 'neverthrow';
import type { CompetitorAnalysis } from '../domain/competitor-analysis';
import type { ICompetitorAnalysisRepository, CompetitorAnalysisRepositoryError } from '../ports/competitor-analysis-repository';
import type { ISignalRepository, SignalRepositoryError } from '../ports/signal-repository';
import type { ILLMClient, LLMClientError } from '../ports/llm-client';

export interface AnalyzeCompetitorsInput {
  readonly ideaId: string;
  readonly ideaText: string;
  readonly userId: string;
  readonly traceId: string;
}

export type AnalyzeCompetitorsError = CompetitorAnalysisRepositoryError | SignalRepositoryError | LLMClientError;

export class AnalyzeCompetitorsUseCase {
  constructor(
    private readonly competitorAnalysisRepo: ICompetitorAnalysisRepository,
    private readonly signalRepo: ISignalRepository,
    private readonly llmClient: ILLMClient,
  ) {}

  async execute(input: AnalyzeCompetitorsInput): Promise<Result<CompetitorAnalysis, AnalyzeCompetitorsError>> {
    const existing = await this.competitorAnalysisRepo.findByIdeaId(input.ideaId);
    if (existing.isErr()) return err(existing.error);
    if (existing.value) return ok(existing.value);

    const signalsResult = await this.signalRepo.findByIdeaId(input.ideaId);
    if (signalsResult.isErr()) return err(signalsResult.error);

    const signals = signalsResult.value;

    const llmResult = await this.llmClient.analyzeCompetitors({
      ideaText: input.ideaText,
      signals,
      traceId: input.traceId,
    });
    if (llmResult.isErr()) return err(llmResult.error);

    const analysis: CompetitorAnalysis = {
      id: crypto.randomUUID(),
      ideaId: input.ideaId,
      userId: input.userId,
      competitors: llmResult.value.competitors,
      gaps: llmResult.value.gaps,
      signalCount: signals.length,
      createdAt: new Date().toISOString(),
    };

    const saveResult = await this.competitorAnalysisRepo.save(analysis);
    if (saveResult.isErr()) return err(saveResult.error);

    return ok(analysis);
  }
}
