import { requireAdminServer } from "@/lib/admin-auth";
import { container } from "@/lib/container";
import { calculateAccuracy } from "@pledgeoff/core";
import { PeriodSelector, ExportCsvButton } from "./FlywheelClient";

type Period = "3m" | "6m" | "1y" | "all";

function periodToDate(period: Period): Date | null {
  const now = new Date();
  if (period === "3m") return new Date(now.setMonth(now.getMonth() - 3));
  if (period === "6m") return new Date(now.setMonth(now.getMonth() - 6));
  if (period === "1y") return new Date(now.setFullYear(now.getFullYear() - 1));
  return null;
}

interface Props {
  searchParams: Promise<{ period?: string }>;
}

export default async function FlywheelPage({ searchParams }: Props) {
  await requireAdminServer();

  const { period: rawPeriod } = await searchParams;
  const period: Period = (["3m", "6m", "1y", "all"] as const).includes(rawPeriod as Period)
    ? (rawPeriod as Period)
    : "all";

  const allOutcomesResult = await container.decisionOutcomeRepo.findAll();
  const allOutcomes = allOutcomesResult.isOk() ? allOutcomesResult.value : [];

  const since = periodToDate(period);
  const outcomes = since
    ? allOutcomes.filter((o) => new Date(o.reportedAt) >= since)
    : allOutcomes;

  const stats = calculateAccuracy(outcomes);

  return (
    <div>
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 8,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <PeriodSelector current={period} />
        <ExportCsvButton period={period} />
      </div>

      {allOutcomesResult.isErr() && (
        <div className="acard">
          <div className="acard-bd" style={{ color: "var(--kill)", fontSize: 13 }}>
            Failed to load flywheel stats.
          </div>
        </div>
      )}

      {allOutcomesResult.isOk() && (
        <>
          {/* Overview stat cards */}
          <div className="adm-stat-grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
            <div className="sc">
              <div className="sc-k">Total outcomes</div>
              <div className="sc-v">{stats.totalOutcomes}</div>
              <div className="sc-d">
                {stats.totalOutcomes < 3 ? "need 3+ for accuracy" : "in selected period"}
              </div>
            </div>
            <div className="sc">
              <div className="sc-k">Overall accuracy</div>
              <div className={`sc-v ${stats.accuracyRate !== null && stats.accuracyRate >= 60 ? "go" : ""}`}>
                {stats.accuracyRate === null ? "—" : `${stats.accuracyRate}%`}
              </div>
              <div className="sc-d">
                {stats.accuracyRate === null ? "insufficient data" : "GO+KILL correct rate"}
              </div>
            </div>
            <div className="sc">
              <div className="sc-k">PIVOT outcomes</div>
              <div className="sc-v">{stats.byVerdict.PIVOT.total_reported}</div>
              <div className="sc-d">excluded from accuracy</div>
            </div>
          </div>

          {/* Accuracy by verdict */}
          <div className="acard">
            <div className="acard-hd">Accuracy by verdict</div>
            <div className="acard-bd">
              {(
                [
                  {
                    label: "GO → built_worked",
                    correct: stats.byVerdict.GO.correct,
                    total: stats.byVerdict.GO.total,
                  },
                  {
                    label: "KILL → not_built",
                    correct: stats.byVerdict.KILL.correct,
                    total: stats.byVerdict.KILL.total,
                  },
                ] as const
              ).map(({ label, correct, total }) => {
                const pct = total === 0 ? 0 : Math.round((correct / total) * 100);
                return (
                  <div key={label} style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span className="td-main">{label}</span>
                      <span
                        className="td-mono"
                        style={{ color: pct >= 60 ? "var(--go)" : "var(--kill)" }}
                      >
                        {total === 0 ? "no data" : `${pct}% (${correct}/${total})`}
                      </span>
                    </div>
                    {total > 0 && (
                      <div className="mm" style={{ position: "relative", height: 6 }}>
                        <div
                          className={`mm-f ${pct > 85 ? "" : pct < 40 ? "w" : ""}`}
                          style={{
                            width: `${pct}%`,
                            background: pct >= 60 ? "var(--go)" : "var(--kill)",
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Monthly trend */}
          {stats.accuracyTrend.length > 0 && (
            <div className="acard">
              <div className="acard-hd">
                Monthly trend
                <span className="r">{stats.accuracyTrend.length} months</span>
              </div>
              <div className="acard-bd" style={{ padding: 0 }}>
                <div className="at-wrap">
                  <table className="at">
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th>Outcomes</th>
                        <th style={{ textAlign: "right" }}>Accuracy</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.accuracyTrend.map((row) => (
                        <tr key={row.month} className="no-click">
                          <td className="td-mono">{row.month}</td>
                          <td className="td-mono">{row.count}</td>
                          <td
                            className="td-mono"
                            style={{
                              textAlign: "right",
                              color: row.rate >= 60 ? "var(--go)" : "var(--kill)",
                              fontWeight: 600,
                            }}
                          >
                            {row.rate}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {stats.accuracyTrend.length === 0 && (
            <div className="acard">
              <div className="acard-bd" style={{ color: "var(--faint)", fontSize: 13 }}>
                No trend data yet. Users need to report outcomes for trend analysis.
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
