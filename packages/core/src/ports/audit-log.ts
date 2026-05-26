export type AuditAction =
  | 'idea_created'
  | 'feedback_recorded'
  | 'account_delete_requested'
  | 'checkout_initiated'
  | 'billing_portal_accessed'
  | 'seat_addon_updated'
  | 'tool_accessed'
  | 'plan_changed'
  | 'subscription_cancelled'
  | 'subscription_reactivated'
  | 'invoice_requested'
  | 'rate_limited';

export type AuditEntry = {
  readonly userId: string;
  readonly action: AuditAction;
  readonly resourceType: string;
  readonly resourceId?: string;
  readonly metadata?: Record<string, unknown>;
  readonly traceId?: string;
};

export interface IAuditLog {
  log(entry: AuditEntry): Promise<void>;
}
