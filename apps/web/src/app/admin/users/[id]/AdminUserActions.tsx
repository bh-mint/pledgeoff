"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PLANS = ["free", "founder", "team", "studio", "enterprise"] as const;

async function adminFetch(path: string, body?: object) {
  const { createSupabaseBrowserClient } = await import("@/lib/supabase/client");
  const supabase = createSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token ?? "";
  return fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function AdminUserActions({
  userId,
  isBanned,
  currentPlan,
  hasOverride,
  overridePlanValue,
}: {
  userId: string;
  isBanned: boolean;
  currentPlan: string;
  hasOverride: boolean;
  overridePlanValue: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [overridePlan, setOverridePlan] = useState(overridePlanValue ?? currentPlan);
  const [showOverride, setShowOverride] = useState(false);
  const [showLift, setShowLift] = useState(false);
  const [ovConfirm, setOvConfirm] = useState("");
  const [liftConfirm, setLiftConfirm] = useState("");

  async function handle(action: string, fn: () => Promise<Response>) {
    setLoading(action);
    const res = await fn();
    setLoading(null);
    if (res.ok) router.refresh();
    else alert(`Failed: ${await res.text()}`);
  }

  async function applyOverride() {
    if (ovConfirm !== "OVERRIDE") return;
    await handle("override", () =>
      adminFetch(`/api/v1/admin/users/${userId}/override-plan`, { plan: overridePlan })
    );
    setShowOverride(false);
    setOvConfirm("");
  }

  async function applyLift() {
    if (liftConfirm !== "LIFT") return;
    await handle("lift", () =>
      adminFetch(`/api/v1/admin/users/${userId}/override-plan`, { plan: null })
    );
    setShowLift(false);
    setLiftConfirm("");
  }

  return (
    <div>
      {/* Action buttons */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <button
          className={`btn-xs ${isBanned ? "p" : "d"}`}
          disabled={!!loading}
          onClick={() =>
            void handle("suspend", () =>
              adminFetch(
                `/api/v1/admin/users/${userId}/${isBanned ? "unsuspend" : "suspend"}`
              )
            )
          }
        >
          {loading === "suspend" ? "…" : isBanned ? "Unsuspend" : "Suspend account"}
        </button>

        {!hasOverride ? (
          <button
            className="btn-xs w"
            onClick={() => {
              setShowOverride(true);
              setShowLift(false);
            }}
          >
            Override plan
          </button>
        ) : (
          <button
            className="btn-xs d"
            onClick={() => {
              setShowLift(true);
              setShowOverride(false);
            }}
          >
            Lift override
          </button>
        )}

        <button
          className="btn-xs"
          style={{ marginLeft: "auto" }}
          disabled={!!loading}
          onClick={() => {
            if (!confirm("Delete this user permanently? This cannot be undone.")) return;
            void handle("delete", () =>
              adminFetch(`/api/v1/admin/users/${userId}/delete`)
            ).then(() => {
              window.location.href = "/admin/users";
            });
          }}
        >
          {loading === "delete" ? "…" : "Delete user"}
        </button>
      </div>

      {/* Override zone */}
      {showOverride && (
        <div className="ov-zone">
          <div className="ov-warn">
            <span className="ov-warn-ico">⚠</span>
            <div className="ov-warn-txt">
              <strong>Admin override bypasses Stripe billing entirely.</strong> This user will be
              granted the selected plan without payment. All Stripe webhooks are ignored while
              override is active. To restore normal billing, lift the override explicitly.
            </div>
          </div>
          <div className="fg">
            <label className="flbl">Plan to grant</label>
            <select
              className="finp"
              value={overridePlan}
              onChange={(e) => setOverridePlan(e.target.value)}
            >
              {PLANS.filter((p) => p !== "free").map((p) => (
                <option key={p} value={p}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div className="ov-confirm-lbl">Type OVERRIDE to confirm</div>
          <div className="fg">
            <input
              className="finp"
              type="text"
              placeholder="OVERRIDE"
              value={ovConfirm}
              onChange={(e) => setOvConfirm(e.target.value)}
            />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className={`btn-xs d ${ovConfirm !== "OVERRIDE" ? "btn-disabled" : ""}`}
              disabled={ovConfirm !== "OVERRIDE" || loading === "override"}
              onClick={() => void applyOverride()}
            >
              {loading === "override" ? "…" : "Apply admin override"}
            </button>
            <button className="btn-xs" onClick={() => setShowOverride(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Lift zone */}
      {showLift && (
        <div className="lift-zone">
          <div
            style={{
              fontSize: 10,
              color: "var(--kill)",
              marginBottom: 10,
              lineHeight: 1.7,
              fontFamily: "var(--font-chivo-mono), monospace",
            }}
          >
            This will make Stripe the authoritative source again. Override access ends immediately.
          </div>
          <div className="fg">
            <label className="flbl">Type LIFT to confirm</label>
            <input
              className="finp"
              type="text"
              placeholder="LIFT"
              value={liftConfirm}
              onChange={(e) => setLiftConfirm(e.target.value)}
            />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className={`btn-xs d ${liftConfirm !== "LIFT" ? "btn-disabled" : ""}`}
              disabled={liftConfirm !== "LIFT" || loading === "lift"}
              onClick={() => void applyLift()}
            >
              {loading === "lift" ? "…" : "Lift override — restore Stripe billing"}
            </button>
            <button className="btn-xs" onClick={() => setShowLift(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
