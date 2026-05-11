import { Result } from 'neverthrow';
import type { BuildAnalysis } from '../domain/build-analysis';

export class BuildAnalysisRepositoryError extends Error {
  readonly code = 'BUILD_ANALYSIS_REPOSITORY_ERROR' as const;
}

export interface IBuildAnalysisRepository {
  save(analysis: BuildAnalysis): Promise<Result<BuildAnalysis, BuildAnalysisRepositoryError>>;
  findByIdeaId(ideaId: string): Promise<Result<BuildAnalysis | null, BuildAnalysisRepositoryError>>;
}
