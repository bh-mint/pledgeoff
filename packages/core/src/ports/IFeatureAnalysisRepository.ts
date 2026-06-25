import { Result } from 'neverthrow';
import type { FeatureAnalysis } from '../domain/feature-analysis';

export class FeatureAnalysisRepositoryError extends Error {
  readonly code = 'FEATURE_ANALYSIS_REPO_ERROR';
}

export interface IFeatureAnalysisRepository {
  save(analysis: FeatureAnalysis): Promise<Result<FeatureAnalysis, FeatureAnalysisRepositoryError>>;
  findByIdeaId(ideaId: string): Promise<Result<FeatureAnalysis | null, FeatureAnalysisRepositoryError>>;
}
