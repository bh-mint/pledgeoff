import { requireAdminServer } from '@/lib/admin-auth';
import { createSupabaseServiceClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

type AggRow = { feature: string; model: string; total_input: number; total_output: number; total_cost: number; call_count: number };
type DailyRow = { day: string; total_cost: number };
type TopUserRow = { user_id: string; email: string | null; total_cost: number; call_count: number };

function fmt(n: number, decimals = 2): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '20px 24px', minWidth: 160 }}>
      <div style={{ fontSize: 12, color: 'var(--t3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--t1)', letterSpacing: '-0.04em' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export default async function AiCostPage() {
  await requireAdminServer();
  const supabase = createSupabaseServiceClient();

  const now = new Date();
  const todayStart = new Date(now); todayStart.setUTCHours(0, 0, 0, 0);
  const weekStart = new Date(now); weekStart.setUTCDate(now.getUTCDate() - 6); weekStart.setUTCHours(0, 0, 0, 0);
  const monthStart = new Date(now); monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0);

  const [todayRes, weekRes, monthRes, totalRes, byFeatureRes, dailyRes, topUsersRes] = await Promise.all([
    supabase.rpc('admin_ai_usage_total', { since: todayStart.toISOString() }),
    supabase.rpc('admin_ai_usage_total', { since: weekStart.toISOString() }),
    supabase.rpc('admin_ai_usage_total', { since: monthStart.toISOString() }),
    supabase.rpc('admin_ai_usage_total_all'),
    supabase.rpc('admin_ai_usage_by_feature', { since: monthStart.toISOString() }),
    supabase.rpc('admin_ai_usage_daily', { since: weekStart.toISOString() }),
    supabase.rpc('admin_ai_top_users', { since: monthStart.toISOString(), limit_count: 10 }),
  ]);

  const todayCost = Number(todayRes.data ?? 0);
  const weekCost = Number(weekRes.data ?? 0);
  const monthCost = Number(monthRes.data ?? 0);
  const totalCost = Number(totalRes.data ?? 0);

  const byFeature: AggRow[] = byFeatureRes.data ?? [];
  const daily: DailyRow[] = dailyRes.data ?? [];
  const topUsers: TopUserRow[] = topUsersRes.data ?? [];

  const tdStyle: React.CSSProperties = { padding: '10px 14px', borderBottom: '1px solid var(--border)', fontSize: 13, color: 'var(--t2)' };
  const thStyle: React.CSSProperties = { padding: '10px 14px', borderBottom: '1px solid var(--border)', fontSize: 11, color: 'var(--t3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'left' };

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '-0.04em', color: 'var(--t1)', marginBottom: 24 }}>
        AI Cost
      </h1>

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 32 }}>
        <StatCard label="Today" value={`$${fmt(todayCost, 4)}`} />
        <StatCard label="Last 7 days" value={`$${fmt(weekCost, 4)}`} />
        <StatCard label="This month" value={`$${fmt(monthCost, 4)}`} />
        <StatCard label="All time" value={`$${fmt(totalCost, 4)}`} />
      </div>

      {/* Daily breakdown */}
      {daily.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)', marginBottom: 12 }}>Daily (last 7 days)</h2>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Date</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Cost</th>
                </tr>
              </thead>
              <tbody>
                {daily.map((row) => (
                  <tr key={row.day}>
                    <td style={tdStyle}>{row.day}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace' }}>${fmt(Number(row.total_cost), 4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* By feature */}
      {byFeature.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)', marginBottom: 12 }}>By feature (this month)</h2>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Feature</th>
                  <th style={thStyle}>Model</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Calls</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Input tk</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Output tk</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Cost</th>
                </tr>
              </thead>
              <tbody>
                {byFeature.map((row, i) => (
                  <tr key={i}>
                    <td style={tdStyle}>{row.feature}</td>
                    <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12 }}>{row.model}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{Number(row.call_count).toLocaleString()}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace' }}>{Number(row.total_input).toLocaleString()}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace' }}>{Number(row.total_output).toLocaleString()}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace' }}>${fmt(Number(row.total_cost), 4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Top users (Otto) */}
      {topUsers.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)', marginBottom: 12 }}>Top users by cost (this month)</h2>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>User</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Calls</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Cost</th>
                </tr>
              </thead>
              <tbody>
                {topUsers.map((row) => (
                  <tr key={row.user_id}>
                    <td style={tdStyle}>{row.email ?? row.user_id}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{Number(row.call_count).toLocaleString()}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace' }}>${fmt(Number(row.total_cost), 4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {byFeature.length === 0 && daily.length === 0 && (
        <p style={{ color: 'var(--t3)', fontSize: 14 }}>No AI usage logged yet. Data appears once the Anthropic adapter processes its first request.</p>
      )}
    </div>
  );
}
