import { requireAdminServer } from '@/lib/admin-auth';
import { createSupabaseServiceClient } from '@/lib/supabase-server';

const PLAN_MRR: Record<string, number> = {
  pro: 149,
  pro_plus: 249,
  agency: 499,
  free: 0,
};

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: '20px 24px',
    }}>
      <div style={{ fontSize: 11, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--t3)', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.04em', color: 'var(--t1)', fontFamily: '"Inter Tight", system-ui' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export default async function MetricsPage() {
  await requireAdminServer();
  const supabase = createSupabaseServiceClient();

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [
    { data: subs },
    { count: totalUsers },
    { count: ideasToday },
    { count: ideasWeek },
    { count: ideasMonth },
    { count: decisionsTotal },
  ] = await Promise.all([
    supabase.from('subscriptions').select('plan, status, created_at'),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('ideas').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
    supabase.from('ideas').select('id', { count: 'exact', head: true }).gte('created_at', weekStart),
    supabase.from('ideas').select('id', { count: 'exact', head: true }).gte('created_at', monthStart),
    supabase.from('decisions').select('id', { count: 'exact', head: true }),
  ]);

  const activeSubs = (subs ?? []).filter((s) => s.status === 'active' && s.plan !== 'free');
  const mrr = activeSubs.reduce((sum, s) => sum + (PLAN_MRR[s.plan] ?? 0), 0);
  const pastDue = (subs ?? []).filter((s) => s.status === 'past_due').length;

  const planCounts = (subs ?? []).reduce<Record<string, number>>((acc, s) => {
    acc[s.plan] = (acc[s.plan] ?? 0) + 1;
    return acc;
  }, {});

  const newUsersWeek = (subs ?? []).filter((s) => s.created_at >= weekStart).length;

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.04em', marginBottom: 4, fontFamily: '"Inter Tight", system-ui' }}>
        Metrics
      </h1>
      <p style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 32 }}>Live data from production.</p>

      {/* Revenue */}
      <section style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 11, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--t3)', marginBottom: 16 }}>
          Revenue
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <StatCard label="MRR" value={`€${mrr.toLocaleString()}`} sub={`${activeSubs.length} paying users`} />
          <StatCard label="ARR (est.)" value={`€${(mrr * 12).toLocaleString()}`} />
          <StatCard label="Past due" value={pastDue} sub={pastDue > 0 ? 'needs attention' : 'all good'} />
        </div>
      </section>

      {/* Users */}
      <section style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 11, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--t3)', marginBottom: 16 }}>
          Users
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <StatCard label="Total users" value={totalUsers ?? 0} />
          <StatCard label="New this week" value={newUsersWeek} />
          <StatCard label="Paying" value={activeSubs.length} />
          <StatCard label="Free" value={(totalUsers ?? 0) - activeSubs.length} />
        </div>
      </section>

      {/* Plan breakdown */}
      <section style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 11, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--t3)', marginBottom: 16 }}>
          Plan breakdown
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {['free', 'pro', 'pro_plus', 'agency'].map((plan) => (
            <StatCard
              key={plan}
              label={plan.replace('_', '+')}
              value={planCounts[plan] ?? 0}
              sub={plan !== 'free' ? `€${PLAN_MRR[plan] ?? 0}/mo each` : undefined}
            />
          ))}
        </div>
      </section>

      {/* Activity */}
      <section>
        <div style={{ fontSize: 11, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--t3)', marginBottom: 16 }}>
          Activity
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <StatCard label="Ideas today" value={ideasToday ?? 0} />
          <StatCard label="Ideas this week" value={ideasWeek ?? 0} />
          <StatCard label="Ideas this month" value={ideasMonth ?? 0} />
          <StatCard label="Decisions total" value={decisionsTotal ?? 0} />
        </div>
      </section>
    </div>
  );
}
