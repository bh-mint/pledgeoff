import type { SupabaseClient } from '@supabase/supabase-js';
import type { IUsageLogger, UsageLogEntry } from '@pledgeoff/core';
import { createLogger } from '@pledgeoff/observability';

const log = createLogger({ adapter: 'supabase-usage-log' });

export class SupabaseUsageLogAdapter implements IUsageLogger {
  constructor(private readonly supabase: SupabaseClient) {}

  async log(entry: UsageLogEntry): Promise<void> {
    const { error } = await this.supabase.from('ai_usage_log').insert({
      model: entry.model,
      provider: entry.provider,
      feature: entry.feature,
      input_tokens: entry.inputTokens,
      output_tokens: entry.outputTokens,
      cache_read_tokens: entry.cacheReadTokens,
      cache_write_tokens: entry.cacheWriteTokens,
      cost_usd: entry.costUsd,
      trace_id: entry.traceId ?? null,
      user_id: entry.userId ?? null,
    });

    if (error) {
      log.error({ traceId: entry.traceId ?? 'none', target: 'supabase', operation: 'log-ai-usage', errorCode: error.code }, `Failed to log AI usage: ${error.message}`);
    }
  }
}
