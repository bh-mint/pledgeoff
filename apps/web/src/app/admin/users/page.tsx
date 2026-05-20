import { requireAdminServer } from '@/lib/admin-auth';
import { createSupabaseServiceClient } from '@/lib/supabase-server';
import Link from 'next/link';

const PLAN_BADGE: Record<string, { label: string; color: string }> = {
  free:     { label: 'Free',     color: 'var(--t3)' },
  pro:      { label: 'Pro',      color: '#60a5fa' },
  pro_plus: { label: 'Pro+',     color: 'var(--accent)' },
  agency:   { label: 'Agency',   color: 'var(--validated)' },
};

const STATUS_COLOR: Record<string, string> = {
  active:     'var(--validated)',
  past_due:   'var(--caution)',
  canceled:   'var(--t3)',
  trialing:   '#60a5fa',
  incomplete: 'var(--kill)',
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdminServer();
  const { q } = await searchParams;
  const supabase = createSupabaseServiceClient();

  const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 500 });
  const { data: profiles } = await supabase.from('profiles').select('id, first_name, last_name, company_name, created_at');
  const { data: subs } = await supabase.from('subscriptions').select('user_id, plan, status, past_due_since');

  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));
  const subMap = Object.fromEntries((subs ?? []).map((s) => [s.user_id, s]));

  const filtered = (users ?? []).filter((u) => {
    if (!q) return true;
    const search = q.toLowerCase();
    return (
      u.email?.toLowerCase().includes(search) ||
      profileMap[u.id]?.first_name?.toLowerCase().includes(search) ||
      profileMap[u.id]?.last_name?.toLowerCase().includes(search) ||
      profileMap[u.id]?.company_name?.toLowerCase().includes(search)
    );
  });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.04em', marginBottom: 4, fontFamily: '"Inter Tight", system-ui' }}>
            Users
          </h1>
          <p style={{ fontSize: 13, color: 'var(--t2)' }}>{filtered.length} of {users?.length ?? 0} users</p>
        </div>
        <form method="GET">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search email, name, company…"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              padding: '8px 12px',
              fontSize: 13,
              color: 'var(--t1)',
              outline: 'none',
              width: 280,
            }}
          />
        </form>
      </div>

      <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
              {['User', 'Plan', 'Status', 'Joined', ''].map((h) => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--t3)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((user) => {
              const profile = profileMap[user.id];
              const sub = subMap[user.id];
              const plan = sub?.plan ?? 'free';
              const badge = PLAN_BADGE[plan] ?? PLAN_BADGE.free;
              const isBanned = !!user.banned_until && new Date(user.banned_until) > new Date();

              return (
                <tr key={user.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--t1)' }}>
                      {profile?.first_name || profile?.last_name
                        ? `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim()
                        : user.email}
                    </div>
                    {(profile?.first_name || profile?.last_name) && (
                      <div style={{ fontSize: 12, color: 'var(--t3)', fontFamily: 'monospace' }}>{user.email}</div>
                    )}
                    {profile?.company_name && (
                      <div style={{ fontSize: 11, color: 'var(--t3)' }}>{profile.company_name}</div>
                    )}
                    {isBanned && (
                      <div style={{ fontSize: 10, color: 'var(--kill)', fontFamily: 'monospace', textTransform: 'uppercase', marginTop: 2 }}>SUSPENDED</div>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 600, color: badge.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {badge.label}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: 12, color: STATUS_COLOR[sub?.status ?? 'active'] ?? 'var(--t3)' }}>
                      {sub?.status ?? 'active'}
                      {sub?.past_due_since && <span style={{ color: 'var(--caution)', marginLeft: 6, fontSize: 11 }}>since {fmt(sub.past_due_since)}</span>}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--t3)' }}>
                    {fmt(user.created_at ?? profile?.created_at ?? '')}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <Link
                      href={`/admin/users/${user.id}`}
                      style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
