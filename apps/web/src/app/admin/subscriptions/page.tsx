import { requireAdminServer } from '@/lib/admin-auth';
import { createSupabaseServiceClient } from '@/lib/supabase-server';
import Link from 'next/link';

function fmt(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUS_COLOR: Record<string, string> = {
  active: 'var(--validated)', past_due: 'var(--caution)', canceled: 'var(--t3)',
  trialing: '#60a5fa', incomplete: 'var(--kill)',
};

export default async function SubscriptionsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdminServer();
  const { status } = await searchParams;
  const supabase = createSupabaseServiceClient();

  const { data: subs } = await supabase.from('subscriptions').select('*').order('updated_at', { ascending: false });
  const { data: profiles } = await supabase.from('profiles').select('id, email, first_name, last_name');
  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));

  const filtered = status ? (subs ?? []).filter((s) => s.status === status) : (subs ?? []);

  const statuses = ['active', 'past_due', 'canceled', 'trialing', 'incomplete'];

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.04em', marginBottom: 4, fontFamily: '"Inter Tight", system-ui' }}>Subscriptions</h1>
      <p style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 20 }}>{filtered.length} records</p>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <Link href="/admin/subscriptions" style={{ fontSize: 12, padding: '5px 12px', borderRadius: 20, border: '1px solid var(--border)', color: !status ? 'var(--t1)' : 'var(--t3)', background: !status ? 'var(--surface)' : 'transparent', textDecoration: 'none' }}>All</Link>
        {statuses.map((s) => (
          <Link key={s} href={`/admin/subscriptions?status=${s}`} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 20, border: '1px solid var(--border)', color: status === s ? STATUS_COLOR[s] : 'var(--t3)', background: status === s ? 'var(--surface)' : 'transparent', textDecoration: 'none' }}>{s.replace('_', ' ')}</Link>
        ))}
      </div>

      <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
              {['User', 'Plan', 'Status', 'Period end', 'Otto', 'Stripe sub'].map((h) => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--t3)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((sub) => {
              const p = profileMap[sub.user_id];
              return (
                <tr key={sub.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 16px' }}>
                    <Link href={`/admin/users/${sub.user_id}`} style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
                      {p?.first_name || p?.last_name ? `${p?.first_name ?? ''} ${p?.last_name ?? ''}`.trim() : p?.email ?? sub.user_id.slice(0, 8)}
                    </Link>
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 12, fontFamily: 'monospace', fontWeight: 600, color: 'var(--accent)' }}>{sub.plan}</td>
                  <td style={{ padding: '10px 16px', fontSize: 12, color: STATUS_COLOR[sub.status] ?? 'var(--t3)' }}>{sub.status}</td>
                  <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--t3)' }}>{fmt(sub.current_period_end)}</td>
                  <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--t2)' }}>{sub.otto_included_used}+{sub.otto_purchased}</td>
                  <td style={{ padding: '10px 16px', fontSize: 11, fontFamily: 'monospace', color: 'var(--t3)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub.stripe_subscription_id ?? '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
