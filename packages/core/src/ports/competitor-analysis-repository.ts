import { Result } from 'neverthrow';
import type { CompetitorAnalysis } from '../domain/competitor-analysis';

export class CompetitorAnalysisRepositoryError extends Error {
  readonly code = 'COMPETITOR_ANALYSIS_REPOSITORY_ERROR' as const;
}

export interface ICompetitorAnalysisRepository {
  save(analysis: CompetitorAnalysis): Promise<Result<CompetitorAnalysis, CompetitorAnalysisRepositoryError>>;
  findByIdeaId(ideaId: string): Promise<Result<CompetitorAnalysis | null, CompetitorAnalysisRepositoryError>>;
}
