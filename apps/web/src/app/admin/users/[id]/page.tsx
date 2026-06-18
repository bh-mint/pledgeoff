import { requireAdminServer } from "@/lib/admin-auth";
import { createSupabaseServiceClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { AdminUserActions } from "./AdminUserActions";

function fmt(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminServer();
  const { id } = await params;
  const supabase = createSupabaseServiceClient();

  const [
    {
      data: { user },
    },
    { data: profile },
    { data: sub },
    { data: ideas },
  ] = await Promise.all([
    supabase.auth.admin.getUserById(id),
    supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
    supabase.from("subscriptions").select("*").eq("user_id", id).maybeSingle(),
    supabase
      .from("ideas")
      .select("id, text, created_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  if (!user) notFound();

  const isBanned = !!user.banned_until && new Date(user.banned_until) > new Date();
  const hasOverride = false;
  const plan = sub?.plan ?? "free";
  const name =
    profile?.first_name || profile?.last_name
      ? `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim()
      : user.email ?? id.slice(0, 8);
  const initials = name
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const statusCls = isBanned
    ? "adm-bs adm-bs-kll"
    : hasOverride
    ? "adm-bs adm-bs-over"
    : "adm-bs adm-bs-go";
  const statusLabel = isBanned ? "Suspended" : hasOverride ? "Override" : "Active";

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ marginBottom: 20 }}>
        <Link
          href="/admin/users"
          style={{
            fontSize: 10,
            color: "var(--faint)",
            textDecoration: "none",
            fontFamily: "var(--font-chivo-mono), monospace",
            letterSpacing: ".08em",
          }}
        >
          ← Users
        </Link>
      </div>

      {hasOverride && (
        <div className="u-banner-override">
          ⚠ Admin override active — Stripe billing bypassed — granted{" "}
          <strong>{(sub?.admin_override ?? "").toUpperCase()}</strong> access
        </div>
      )}

      {/* User header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div
          className="u-av"
          style={{ borderColor: hasOverride ? "var(--pivot)" : "var(--line)" }}
        >
          {initials}
        </div>
        <div>
          <div
            style={{
              fontFamily: "var(--font-bitter), serif",
              fontSize: 20,
              fontWeight: 700,
              color: "var(--ink)",
              marginBottom: 2,
            }}
          >
            {name}
          </div>
          <div style={{ fontSize: 11, color: "var(--faint)", fontFamily: "var(--font-chivo-mono), monospace" }}>
            {user.email}
          </div>
        </div>
      </div>

      {/* Profile card */}
      <div className="acard">
        <div className="acard-hd">Profile</div>
        <div className="acard-bd">
          <div className="u-grid">
            <div className="u-kv">
              <div className="u-k">Plan (Stripe)</div>
              <div className="u-v">
                <span className={`pp ${plan}`}>{plan.charAt(0).toUpperCase() + plan.slice(1)}</span>
              </div>
            </div>
            <div className="u-kv">
              <div className="u-k">Status</div>
              <div className="u-v"><span className={statusCls}>{statusLabel}</span></div>
            </div>
            <div className="u-kv">
              <div className="u-k">Company</div>
              <div className="u-v">{profile?.company_name ?? "—"}</div>
            </div>
            <div className="u-kv">
              <div className="u-k">Username</div>
              <div className="u-v">{profile?.username ? `@${profile.username}` : "—"}</div>
            </div>
            <div className="u-kv">
              <div className="u-k">Joined</div>
              <div className="u-v">{fmt(user.created_at)}</div>
            </div>
            <div className="u-kv">
              <div className="u-k">Last sign in</div>
              <div className="u-v">{fmt(user.last_sign_in_at)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription card */}
      <div className="acard">
        <div className="acard-hd">
          Subscription
          {sub?.stripe_subscription_id && (
            <span className="r td-mono">{sub.stripe_subscription_id.slice(0, 20)}…</span>
          )}
        </div>
        <div className="acard-bd">
          <div className="u-grid">
            <div className="u-kv">
              <div className="u-k">Sub status</div>
              <div className="u-v">{sub?.status ?? "—"}</div>
            </div>
            <div className="u-kv">
              <div className="u-k">Period end</div>
              <div className="u-v">{fmtDate(sub?.current_period_end)}</div>
            </div>
            <div className="u-kv">
              <div className="u-k">Otto used</div>
              <div className="u-v">
                {sub?.otto_included_used ?? 0} included + {sub?.otto_purchased ?? 0} purchased
              </div>
            </div>
            <div className="u-kv">
              <div className="u-k">Verifications purchased</div>
              <div className="u-v">{sub?.verifications_purchased ?? 0}</div>
            </div>
            <div className="u-kv">
              <div className="u-k">Extra seats</div>
              <div className="u-v">{sub?.extra_seats ?? 0}</div>
            </div>
            <div className="u-kv">
              <div className="u-k">Past due since</div>
              <div className="u-v" style={{ color: sub?.past_due_since ? "var(--kill)" : undefined }}>
                {fmtDate(sub?.past_due_since)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Admin actions */}
      <div className="acard">
        <div className="acard-hd">Admin actions</div>
        <div className="acard-bd">
          <AdminUserActions
            userId={id}
            isBanned={isBanned}
            currentPlan={plan}
            hasOverride={hasOverride}
            overridePlanValue={null}
          />
        </div>
      </div>

      {/* Ideas */}
      <div className="acard">
        <div className="acard-hd">
          Recent ideas
          <span className="r">{ideas?.length ?? 0} shown</span>
        </div>
        <div className="acard-bd" style={{ padding: 0 }}>
          {!ideas?.length ? (
            <div style={{ padding: 16, fontSize: 12, color: "var(--faint)", fontFamily: "var(--font-chivo-mono), monospace" }}>
              No ideas yet.
            </div>
          ) : (
            <table className="at">
              <tbody>
                {ideas.map((idea) => (
                  <tr key={idea.id} className="no-click">
                    <td className="td-mono" style={{ width: 130, color: "var(--faint)" }}>
                      {fmtDate(idea.created_at)}
                    </td>
                    <td style={{ fontSize: 12, color: "var(--ink)", whiteSpace: "normal" }}>
                      {idea.text.slice(0, 120)}
                      {idea.text.length > 120 ? "…" : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
