"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PLANS = ['free', 'founder', 'team', 'studio', 'enterprise'] as const;
const PLAN_LABELS: Record<typeof PLANS[number], string> = {
  free: 'Free',
  founder: 'Founder',
  team: 'Team',
  studio: 'Studio',
  enterprise: 'Enterprise',
};

async function adminFetch(path: string, body?: object) {
  const { createSupabaseBrowserClient } = await import("@/lib/supabase/client");
  const supabase = createSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token ?? '';

  return fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function AdminUserActions({
  userId,
  isBanned,
  currentPlan,
}: {
  userId: string;
  isBanned: boolean;
  currentPlan: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [overridePlan, setOverridePlan] = useState(currentPlan);

  async function handle(action: string, fn: () => Promise<Response>) {
    setLoading(action);
    const res = await fn();
    setLoading(null);
    if (res.ok) router.refresh();
    else alert(`Failed: ${await res.text()}`);
  }

  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      {/* Suspend / Unsuspend */}
      <button
        disabled={!!loading}
        onClick={() => handle('suspend', () =>
          adminFetch(`/api/v1/admin/users/${userId}/${isBanned ? 'unsuspend' : 'suspend'}`)
        )}
        style={{
          fontSize: 13, fontWeight: 600, padding: '8px 16px', borderRadius: 6, cursor: 'pointer',
          border: '1px solid var(--border)',
          background: isBanned ? 'transparent' : 'rgba(229,91,60,0.1)',
          color: isBanned ? 'var(--validated)' : 'var(--kill)',
        }}
      >
        {loading === 'suspend' ? '…' : isBanned ? 'Unsuspend' : 'Suspend'}
      </button>

      {/* Override plan */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <select
          value={overridePlan}
          onChange={(e) => setOverridePlan(e.target.value)}
          style={{
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6,
            padding: '7px 10px', fontSize: 13, color: 'var(--t1)', cursor: 'pointer',
          }}
        >
          {PLANS.map((p) => <option key={p} value={p}>{PLAN_LABELS[p]}</option>)}
        </select>
        <button
          disabled={!!loading || overridePlan === currentPlan}
          onClick={() => handle('plan', () =>
            adminFetch(`/api/v1/admin/users/${userId}/override-plan`, { plan: overridePlan })
          )}
          style={{
            fontSize: 13, fontWeight: 600, padding: '8px 16px', borderRadius: 6, cursor: 'pointer',
            background: 'var(--accent)', color: '#000', border: 'none',
            opacity: overridePlan === currentPlan ? 0.4 : 1,
          }}
        >
          {loading === 'plan' ? '…' : 'Override plan'}
        </button>
      </div>

      {/* Delete */}
      <button
        disabled={!!loading}
        onClick={() => {
          if (!confirm('Delete this user permanently? This cannot be undone.')) return;
          void handle('delete', () =>
            adminFetch(`/api/v1/admin/users/${userId}/delete`)
          ).then(() => { window.location.href = '/admin/users'; });
        }}
        style={{
          fontSize: 13, fontWeight: 600, padding: '8px 16px', borderRadius: 6, cursor: 'pointer',
          border: '1px solid var(--border)', background: 'transparent', color: 'var(--t3)',
          marginLeft: 'auto',
        }}
      >
        {loading === 'delete' ? '…' : 'Delete user'}
      </button>
    </div>
  );
}
