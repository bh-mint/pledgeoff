import { requireAdminServer } from "@/lib/admin-auth";
import { createSupabaseServiceClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

type AggRow = {
  feature: string;
  model: string;
  total_input: number;
  total_output: number;
  total_cost: number;
  call_count: number;
};
type DailyRow = { day: string; total_cost: number };
type TopUserRow = { user_id: string; email: string | null; total_cost: number; call_count: number };

function fmt(n: number, decimals = 2): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export default async function AiCostPage() {
  await requireAdminServer();
  const supabase = createSupabaseServiceClient();

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);
  const weekStart = new Date(now);
  weekStart.setUTCDate(now.getUTCDate() - 6);
  weekStart.setUTCHours(0, 0, 0, 0);
  const monthStart = new Date(now);
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [todayRes, weekRes, monthRes, totalRes, byFeatureRes, dailyRes, topUsersRes] =
    await Promise.all([
      supabase.rpc("admin_ai_usage_total", { since: todayStart.toISOString() }),
      supabase.rpc("admin_ai_usage_total", { since: weekStart.toISOString() }),
      supabase.rpc("admin_ai_usage_total", { since: monthStart.toISOString() }),
      supabase.rpc("admin_ai_usage_total_all"),
      supabase.rpc("admin_ai_usage_by_feature", { since: monthStart.toISOString() }),
      supabase.rpc("admin_ai_usage_daily", { since: weekStart.toISOString() }),
      supabase.rpc("admin_ai_top_users", { since: monthStart.toISOString(), limit_count: 10 }),
    ]);

  const todayCost = Number(todayRes.data ?? 0);
  const weekCost = Number(weekRes.data ?? 0);
  const monthCost = Number(monthRes.data ?? 0);
  const totalCost = Number(totalRes.data ?? 0);

  const byFeature: AggRow[] = byFeatureRes.data ?? [];
  const daily: DailyRow[] = dailyRes.data ?? [];
  const topUsers: TopUserRow[] = topUsersRes.data ?? [];

  return (
    <div>
      {/* Summary stat cards */}
      <div className="adm-stat-grid">
        <div className="sc">
          <div className="sc-k">Today</div>
          <div className="sc-v">${fmt(todayCost, 4)}</div>
        </div>
        <div className="sc">
          <div className="sc-k">Last 7 days</div>
          <div className="sc-v">${fmt(weekCost, 4)}</div>
        </div>
        <div className="sc">
          <div className="sc-k">This month</div>
          <div className="sc-v">${fmt(monthCost, 4)}</div>
        </div>
        <div className="sc">
          <div className="sc-k">All time</div>
          <div className="sc-v">${fmt(totalCost, 4)}</div>
        </div>
      </div>

      {/* Daily breakdown */}
      {daily.length > 0 && (
        <div className="acard">
          <div className="acard-hd">
            Daily cost
            <span className="r">Last 7 days</span>
          </div>
          <div className="acard-bd" style={{ padding: 0 }}>
            <div className="at-wrap">
              <table className="at">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th style={{ textAlign: "right" }}>Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {daily.map((row) => (
                    <tr key={row.day} className="no-click">
                      <td className="td-main">{row.day}</td>
                      <td className="td-mono" style={{ textAlign: "right" }}>
                        ${fmt(Number(row.total_cost), 4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* By feature */}
      {byFeature.length > 0 && (
        <div className="acard">
          <div className="acard-hd">
            By feature
            <span className="r">This month</span>
          </div>
          <div className="acard-bd" style={{ padding: 0 }}>
            <div className="at-wrap">
              <table className="at">
                <thead>
                  <tr>
                    <th>Feature</th>
                    <th>Model</th>
                    <th style={{ textAlign: "right" }}>Calls</th>
                    <th style={{ textAlign: "right" }}>Input tk</th>
                    <th style={{ textAlign: "right" }}>Output tk</th>
                    <th style={{ textAlign: "right" }}>Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {byFeature.map((row, i) => (
                    <tr key={i} className="no-click">
                      <td className="td-main">{row.feature}</td>
                      <td className="td-mono" style={{ fontSize: 10 }}>
                        {row.model}
                      </td>
                      <td className="td-mono" style={{ textAlign: "right" }}>
                        {Number(row.call_count).toLocaleString()}
                      </td>
                      <td className="td-mono" style={{ textAlign: "right" }}>
                        {Number(row.total_input).toLocaleString()}
                      </td>
                      <td className="td-mono" style={{ textAlign: "right" }}>
                        {Number(row.total_output).toLocaleString()}
                      </td>
                      <td className="td-mono" style={{ textAlign: "right" }}>
                        ${fmt(Number(row.total_cost), 4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Top users */}
      {topUsers.length > 0 && (
        <div className="acard">
          <div className="acard-hd">
            Top users by cost
            <span className="r">This month</span>
          </div>
          <div className="acard-bd" style={{ padding: 0 }}>
            <div className="at-wrap">
              <table className="at">
                <thead>
                  <tr>
                    <th>User</th>
                    <th style={{ textAlign: "right" }}>Calls</th>
                    <th style={{ textAlign: "right" }}>Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {topUsers.map((row) => (
                    <tr key={row.user_id} className="no-click">
                      <td className="td-main">{row.email ?? row.user_id.slice(0, 8)}</td>
                      <td className="td-mono" style={{ textAlign: "right" }}>
                        {Number(row.call_count).toLocaleString()}
                      </td>
                      <td className="td-mono" style={{ textAlign: "right" }}>
                        ${fmt(Number(row.total_cost), 4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {byFeature.length === 0 && daily.length === 0 && (
        <div className="acard">
          <div className="acard-bd" style={{ color: "var(--faint)", fontSize: 13 }}>
            No AI usage logged yet. Data appears once the Anthropic adapter processes its first
            request.
          </div>
        </div>
      )}
    </div>
  );
}
