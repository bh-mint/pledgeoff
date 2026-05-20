const ACTION_LABELS: Record<string, string> = {
  idea_created: 'Idea submitted',
  feedback_recorded: 'Feedback recorded',
  account_delete_requested: 'Account deletion requested',
  checkout_initiated: 'Checkout initiated',
  billing_portal_accessed: 'Billing portal accessed',
  seat_addon_updated: 'Team seat updated',
  tool_accessed: 'Tool accessed',
  plan_changed: 'Plan changed',
  subscription_cancelled: 'Subscription cancelled',
  subscription_reactivated: 'Subscription reactivated',
  invoice_requested: 'Invoice requested',
};

const ACTION_COLORS: Record<string, string> = {
  idea_created: 'var(--validated)',
  plan_changed: 'var(--accent)',
  subscription_cancelled: 'var(--kill)',
  subscription_reactivated: 'var(--validated)',
  checkout_initiated: 'var(--accent)',
  account_delete_requested: 'var(--kill)',
};

type AuditRow = {
  id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function metaSummary(action: string, meta: Record<string, unknown> | null): string | null {
  if (!meta) return null;
  if (action === 'plan_changed') {
    const from = meta.from_plan ?? meta.from;
    const to = meta.to_plan ?? meta.to;
    if (from && to) return `${from} → ${to}`;
  }
  if (action === 'tool_accessed' && meta.tool) return String(meta.tool);
  if (action === 'idea_created' && meta.idea_id) return `#${String(meta.idea_id).slice(0, 8)}`;
  if (action === 'seat_addon_updated' && meta.seats !== undefined) return `${meta.seats} seats`;
  return null;
}

export function AuditLogSection({ entries }: { entries: AuditRow[] }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="display text-[18px] font-semibold" style={{ color: 'var(--t1)' }}>Activity Log</div>
          <div className="text-[12px] mt-0.5" style={{ color: 'var(--t3)' }}>Last 50 events · your account only</div>
        </div>
        <span
          className="mono text-[10px] px-2 py-1 rounded"
          style={{ background: 'color-mix(in srgb, var(--accent) 10%, transparent)', color: 'var(--accent)', border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)' }}
        >
          Agency
        </span>
      </div>

      {entries.length === 0 ? (
        <div
          className="rounded-md border p-8 text-center"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
        >
          <div className="mono text-[11px]" style={{ color: 'var(--t3)' }}>No activity recorded yet.</div>
        </div>
      ) : (
        <div className="rounded-md border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          {/* Header */}
          <div
            className="grid grid-cols-12 gap-3 px-4 py-2.5 mono text-[10px] uppercase tracking-[0.12em] border-b"
            style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--t3)' }}
          >
            <div className="col-span-2">Time</div>
            <div className="col-span-4">Action</div>
            <div className="col-span-3">Resource</div>
            <div className="col-span-3">Details</div>
          </div>

          {entries.map((entry) => {
            const color = ACTION_COLORS[entry.action] ?? 'var(--t2)';
            const summary = metaSummary(entry.action, entry.metadata);
            return (
              <div
                key={entry.id}
                className="grid grid-cols-12 gap-3 px-4 py-3 border-b items-center"
                style={{ borderColor: 'var(--border)' }}
              >
                <div className="col-span-2 mono text-[10px]" style={{ color: 'var(--t3)' }}>
                  {formatRelative(entry.created_at)}
                </div>
                <div className="col-span-4 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
                  <span className="text-[12px]" style={{ color: 'var(--t1)' }}>
                    {ACTION_LABELS[entry.action] ?? entry.action}
                  </span>
                </div>
                <div className="col-span-3 mono text-[10px]" style={{ color: 'var(--t2)' }}>
                  {entry.resource_type}
                  {entry.resource_id && (
                    <span style={{ color: 'var(--t3)' }}> #{entry.resource_id.slice(0, 8)}</span>
                  )}
                </div>
                <div className="col-span-3 mono text-[10px]" style={{ color: 'var(--t3)' }}>
                  {summary ?? '—'}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
