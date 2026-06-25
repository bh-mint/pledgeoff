import type { Result } from 'neverthrow';
import type { MarketLandscape } from '../domain/market-landscape';

export class MarketLandscapeRepositoryError extends Error {
  readonly code = 'MARKET_LANDSCAPE_REPO_ERROR' as const;
}

export interface IMarketLandscapeRepository {
  save(landscape: MarketLandscape): Promise<Result<MarketLandscape, MarketLandscapeRepositoryError>>;
  findByIdeaId(ideaId: string): Promise<Result<MarketLandscape | null, MarketLandscapeRepositoryError>>;
}
