import { requireAdminServer } from "@/lib/admin-auth";
import { createSupabaseServiceClient } from "@/lib/supabase-server";

const PLAN_MRR: Record<string, number> = {
  founder: 49,
  team: 99,
  studio: 349,
  enterprise: 1199,
  free: 0,
};

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
    { count: decisionsTotal },
  ] = await Promise.all([
    supabase.from("subscriptions").select("plan, status, created_at"),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("ideas").select("id", { count: "exact", head: true }).gte("created_at", todayStart),
    supabase.from("ideas").select("id", { count: "exact", head: true }).gte("created_at", weekStart),
    supabase.from("decisions").select("id", { count: "exact", head: true }),
  ]);

  const activeSubs = (subs ?? []).filter((s) => s.status === "active" && s.plan !== "free");
  const mrr = activeSubs.reduce((sum, s) => sum + (PLAN_MRR[s.plan] ?? 0), 0);
  const pastDue = (subs ?? []).filter((s) => s.status === "past_due").length;
  const planCounts = (subs ?? []).reduce<Record<string, number>>((acc, s) => {
    acc[s.plan] = (acc[s.plan] ?? 0) + 1;
    return acc;
  }, {});
  const newUsersWeek = (subs ?? []).filter((s) => s.created_at >= weekStart).length;
  const newUsersMonth = (subs ?? []).filter((s) => s.created_at >= monthStart).length;

  const totalAccounts = totalUsers ?? 0;
  const freeCount = planCounts["free"] ?? 0;
  const founderCount = planCounts["founder"] ?? 0;
  const teamCount = planCounts["team"] ?? 0;
  const studioCount = planCounts["studio"] ?? 0;
  const enterpriseCount = planCounts["enterprise"] ?? 0;

  const planTotal = freeCount + founderCount + teamCount + studioCount + enterpriseCount;
  const pct = (n: number) => (planTotal > 0 ? ((n / planTotal) * 100).toFixed(1) : "0") + "%";

  return (
    <div>
      {/* Stats row 1 */}
      <div className="adm-stat-grid">
        <div className="sc">
          <div className="sc-k">Monthly Recurring Revenue</div>
          <div className="sc-v">€{mrr.toLocaleString()}</div>
          <div className="sc-d">{activeSubs.length} paying accounts</div>
        </div>
        <div className="sc">
          <div className="sc-k">Annual Run Rate</div>
          <div className="sc-v">€{(mrr * 12).toLocaleString()}</div>
          <div className="sc-d">projected at current MRR</div>
        </div>
        <div className="sc">
          <div className="sc-k">Total Users</div>
          <div className="sc-v">{totalAccounts.toLocaleString()}</div>
          <div className="sc-d">{activeSubs.length} paid · {totalAccounts - activeSubs.length} free</div>
        </div>
        <div className="sc">
          <div className="sc-k">Past Due</div>
          <div className={`sc-v ${pastDue > 0 ? "piv" : "go"}`}>{pastDue}</div>
          <div className={`sc-d ${pastDue > 0 ? "dn" : ""}`}>{pastDue > 0 ? "needs attention" : "all good"}</div>
        </div>
      </div>

      {/* Stats row 2 */}
      <div className="adm-stat-grid">
        <div className="sc">
          <div className="sc-k">New Signups This Week</div>
          <div className="sc-v go">{newUsersWeek}</div>
          <div className="sc-d">{newUsersMonth} this month</div>
        </div>
        <div className="sc">
          <div className="sc-k">Ideas Today</div>
          <div className="sc-v">{(ideasToday ?? 0).toLocaleString()}</div>
          <div className="sc-d">{(ideasWeek ?? 0).toLocaleString()} this week</div>
        </div>
        <div className="sc">
          <div className="sc-k">Decisions Total</div>
          <div className="sc-v">{(decisionsTotal ?? 0).toLocaleString()}</div>
          <div className="sc-d">all time</div>
        </div>
        <div className="sc">
          <div className="sc-k">Enterprise Accounts</div>
          <div className="sc-v go">{enterpriseCount}</div>
          <div className="sc-d">{studioCount} studio · {teamCount} team</div>
        </div>
      </div>

      {/* Plan distribution */}
      <div className="acard">
        <div className="acard-hd">
          Plan distribution
          <span className="r">{totalAccounts.toLocaleString()} total accounts</span>
        </div>
        <div className="acard-bd">
          <div className="plan-dist">
            <div className="pd-seg pd-free" style={{ width: pct(freeCount) }}>Free</div>
            <div className="pd-seg pd-founder" style={{ width: pct(founderCount) }}>
              {founderCount > 0 ? "Founder" : ""}
            </div>
            <div className="pd-seg pd-team" style={{ width: pct(teamCount) }} />
            <div className="pd-seg pd-studio" style={{ width: pct(studioCount) }} />
            <div className="pd-seg pd-enterprise" style={{ width: pct(enterpriseCount) }} />
          </div>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {[
              { label: "Free", count: freeCount, cls: "pd-free" },
              { label: "Founder", count: founderCount, cls: "pd-founder" },
              { label: "Team", count: teamCount, cls: "pd-team" },
              { label: "Studio", count: studioCount, cls: "pd-studio" },
              { label: "Enterprise", count: enterpriseCount, cls: "pd-enterprise" },
            ].map(({ label, count, cls }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div className={`pd-seg ${cls}`} style={{ width: 10, height: 10, flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: "var(--dim)" }}>
                  {label} <strong style={{ color: "var(--ink)" }}>{count}</strong>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MRR breakdown */}
      <div className="acard">
        <div className="acard-hd">
          MRR breakdown
          <span className="r">paid plans only</span>
        </div>
        <div className="acard-bd" style={{ padding: 0 }}>
          <div className="at-wrap">
            <table className="at">
              <thead>
                <tr>
                  <th>Plan</th>
                  <th>Accounts</th>
                  <th>MRR/account</th>
                  <th>Total MRR</th>
                  <th>% of MRR</th>
                </tr>
              </thead>
              <tbody>
                {(["founder", "team", "studio", "enterprise"] as const).map((plan) => {
                  const count = planCounts[plan] ?? 0;
                  const planMrr = count * PLAN_MRR[plan];
                  const sharePct = mrr > 0 ? Math.round((planMrr / mrr) * 100) : 0;
                  return (
                    <tr key={plan} className="no-click">
                      <td><span className={`pp ${plan}`}>{plan.charAt(0).toUpperCase() + plan.slice(1)}</span></td>
                      <td className="td-mono">{count}</td>
                      <td className="td-mono">€{PLAN_MRR[plan]}</td>
                      <td className="td-mono" style={{ color: "var(--ink)", fontWeight: 600 }}>
                        €{planMrr.toLocaleString()}
                      </td>
                      <td>
                        <div className="mm-wrap">
                          <div className="mm">
                            <div className="mm-f" style={{ width: `${sharePct}%` }} />
                          </div>
                          <span className="mm-v">{sharePct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
