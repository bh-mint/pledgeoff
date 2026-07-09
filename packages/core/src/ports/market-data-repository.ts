import { Result } from 'neverthrow';

/**
 * Verified market data about a competitor organization, sourced from an
 * external provider (Crunchbase Basic tier for now). All fields except the
 * name are nullable — providers expose different field sets per plan.
 */
export type CompetitorMarketData = {
  readonly name: string;
  /** Total funding raised, in USD. */
  readonly fundingTotalUsd: number | null;
  /** Human-readable employee range, e.g. "11–50". */
  readonly numEmployeesRange: string | null;
  readonly foundedYear: number | null;
  /** Last funding round type, e.g. "series_a". */
  readonly lastFundingType: string | null;
  /** ISO date of the last funding round. */
  readonly lastFundingAt: string | null;
};

export class MarketDataError extends Error {
  readonly code = 'MARKET_DATA_ERROR' as const;
}

export interface IMarketDataRepository {
  /**
   * Look up an organization by name. Returns ok(null) when no confident
   * match exists — a wrong-company match is worse than no data.
   */
  findOrganization(
    name: string,
    traceId: string,
  ): Promise<Result<CompetitorMarketData | null, MarketDataError>>;
}
