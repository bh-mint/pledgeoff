import { requireAdminServer } from "@/lib/admin-auth";
import { createSupabaseServiceClient } from "@/lib/supabase-server";
import Link from "next/link";

function fmt(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; plan?: string }>;
}) {
  await requireAdminServer();
  const { status, plan: planFilter } = await searchParams;
  const supabase = createSupabaseServiceClient();

  const { data: subs } = await supabase
    .from("subscriptions")
    .select("*")
    .order("updated_at", { ascending: false });
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name");
  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));

  const filtered = (subs ?? []).filter((s) => {
    const matchStatus = !status || s.status === status;
    const matchPlan = !planFilter || s.plan === planFilter;
    return matchStatus && matchPlan;
  });

  const statusBadgeCls = (s: string) => {
    if (s === "active") return "adm-bs adm-bs-go";
    if (s === "past_due") return "adm-bs adm-bs-piv adm-bs-pulse";
    if (s === "canceled") return "adm-bs adm-bs-dim";
    return "adm-bs adm-bs-kll";
  };

  const PLAN_ORDER = ["enterprise", "studio", "team", "founder", "free"];
  filtered.sort((a, b) => PLAN_ORDER.indexOf(a.plan) - PLAN_ORDER.indexOf(b.plan));

  const paidCount = (subs ?? []).filter((s) => s.status === "active" && s.plan !== "free").length;

  return (
    <div>
      <div className="adm-search">
        <Link
          href="/admin/subscriptions"
          className={`btn-xs ${!status && !planFilter ? "p" : ""}`}
        >
          All
        </Link>
        {["active", "past_due", "canceled", "trialing", "incomplete"].map((s) => (
          <Link
            key={s}
            href={`/admin/subscriptions?status=${s}`}
            className={`btn-xs ${status === s ? "p" : ""}`}
          >
            {s.replace("_", " ")}
          </Link>
        ))}
        <form method="GET" style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {status && <input type="hidden" name="status" value={status} />}
          <select
            name="plan"
            className="adm-search-inp"
            style={{ maxWidth: 160 }}
            defaultValue={planFilter ?? ""}
          >
            <option value="">All plans</option>
            {["free", "founder", "team", "studio", "enterprise"].map((p) => (
              <option key={p} value={p}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </option>
            ))}
          </select>
          <button type="submit" className="btn-g" style={{ fontSize: 10, padding: "8px 12px" }}>
            Filter
          </button>
        </form>
      </div>

      <div className="acard">
        <div className="acard-hd">
          Active subscriptions
          <span className="r">{paidCount} paid · {filtered.length} total</span>
        </div>
        <div className="acard-bd" style={{ padding: 0 }}>
          <div className="at-wrap">
            <table className="at">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Period end</th>
                  <th>Otto</th>
                  <th>Stripe sub</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((sub) => {
                  const p = profileMap[sub.user_id];
                  const name =
                    p?.first_name || p?.last_name
                      ? `${p?.first_name ?? ""} ${p?.last_name ?? ""}`.trim()
                      : p?.email ?? sub.user_id.slice(0, 8);
                  return (
                    <tr key={sub.id} className="no-click">
                      <td>
                        <Link
                          href={`/admin/users/${sub.user_id}`}
                          style={{ color: "var(--ink)", textDecoration: "none" }}
                        >
                          <div className="td-main">{name}</div>
                          {(p?.first_name || p?.last_name) && p?.email && (
                            <div className="td-sub">{p.email}</div>
                          )}
                        </Link>
                      </td>
                      <td>
                        <span className={`pp ${sub.plan}`}>
                          {sub.plan.charAt(0).toUpperCase() + sub.plan.slice(1)}
                        </span>
                      </td>
                      <td>
                        <span className={statusBadgeCls(sub.status)}>
                          {sub.status.replace("_", " ")}
                        </span>
                        {sub.past_due_since && (
                          <div className="td-sub" style={{ color: "var(--pivot)" }}>
                            since {fmt(sub.past_due_since)}
                          </div>
                        )}
                      </td>
                      <td className="td-mono">{fmt(sub.current_period_end)}</td>
                      <td className="td-mono">
                        {sub.otto_included_used}+{sub.otto_purchased}
                      </td>
                      <td className="td-mono" style={{ fontSize: 9, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis" }}>
                        {sub.stripe_subscription_id ?? "—"}
                      </td>
                      <td>
                        {sub.stripe_subscription_id && (
                          <span className="btn-xs">Stripe ↗</span>
                        )}
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
