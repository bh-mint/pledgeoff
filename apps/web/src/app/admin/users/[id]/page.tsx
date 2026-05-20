import { requireAdminServer } from '@/lib/admin-auth';
import { createSupabaseServiceClient } from '@/lib/supabase-server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { AdminUserActions } from './AdminUserActions';

function fmt(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <tr style={{ borderBottom: '1px solid var(--border)' }}>
      <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--t3)', fontFamily: 'monospace', width: 180 }}>{label}</td>
      <td style={{ padding: '10px 16px', fontSize: 13, color: 'var(--t1)' }}>{value}</td>
    </tr>
  );
}

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminServer();
  const { id } = await params;
  const supabase = createSupabaseServiceClient();

  const [
    { data: { user } },
    { data: profile },
    { data: sub },
    { data: ideas },
  ] = await Promise.all([
    supabase.auth.admin.getUserById(id),
    supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
    supabase.from('subscriptions').select('*').eq('user_id', id).maybeSingle(),
    supabase.from('ideas').select('id, text, created_at').eq('user_id', id).order('created_at', { ascending: false }),
  ]);

  if (!user) notFound();

  const isBanned = !!user.banned_until && new Date(user.banned_until) > new Date();

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Link href="/admin/users" style={{ fontSize: 12, color: 'var(--t3)', textDecoration: 'none' }}>← Users</Link>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.04em', marginTop: 8, marginBottom: 4, fontFamily: '"Inter Tight", system-ui' }}>
          {profile?.first_name || profile?.last_name
            ? `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim()
            : user.email}
        </h1>
        <p style={{ fontSize: 13, color: 'var(--t3)', fontFamily: 'monospace' }}>{user.id}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Profile */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: 11, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--t3)' }}>Profile</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <Row label="email" value={user.email} />
              <Row label="company" value={profile?.company_name ?? '—'} />
              <Row label="username" value={profile?.username ?? '—'} />
              <Row label="joined" value={fmt(user.created_at)} />
              <Row label="last sign in" value={fmt(user.last_sign_in_at)} />
              <Row label="status" value={isBanned ? <span style={{ color: 'var(--kill)' }}>SUSPENDED</span> : <span style={{ color: 'var(--validated)' }}>Active</span>} />
            </tbody>
          </table>
        </div>

        {/* Subscription */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: 11, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--t3)' }}>Subscription</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <Row label="plan" value={<span style={{ fontWeight: 600, color: 'var(--accent)' }}>{sub?.plan ?? 'free'}</span>} />
              <Row label="status" value={sub?.status ?? 'active'} />
              <Row label="period end" value={fmt(sub?.current_period_end)} />
              <Row label="otto used" value={`${sub?.otto_included_used ?? 0} included + ${sub?.otto_purchased ?? 0} purchased`} />
              <Row label="extra seats" value={sub?.extra_seats ?? 0} />
              <Row label="past due since" value={fmt(sub?.past_due_since)} />
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions */}
      <AdminUserActions userId={id} isBanned={isBanned} currentPlan={sub?.plan ?? 'free'} />

      {/* Ideas */}
      <div style={{ marginTop: 24, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: 11, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--t3)' }}>
          Ideas ({ideas?.length ?? 0})
        </div>
        {!ideas?.length ? (
          <div style={{ padding: 16, fontSize: 13, color: 'var(--t3)' }}>No ideas yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {ideas.map((idea) => (
              <div key={idea.id} style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', fontSize: 13, color: 'var(--t2)' }}>
                <span style={{ color: 'var(--t3)', fontFamily: 'monospace', fontSize: 11, marginRight: 12 }}>{fmt(idea.created_at)}</span>
                {idea.text.slice(0, 120)}{idea.text.length > 120 ? '…' : ''}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
