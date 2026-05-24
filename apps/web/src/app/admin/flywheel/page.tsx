import { requireAdminServer } from '@/lib/admin-auth';
import { container } from '@/lib/container';

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

function AccuracyBar({ label, correct, total }: { label: string; correct: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((correct / total) * 100);
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: 'var(--t1)', fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 13, fontFamily: 'monospace', color: pct >= 60 ? 'var(--go)' : 'var(--kill)' }}>
          {total === 0 ? 'no data' : `${pct}% (${correct}/${total})`}
        </span>
      </div>
      {total > 0 && (
        <div style={{ height: 6, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: pct >= 60 ? 'var(--go)' : 'var(--kill)', borderRadius: 4, transition: 'width 0.3s ease' }} />
        </div>
      )}
    </div>
  );
}

export default async function FlywheelPage() {
  await requireAdminServer();

  const statsResult = await container.getFlywheelStatsUseCase.execute();
  const stats = statsResult.isOk() ? statsResult.value : null;

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.04em', marginBottom: 4, fontFamily: '"Inter Tight", system-ui' }}>
        Data Flywheel
      </h1>
      <p style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 32 }}>
        Verdict accuracy based on user-reported outcomes. Minimum 3 outcomes required for rate calculation.
      </p>

      {!stats && (
        <div style={{ color: 'var(--t3)', fontSize: 13 }}>Failed to load flywheel stats.</div>
      )}

      {stats && (
        <>
          {/* Overview */}
          <section style={{ marginBottom: 40 }}>
            <div style={{ fontSize: 11, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--t3)', marginBottom: 16 }}>
              Overview
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <StatCard
                label="Total outcomes"
                value={stats.totalOutcomes}
                sub={stats.totalOutcomes < 3 ? 'need 3+ to calculate accuracy' : 'outcomes reported'}
              />
              <StatCard
                label="Overall accuracy"
                value={stats.accuracyRate === null ? '—' : `${stats.accuracyRate}%`}
                sub={stats.accuracyRate === null ? 'insufficient data' : 'GO+KILL correct rate'}
              />
              <StatCard
                label="PIVOT outcomes"
                value={stats.byVerdict.PIVOT.total_reported}
                sub="reported (excluded from accuracy)"
              />
            </div>
          </section>

          {/* By verdict */}
          <section style={{ marginBottom: 40 }}>
            <div style={{ fontSize: 11, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--t3)', marginBottom: 16 }}>
              Accuracy by verdict
            </div>
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '24px',
            }}>
              <AccuracyBar
                label="GO → built_worked"
                correct={stats.byVerdict.GO.correct}
                total={stats.byVerdict.GO.total}
              />
              <AccuracyBar
                label="KILL → not_built"
                correct={stats.byVerdict.KILL.correct}
                total={stats.byVerdict.KILL.total}
              />
            </div>
          </section>

          {/* Monthly trend */}
          {stats.accuracyTrend.length > 0 && (
            <section style={{ marginBottom: 40 }}>
              <div style={{ fontSize: 11, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--t3)', marginBottom: 16 }}>
                Monthly trend
              </div>
              <div style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '24px',
                overflowX: 'auto',
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr>
                      {['Month', 'Outcomes', 'Accuracy'].map((h) => (
                        <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontFamily: 'monospace', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--t3)', borderBottom: '1px solid var(--border)' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stats.accuracyTrend.map((row) => (
                      <tr key={row.month}>
                        <td style={{ padding: '10px 12px', color: 'var(--t1)', borderBottom: '1px solid var(--border)', fontFamily: 'monospace' }}>{row.month}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--t2)', borderBottom: '1px solid var(--border)' }}>{row.count}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', fontFamily: 'monospace', color: row.rate >= 60 ? 'var(--go)' : 'var(--kill)', fontWeight: 600 }}>
                          {row.rate}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {stats.accuracyTrend.length === 0 && (
            <div style={{ color: 'var(--t3)', fontSize: 13, fontStyle: 'italic' }}>
              No trend data yet. Users need to report outcomes for trend analysis.
            </div>
          )}
        </>
      )}
    </div>
  );
}
