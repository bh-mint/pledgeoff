import { Result } from 'neverthrow';
import type { CompetitorAnalysis } from '../domain/competitor-analysis';
import type { MarketLandscape } from '../domain/market-landscape';

export class SnapshotRepositoryError extends Error {
  readonly code = 'SNAPSHOT_REPOSITORY_ERROR' as const;
}

export interface ICompetitorSnapshotRepository {
  save(ideaId: string, data: CompetitorAnalysis): Promise<Result<void, SnapshotRepositoryError>>;
  findLatestByIdeaId(ideaId: string): Promise<Result<CompetitorAnalysis | null, SnapshotRepositoryError>>;
}

export interface ILandscapeSnapshotRepository {
  save(ideaId: string, data: MarketLandscape): Promise<Result<void, SnapshotRepositoryError>>;
  findLatestByIdeaId(ideaId: string): Promise<Result<MarketLandscape | null, SnapshotRepositoryError>>;
}
