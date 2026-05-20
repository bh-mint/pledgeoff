export interface UsageLogEntry {
  readonly model: string;
  readonly provider: string;
  readonly feature: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cacheReadTokens: number;
  readonly cacheWriteTokens: number;
  readonly costUsd: number;
  readonly traceId?: string;
  readonly userId?: string;
}

export interface IUsageLogger {
  log(entry: UsageLogEntry): Promise<void>;
}
