import type { SupabaseClient } from '@supabase/supabase-js';
import type { IAuditLog, AuditEntry } from '@pledgeoff/core';
import { createLogger } from '@pledgeoff/observability';

const log = createLogger({ adapter: 'audit-log' });

export class SupabaseAuditLogAdapter implements IAuditLog {
  constructor(private readonly client: SupabaseClient) {}

  async log(entry: AuditEntry): Promise<void> {
    const { error } = await this.client.from('audit_log').insert({
      user_id: entry.userId,
      action: entry.action,
      resource_type: entry.resourceType,
      resource_id: entry.resourceId ?? null,
      metadata: entry.metadata ?? null,
      trace_id: entry.traceId ?? null,
    });

    if (error) {
      log.error(
        { action: entry.action, userId: entry.userId, traceId: entry.traceId ?? 'unknown' },
        `Audit log write failed: ${error.message}`,
      );
    }
  }
}

export class InMemoryAuditLog implements IAuditLog {
  readonly entries: AuditEntry[] = [];

  async log(entry: AuditEntry): Promise<void> {
    this.entries.push(entry);
  }
}

export type { AuditEntry };
