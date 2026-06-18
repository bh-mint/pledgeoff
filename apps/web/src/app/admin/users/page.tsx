import { requireAdminServer } from "@/lib/admin-auth";
import { createSupabaseServiceClient } from "@/lib/supabase-server";
import Link from "next/link";

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; plan?: string }>;
}) {
  await requireAdminServer();
  const { q, plan: planFilter } = await searchParams;
  const supabase = createSupabaseServiceClient();

  const {
    data: { users },
  } = await supabase.auth.admin.listUsers({ perPage: 500 });
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, company_name, created_at");
  const { data: subs } = await supabase
    .from("subscriptions")
    .select("user_id, plan, status, past_due_since");

  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));
  const subMap = Object.fromEntries((subs ?? []).map((s) => [s.user_id, s]));

  const filtered = (users ?? []).filter((u) => {
    const search = (q ?? "").toLowerCase();
    const p = profileMap[u.id];
    const matchSearch =
      !search ||
      u.email?.toLowerCase().includes(search) ||
      p?.first_name?.toLowerCase().includes(search) ||
      p?.last_name?.toLowerCase().includes(search) ||
      p?.company_name?.toLowerCase().includes(search);
    const sub = subMap[u.id];
    const plan = sub?.plan ?? "free";
    const matchPlan = !planFilter || plan === planFilter;
    return matchSearch && matchPlan;
  });

  const PLAN_ORDER = ["enterprise", "studio", "team", "founder", "free"];
  filtered.sort((a, b) => {
    const pa = subMap[a.id]?.plan ?? "free";
    const pb = subMap[b.id]?.plan ?? "free";
    return PLAN_ORDER.indexOf(pa) - PLAN_ORDER.indexOf(pb);
  });

  return (
    <div>
      <form className="adm-search" method="GET">
        <input
          name="q"
          defaultValue={q}
          className="adm-search-inp"
          placeholder="Search name or email…"
          style={{ maxWidth: 320 }}
        />
        <select
          name="plan"
          defaultValue={planFilter ?? ""}
          className="adm-search-inp"
          style={{ maxWidth: 160 }}
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

      <div className="acard">
        <div className="acard-hd">
          All users
          <span className="r">{filtered.length.toLocaleString()} accounts</span>
        </div>
        <div className="acard-bd" style={{ padding: 0 }}>
          <div className="at-wrap">
            <table className="at">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => {
                  const profile = profileMap[user.id];
                  const sub = subMap[user.id];
                  const plan = sub?.plan ?? "free";
                  const isBanned =
                    !!user.banned_until && new Date(user.banned_until) > new Date();
                  const hasOverride = false;
                  const statusCls = isBanned
                    ? "adm-bs adm-bs-kll"
                    : hasOverride
                    ? "adm-bs adm-bs-over"
                    : "adm-bs adm-bs-go";
                  const statusLabel = isBanned ? "Suspended" : hasOverride ? "Override" : "Active";
                  const name =
                    profile?.first_name || profile?.last_name
                      ? `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim()
                      : user.email ?? user.id.slice(0, 8);

                  return (
                    <tr key={user.id}>
                      <td>
                        <div className="td-main">{name}</div>
                        {(profile?.first_name || profile?.last_name) && (
                          <div className="td-sub">{user.email}</div>
                        )}
                        {profile?.company_name && (
                          <div className="td-sub">{profile.company_name}</div>
                        )}
                      </td>
                      <td>
                        <span className={`pp ${plan}`}>
                          {plan.charAt(0).toUpperCase() + plan.slice(1)}
                        </span>
                        {hasOverride && (
                          <span
                            style={{
                              marginLeft: 6,
                              fontSize: 8,
                              color: "var(--pivot)",
                              fontFamily: "var(--font-chivo-mono), monospace",
                            }}
                          >
                            override
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={statusCls}>{statusLabel}</span>
                        {sub?.past_due_since && (
                          <div className="td-sub" style={{ color: "var(--pivot)" }}>
                            past due
                          </div>
                        )}
                      </td>
                      <td className="td-mono">
                        {fmt(user.created_at ?? profile?.created_at ?? "")}
                      </td>
                      <td>
                        <Link href={`/admin/users/${user.id}`} className="btn-xs p">
                          View
                        </Link>
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
