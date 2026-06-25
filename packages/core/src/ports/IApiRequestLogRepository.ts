import { Result } from 'neverthrow';

export type ApiRequestLogEntry = {
  readonly apiKeyId: string;
  readonly userId: string;
  readonly endpoint: string;
  readonly method: string;
  readonly statusCode: number;
  readonly latencyMs: number;
  readonly ipHash: string;
  readonly traceId: string;
};

export type ApiRequestEndpointStat = {
  readonly endpoint: string;
  readonly calls: number;
  readonly errors: number;
  readonly avgLatencyMs: number;
};

export type ApiRequestKeyStat = {
  readonly apiKeyId: string;
  readonly keyPrefix: string;
  readonly name: string;
  readonly calls: number;
  readonly errors: number;
};

export type ApiRequestError = {
  readonly traceId: string;
  readonly endpoint: string;
  readonly statusCode: number;
  readonly at: string;
};

export type ApiRequestSummary = {
  readonly period: string;
  readonly summary: {
    readonly totalCalls: number;
    readonly successCalls: number;
    readonly errorCalls: number;
    readonly successRate: number;
    readonly avgLatencyMs: number;
    readonly p95LatencyMs: number;
  };
  readonly byEndpoint: readonly ApiRequestEndpointStat[];
  readonly byKey: readonly ApiRequestKeyStat[];
  readonly recentErrors: readonly ApiRequestError[];
};

export interface IApiRequestLogRepository {
  log(entry: ApiRequestLogEntry): Promise<void>;
  getUsageSummary(userId: string, days: number): Promise<Result<ApiRequestSummary, Error>>;
  deleteOlderThan(cutoff: Date): Promise<Result<number, Error>>;
}
