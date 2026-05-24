import { requireAdminServer } from '@/lib/admin-auth';
import { container } from '@/lib/container';
import { calculateAccuracy } from '@pledgeoff/core';
import { PeriodSelector, ExportCsvButton } from './FlywheelClient';

type Period = '3m' | '6m' | '1y' | 'all';

function periodToDate(period: Period): Date | null {
  const now = new Date();
  if (period === '3m') return new Date(now.setMonth(now.getMonth() - 3));
  if (period === '6m') return new Date(now.setMonth(now.getMonth() - 6));
  if (period === '1y') return new Date(now.setFullYear(now.getFullYear() - 1));
  return null;
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '20px 24px' }}>
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

interface Props {
  searchParams: Promise<{ period?: string }>;
}

export default async function FlywheelPage({ searchParams }: Props) {
  await requireAdminServer();

  const { period: rawPeriod } = await searchParams;
  const period: Period = (['3m', '6m', '1y', 'all'] as const).includes(rawPeriod as Period)
    ? (rawPeriod as Period)
    : 'all';

  const allOutcomesResult = await container._repos.decisionOutcomeRepo.findAll();
  const allOutcomes = allOutcomesResult.isOk() ? allOutcomesResult.value : [];

  const since = periodToDate(period);
  const outcomes = since
    ? allOutcomes.filter((o) => new Date(o.reportedAt) >= since)
    : allOutcomes;

  const stats = calculateAccuracy(outcomes);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.04em', marginBottom: 4, fontFamily: '"Inter Tight", system-ui' }}>
            Data Flywheel
          </h1>
          <p style={{ fontSize: 13, color: 'var(--t2)' }}>
            Verdict accuracy based on user-reported outcomes. Minimum 3 required for rate calculation.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <PeriodSelector current={period} />
          <ExportCsvButton period={period} />
        </div>
      </div>

      {allOutcomesResult.isErr() && (
        <div style={{ color: 'var(--t3)', fontSize: 13 }}>Failed to load flywheel stats.</div>
      )}

      {allOutcomesResult.isOk() && (
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
                sub={stats.totalOutcomes < 3 ? 'need 3+ to calculate accuracy' : `in selected period`}
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
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '24px' }}>
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
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '24px', overflowX: 'auto' }}>
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
