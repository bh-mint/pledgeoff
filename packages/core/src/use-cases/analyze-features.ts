import { Result, err, ok } from 'neverthrow';
import type { ILLMClient, LLMClientError } from '../ports/llm-client';
import type { IFeatureAnalysisRepository, FeatureAnalysisRepositoryError } from '../ports/IFeatureAnalysisRepository';
import type { FeatureAnalysis } from '../domain/feature-analysis';

export type AnalyzeFeaturesInput = {
  readonly ideaId: string;
  readonly userId: string;
  readonly ideaText: string;
  readonly competitorNames: string[];
  readonly traceId: string;
};

export type AnalyzeFeaturesError = LLMClientError | FeatureAnalysisRepositoryError;

export class AnalyzeFeaturesUseCase {
  constructor(
    private readonly llmClient: ILLMClient,
    private readonly featureRepo: IFeatureAnalysisRepository,
  ) {}

  async execute(input: AnalyzeFeaturesInput): Promise<Result<FeatureAnalysis, AnalyzeFeaturesError>> {
    const llmResult = await this.llmClient.analyzeFeatures({
      ideaText: input.ideaText,
      competitorNames: input.competitorNames,
      traceId: input.traceId,
    });
    if (llmResult.isErr()) return err(llmResult.error);

    const analysis: FeatureAnalysis = {
      id: crypto.randomUUID(),
      ideaId: input.ideaId,
      userId: input.userId,
      features: llmResult.value.features,
      competitorNames: input.competitorNames,
      createdAt: new Date().toISOString(),
    };

    const saveResult = await this.featureRepo.save(analysis);
    if (saveResult.isErr()) return err(saveResult.error);

    return ok(saveResult.value);
  }
}
