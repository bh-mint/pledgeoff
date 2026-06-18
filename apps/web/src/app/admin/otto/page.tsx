import { requireAdminServer } from "@/lib/admin-auth";
import { createSupabaseServiceClient } from "@/lib/supabase-server";
import Link from "next/link";
import { PLAN_LIMITS } from "@pledgeoff/core";

export default async function OttoPage() {
  await requireAdminServer();
  const supabase = createSupabaseServiceClient();

  const { data: subs } = await supabase
    .from("subscriptions")
    .select("user_id, plan, otto_included_used, otto_purchased, otto_included_reset_at")
    .or("otto_included_used.gt.0,otto_purchased.gt.0")
    .order("otto_included_used", { ascending: false });

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email");
  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));

  const {
    data: { users },
  } = await supabase.auth.admin.listUsers({ perPage: 500 });
  const emailMap = Object.fromEntries((users ?? []).map((u) => [u.id, u.email]));

  const totalIncludedUsed = (subs ?? []).reduce((s, r) => s + r.otto_included_used, 0);
  const totalPurchasedLeft = (subs ?? []).reduce((s, r) => s + r.otto_purchased, 0);

  function fmt(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  }

  const PLAN_OTTO: Record<string, number> = {
    free: 0,
    founder: PLAN_LIMITS.founder.ottoQuestionsPerMonth,
    team: PLAN_LIMITS.team.ottoQuestionsPerMonth,
    studio: PLAN_LIMITS.studio.ottoQuestionsPerMonth,
    enterprise: 0,
  };

  return (
    <div>
      <div className="adm-stat-grid">
        <div className="sc">
          <div className="sc-k">Included used (all time)</div>
          <div className="sc-v">{totalIncludedUsed.toLocaleString()}</div>
          <div className="sc-d">{(subs ?? []).length} active users</div>
        </div>
        <div className="sc">
          <div className="sc-k">Pack balance remaining</div>
          <div className="sc-v piv">{totalPurchasedLeft.toLocaleString()}</div>
          <div className="sc-d">across all users</div>
        </div>
        <div className="sc">
          <div className="sc-k">Founder included/mo</div>
          <div className="sc-v">{PLAN_OTTO.founder}</div>
          <div className="sc-d">per user</div>
        </div>
        <div className="sc">
          <div className="sc-k">Team included/mo</div>
          <div className="sc-v">{PLAN_OTTO.team}</div>
          <div className="sc-d">per user</div>
        </div>
      </div>

      {/* Consumption by plan */}
      <div className="acard">
        <div className="acard-hd">
          Consumption by plan
          <span className="r">All time</span>
        </div>
        <div className="acard-bd" style={{ padding: 0 }}>
          <div className="at-wrap">
            <table className="at">
              <thead>
                <tr>
                  <th>Plan</th>
                  <th>Users with activity</th>
                  <th>Included/mo</th>
                  <th>Total included used</th>
                  <th>Pack balance remaining</th>
                </tr>
              </thead>
              <tbody>
                {(["free", "founder", "team", "studio", "enterprise"] as const).map((plan) => {
                  const planSubs = (subs ?? []).filter((s) => s.plan === plan);
                  const totalUsed = planSubs.reduce((s, r) => s + r.otto_included_used, 0);
                  const totalPack = planSubs.reduce((s, r) => s + r.otto_purchased, 0);
                  const included = PLAN_OTTO[plan] ?? 0;
                  const pct = included > 0 && planSubs.length > 0
                    ? Math.min(100, Math.round((totalUsed / (included * planSubs.length)) * 100))
                    : 0;
                  return (
                    <tr key={plan} className="no-click">
                      <td>
                        <span className={`pp ${plan}`}>
                          {plan.charAt(0).toUpperCase() + plan.slice(1)}
                        </span>
                      </td>
                      <td className="td-mono">{planSubs.length}</td>
                      <td className="td-mono">{included > 0 ? included : "—"}</td>
                      <td>
                        {totalUsed > 0 ? (
                          <div className="mm-wrap">
                            <div className="mm">
                              <div
                                className={`mm-f ${pct > 85 ? "w" : ""}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="mm-v">{totalUsed}</span>
                          </div>
                        ) : (
                          <span className="td-mono">—</span>
                        )}
                      </td>
                      <td className="td-mono">{totalPack > 0 ? totalPack : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Top users */}
      <div className="acard">
        <div className="acard-hd">
          Top Otto users
          <span className="r">By included used</span>
        </div>
        <div className="acard-bd" style={{ padding: 0 }}>
          <div className="at-wrap">
            <table className="at">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Plan</th>
                  <th>Included used</th>
                  <th>Included/mo</th>
                  <th>Pack balance</th>
                  <th>Reset</th>
                </tr>
              </thead>
              <tbody>
                {(subs ?? []).slice(0, 20).map((sub) => {
                  const p = profileMap[sub.user_id];
                  const email = emailMap[sub.user_id];
                  const name =
                    p?.first_name || p?.last_name
                      ? `${p?.first_name ?? ""} ${p?.last_name ?? ""}`.trim()
                      : email ?? sub.user_id.slice(0, 8);
                  const included = PLAN_OTTO[sub.plan] ?? 0;
                  const pct =
                    included > 0
                      ? Math.min(100, Math.round((sub.otto_included_used / included) * 100))
                      : 0;
                  return (
                    <tr key={sub.user_id} className="no-click">
                      <td>
                        <Link
                          href={`/admin/users/${sub.user_id}`}
                          style={{ textDecoration: "none" }}
                        >
                          <div className="td-main">{name}</div>
                          {name !== email && <div className="td-sub">{email}</div>}
                        </Link>
                      </td>
                      <td>
                        <span className={`pp ${sub.plan}`}>
                          {sub.plan.charAt(0).toUpperCase() + sub.plan.slice(1)}
                        </span>
                      </td>
                      <td>
                        <div className="mm-wrap">
                          <div className="mm">
                            <div
                              className={`mm-f ${pct > 85 ? "w" : ""}`}
                              style={{ width: included > 0 ? `${pct}%` : "0%" }}
                            />
                          </div>
                          <span className="mm-v">{sub.otto_included_used}</span>
                        </div>
                      </td>
                      <td className="td-mono">{included > 0 ? included : "opt-in"}</td>
                      <td className="td-mono">
                        {sub.otto_purchased > 0 ? sub.otto_purchased : "—"}
                      </td>
                      <td className="td-mono">{fmt(sub.otto_included_reset_at)}</td>
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
