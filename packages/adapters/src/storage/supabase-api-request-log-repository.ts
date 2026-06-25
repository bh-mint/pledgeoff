import { Result, ok, err } from 'neverthrow';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  IApiRequestLogRepository,
  ApiRequestLogEntry,
  ApiRequestSummary,
  ApiRequestEndpointStat,
  ApiRequestKeyStat,
  ApiRequestError,
} from '@pledgeoff/core';
import { createLogger } from '@pledgeoff/observability';

const log = createLogger({ adapter: 'api-request-log' });

type Row = {
  api_key_id: string;
  endpoint: string;
  method: string;
  status_code: number;
  latency_ms: number;
  trace_id: string;
  created_at: string;
  api_keys: { key_prefix: string; name: string } | null;
};

export class SupabaseApiRequestLogRepository implements IApiRequestLogRepository {
  constructor(private readonly client: SupabaseClient) {}

  async log(entry: ApiRequestLogEntry): Promise<void> {
    const { error } = await this.client.from('api_request_log').insert({
      api_key_id: entry.apiKeyId,
      user_id: entry.userId,
      endpoint: entry.endpoint,
      method: entry.method,
      status_code: entry.statusCode,
      latency_ms: entry.latencyMs,
      ip_hash: entry.ipHash,
      trace_id: entry.traceId,
    });

    if (error) {
      log.error(
        { traceId: entry.traceId, target: 'supabase', operation: 'log-api-request', errorCode: error.code },
        `Failed to log API request: ${error.message}`,
      );
    }
  }

  async getUsageSummary(userId: string, days: number): Promise<Result<ApiRequestSummary, Error>> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await this.client
      .from('api_request_log')
      .select('api_key_id, endpoint, method, status_code, latency_ms, trace_id, created_at, api_keys(key_prefix, name)')
      .eq('user_id', userId)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .returns<Row[]>();

    if (error) return err(new Error(error.message));

    const rows = data ?? [];
    const totalCalls = rows.length;
    const successCalls = rows.filter((r) => r.status_code < 400).length;
    const errorCalls = totalCalls - successCalls;

    const sorted = [...rows].map((r) => r.latency_ms).sort((a, b) => a - b);
    const avgLatencyMs = totalCalls > 0 ? Math.round(sorted.reduce((s, v) => s + v, 0) / totalCalls) : 0;
    const p95LatencyMs = sorted.length > 0 ? (sorted[Math.floor(sorted.length * 0.95)] ?? 0) : 0;

    const endpointMap = new Map<string, { calls: number; errors: number; latencySum: number }>();
    for (const r of rows) {
      const cur = endpointMap.get(r.endpoint) ?? { calls: 0, errors: 0, latencySum: 0 };
      endpointMap.set(r.endpoint, {
        calls: cur.calls + 1,
        errors: cur.errors + (r.status_code >= 400 ? 1 : 0),
        latencySum: cur.latencySum + r.latency_ms,
      });
    }
    const byEndpoint: ApiRequestEndpointStat[] = Array.from(endpointMap.entries())
      .map(([endpoint, s]) => ({
        endpoint,
        calls: s.calls,
        errors: s.errors,
        avgLatencyMs: Math.round(s.latencySum / s.calls),
      }))
      .sort((a, b) => b.calls - a.calls);

    const keyMap = new Map<string, { calls: number; errors: number; keyPrefix: string; name: string }>();
    for (const r of rows) {
      if (!r.api_keys) continue;
      const cur = keyMap.get(r.api_key_id) ?? { calls: 0, errors: 0, keyPrefix: r.api_keys.key_prefix, name: r.api_keys.name };
      keyMap.set(r.api_key_id, {
        ...cur,
        calls: cur.calls + 1,
        errors: cur.errors + (r.status_code >= 400 ? 1 : 0),
      });
    }
    const byKey: ApiRequestKeyStat[] = Array.from(keyMap.entries())
      .map(([apiKeyId, s]) => ({ apiKeyId, keyPrefix: s.keyPrefix, name: s.name, calls: s.calls, errors: s.errors }))
      .sort((a, b) => b.calls - a.calls);

    const recentErrors: ApiRequestError[] = rows
      .filter((r) => r.status_code >= 400)
      .slice(0, 10)
      .map((r) => ({ traceId: r.trace_id, endpoint: r.endpoint, statusCode: r.status_code, at: r.created_at }));

    return ok({
      period: `${days}d`,
      summary: {
        totalCalls,
        successCalls,
        errorCalls,
        successRate: totalCalls > 0 ? Math.round((successCalls / totalCalls) * 1000) / 1000 : 1,
        avgLatencyMs,
        p95LatencyMs,
      },
      byEndpoint,
      byKey,
      recentErrors,
    });
  }

  async deleteOlderThan(cutoff: Date): Promise<Result<number, Error>> {
    const { count, error } = await this.client
      .from('api_request_log')
      .delete({ count: 'exact' })
      .lt('created_at', cutoff.toISOString());

    if (error) return err(new Error(error.message));
    return ok(count ?? 0);
  }
}
