import type { Result } from 'neverthrow';
import type { TranscriptAnalysis } from '../domain/transcript-analysis';

export class TranscriptAnalysisRepositoryError extends Error {
  readonly code = 'TRANSCRIPT_ANALYSIS_REPO_ERROR' as const;
}

export interface ITranscriptAnalysisRepository {
  save(analysis: TranscriptAnalysis): Promise<Result<TranscriptAnalysis, TranscriptAnalysisRepositoryError>>;
  findByIdeaId(ideaId: string): Promise<Result<TranscriptAnalysis | null, TranscriptAnalysisRepositoryError>>;
}
