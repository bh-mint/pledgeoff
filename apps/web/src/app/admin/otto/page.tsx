import { requireAdminServer } from '@/lib/admin-auth';
import { createSupabaseServiceClient } from '@/lib/supabase-server';
import Link from 'next/link';

export default async function OttoPage() {
  await requireAdminServer();
  const supabase = createSupabaseServiceClient();

  const { data: subs } = await supabase
    .from('subscriptions')
    .select('user_id, plan, otto_included_used, otto_purchased, otto_included_reset_at')
    .or('otto_included_used.gt.0,otto_purchased.gt.0')
    .order('otto_included_used', { ascending: false });

  const { data: profiles } = await supabase.from('profiles').select('id, first_name, last_name, email');
  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));

  const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 500 });
  const emailMap = Object.fromEntries((users ?? []).map((u) => [u.id, u.email]));

  const totalIncludedUsed = (subs ?? []).reduce((s, r) => s + r.otto_included_used, 0);
  const totalPurchased = (subs ?? []).reduce((s, r) => s + r.otto_purchased, 0);

  function fmt(iso: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.04em', marginBottom: 4, fontFamily: '"Inter Tight", system-ui' }}>Otto usage</h1>
      <p style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 24 }}>Users with Otto activity ({subs?.length ?? 0})</p>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total included used', value: totalIncludedUsed },
          { label: 'Total purchased remaining', value: totalPurchased },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '16px 20px', flex: 1 }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--t1)', fontFamily: '"Inter Tight", system-ui' }}>{value}</div>
            <div style={{ fontSize: 11, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--t3)', marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
              {['User', 'Plan', 'Included used', 'Purchased left', 'Reset date'].map((h) => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--t3)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(subs ?? []).map((sub) => {
              const p = profileMap[sub.user_id];
              const email = emailMap[sub.user_id];
              const name = p?.first_name || p?.last_name ? `${p?.first_name ?? ''} ${p?.last_name ?? ''}`.trim() : email;
              return (
                <tr key={sub.user_id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 16px' }}>
                    <Link href={`/admin/users/${sub.user_id}`} style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none' }}>{name}</Link>
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 12, fontFamily: 'monospace', color: 'var(--t2)' }}>{sub.plan}</td>
                  <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600, color: sub.otto_included_used > 3 ? 'var(--caution)' : 'var(--t1)' }}>{sub.otto_included_used}</td>
                  <td style={{ padding: '10px 16px', fontSize: 13, color: sub.otto_purchased > 0 ? 'var(--validated)' : 'var(--t3)' }}>{sub.otto_purchased}</td>
                  <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--t3)' }}>{fmt(sub.otto_included_reset_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
