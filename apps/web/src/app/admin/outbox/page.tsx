import { requireAdminServer } from '@/lib/admin-auth';
import { createSupabaseServiceClient } from '@/lib/supabase-server';
import { OutboxActions } from './OutboxActions';

function fmt(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default async function OutboxPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  await requireAdminServer();
  const { filter } = await searchParams;
  const supabase = createSupabaseServiceClient();

  let query = supabase.from('outbox').select('*').order('created_at', { ascending: false }).limit(200);
  if (filter === 'pending') query = query.eq('processed', false);
  else if (filter === 'failed') query = query.eq('processed', false).gt('attempts', 0);
  else if (filter === 'done') query = query.eq('processed', true);

  const { data: events } = await query;

  const pending = (events ?? []).filter((e) => !e.processed && e.attempts === 0).length;
  const failed = (events ?? []).filter((e) => !e.processed && e.attempts > 0).length;
  const done = (events ?? []).filter((e) => e.processed).length;

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.04em', marginBottom: 4, fontFamily: '"Inter Tight", system-ui' }}>Outbox</h1>

      {/* Summary */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, marginTop: 12 }}>
        {[
          { label: 'Pending', count: pending, color: 'var(--caution)', f: 'pending' },
          { label: 'Failed', count: failed, color: 'var(--kill)', f: 'failed' },
          { label: 'Done', count: done, color: 'var(--validated)', f: 'done' },
        ].map(({ label, count, color, f }) => (
          <a key={f} href={`/admin/outbox?filter=${f}`} style={{ textDecoration: 'none', background: 'var(--surface)', border: `1px solid var(--border)`, borderRadius: 8, padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 4, cursor: 'pointer' }}>
            <span style={{ fontSize: 24, fontWeight: 700, color, fontFamily: '"Inter Tight", system-ui' }}>{count}</span>
            <span style={{ fontSize: 11, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--t3)' }}>{label}</span>
          </a>
        ))}
        <a href="/admin/outbox" style={{ textDecoration: 'none', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--t1)', fontFamily: '"Inter Tight", system-ui' }}>{(events ?? []).length}</span>
          <span style={{ fontSize: 11, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--t3)' }}>Total (last 200)</span>
        </a>
      </div>

      <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
              {['Event type', 'Status', 'Attempts', 'Error', 'Created', ''].map((h) => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--t3)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(events ?? []).map((ev) => (
              <tr key={ev.event_id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 16px', fontSize: 12, fontFamily: 'monospace', color: 'var(--t1)' }}>{ev.event_type}</td>
                <td style={{ padding: '10px 16px', fontSize: 12 }}>
                  {ev.processed
                    ? <span style={{ color: 'var(--validated)' }}>done</span>
                    : ev.attempts > 0
                      ? <span style={{ color: 'var(--kill)' }}>failed</span>
                      : <span style={{ color: 'var(--caution)' }}>pending</span>}
                </td>
                <td style={{ padding: '10px 16px', fontSize: 12, color: ev.attempts > 0 ? 'var(--kill)' : 'var(--t3)' }}>{ev.attempts}</td>
                <td style={{ padding: '10px 16px', fontSize: 11, color: 'var(--kill)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {ev.last_error ?? '—'}
                </td>
                <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--t3)' }}>{fmt(ev.created_at)}</td>
                <td style={{ padding: '10px 16px' }}>
                  {!ev.processed && <OutboxActions eventId={ev.event_id} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
