"use client";

import { useState, useEffect, useCallback } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { PLAN_LIMITS } from "@pledgeoff/core";
import type { Team, TeamMembership, SubscriptionStatus } from "@pledgeoff/core";

type TeamData = {
  team: Team | null;
  memberships: TeamMembership[];
  isOwner: boolean;
};

type Props = {
  plan: "free" | "pro" | "pro_plus";
  subscriptionStatus: SubscriptionStatus | null;
};

export function TeamSection({ plan, subscriptionStatus }: Props) {
  const [data, setData] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteState, setInviteState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [inviteError, setInviteError] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamNameState, setTeamNameState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [renamingTeam, setRenamingTeam] = useState(false);

  const seatsIncluded = PLAN_LIMITS[plan].seatsIncluded;

  const fetchTeam = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return;

    const res = await fetch("/api/v1/teams", {
      headers: { Authorization: `Bearer ${session.session.access_token}` },
    });
    if (res.ok) {
      const json = await res.json() as { data: TeamData };
      setData(json.data);
      if (json.data.team) setTeamName(json.data.team.name);
    }
    setLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void fetchTeam(); }, [fetchTeam]);

  if (subscriptionStatus === "past_due") {
    return (
      <div style={{ background: "#1a1008", border: "1px solid #7a4a00", borderRadius: 8, padding: "20px 24px" }}>
        <p style={{ margin: "0 0 4px", fontSize: 11, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.08em", color: "#a06020" }}>
          PAYMENT FAILED
        </p>
        <p style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 600, color: "#f5f5f5" }}>
          Team access suspended
        </p>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "#aaa", lineHeight: 1.6 }}>
          Your Pro subscription payment failed. Team features are locked until the payment is resolved.
          If not resolved within 24 hours, your account will be downgraded to the Free plan.
        </p>
        <a
          href="/settings"
          onClick={async (e) => {
            e.preventDefault();
            const { createSupabaseBrowserClient: createClient } = await import("@/lib/supabase/client");
            const supabase = createClient();
            const { data: session } = await supabase.auth.getSession();
            if (!session.session) return;
            const res = await fetch("/api/v1/billing/portal", {
              method: "POST",
              headers: { Authorization: `Bearer ${session.session.access_token}` },
            });
            if (res.ok) {
              const json = await res.json() as { data: { url: string } };
              window.location.assign(json.data.url);
            }
          }}
          style={{ display: "inline-block", background: "#b6f04c", color: "#000", fontSize: 13, fontWeight: 600, padding: "10px 20px", borderRadius: 6, textDecoration: "none" }}
        >
          Update payment method →
        </a>
      </div>
    );
  }

  const handleInvite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setInviteState("loading");
    setInviteError("");

    const supabase = createSupabaseBrowserClient();
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return;

    const res = await fetch("/api/v1/teams/invite", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.session.access_token}`,
      },
      body: JSON.stringify({ email: inviteEmail }),
    });

    const json = await res.json();

    if (!res.ok) {
      setInviteError(json.error?.message ?? "Failed to send invite. Try again.");
      setInviteState("error");
      return;
    }

    setInviteState("success");
    setInviteEmail("");
    fetchTeam();
    setTimeout(() => setInviteState("idle"), 3000);
  };

  const handleLeave = async () => {
    if (!confirm('Are you sure you want to leave this team?')) return;
    setLeaving(true);
    const supabase = createSupabaseBrowserClient();
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) { setLeaving(false); return; }

    await fetch('/api/v1/teams/leave', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.session.access_token}` },
    });

    setLeaving(false);
    fetchTeam();
  };

  const handleUpdateTeamName = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setTeamNameState("loading");
    const supabase = createSupabaseBrowserClient();
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return;

    const res = await fetch("/api/v1/teams", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.session.access_token}`,
      },
      body: JSON.stringify({ name: teamName }),
    });

    if (!res.ok) {
      setTeamNameState("error");
      return;
    }

    setTeamNameState("success");
    setRenamingTeam(false);
    fetchTeam();
    setTimeout(() => setTeamNameState("idle"), 2000);
  };

  const handleRemove = async (membershipId: string) => {
    setRemovingId(membershipId);
    const supabase = createSupabaseBrowserClient();
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) { setRemovingId(null); return; }

    await fetch(`/api/v1/teams/members/${membershipId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.session.access_token}` },
    });

    setRemovingId(null);
    fetchTeam();
  };

  if (loading) {
    return (
      <div className="mono text-[11px]" style={{ color: "var(--t3)" }}>
        Loading team…
      </div>
    );
  }

  const activeCount = data?.memberships.filter((m) => m.status === "active").length ?? 0;
  const seatsFilled = activeCount + 1; // +1 for owner
  const canInvite = data?.isOwner && seatsFilled < seatsIncluded;

  return (
    <div className="space-y-6">
      {/* Team name */}
      {data?.isOwner && !renamingTeam && (
        <div className="flex items-center justify-between">
          <div className="display font-semibold text-[15px]" style={{ color: "var(--t1)" }}>
            {data.team?.name ?? "My Team"}
            {teamNameState === "success" && (
              <span className="mono text-[11px] ml-2 font-normal" style={{ color: "var(--validated)" }}>Saved ✓</span>
            )}
          </div>
          <button
            onClick={() => { setTeamName(data.team?.name ?? "My Team"); setRenamingTeam(true); setTeamNameState("idle"); }}
            className="mono text-[10px] uppercase tracking-[0.08em] px-2 py-1 rounded transition-opacity hover:opacity-70"
            style={{ color: "var(--t3)" }}
          >
            Rename
          </button>
        </div>
      )}
      {data?.isOwner && renamingTeam && (
        <>
          <form onSubmit={handleUpdateTeamName} className="flex gap-2 items-center">
            <input
              type="text"
              required
              autoFocus
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="My Team"
              disabled={teamNameState === "loading"}
              maxLength={100}
              className="flex-1 h-9 px-3 rounded-md border text-[13px] transition-colors focus:outline-none focus:border-(--accent)"
              style={{ background: "var(--canvas)", borderColor: "var(--border)", color: "var(--t1)" }}
            />
            <button
              type="submit"
              disabled={teamNameState === "loading" || !teamName.trim()}
              className="h-9 px-4 rounded-md display text-[13px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
            >
              {teamNameState === "loading" ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => { setRenamingTeam(false); setTeamNameState("idle"); }}
              className="h-9 px-3 rounded-md display text-[13px] transition-opacity hover:opacity-70"
              style={{ borderColor: "var(--border)", color: "var(--t3)", border: "1px solid" }}
            >
              Cancel
            </button>
          </form>
          {teamNameState === "error" && (
            <p className="mono text-[11px]" style={{ color: "var(--kill)" }}>
              Failed to save team name. Try again.
            </p>
          )}
        </>
      )}
      {!data?.isOwner && data?.team && (
        <div className="mono text-[11px]" style={{ color: "var(--t3)" }}>
          Team: <span style={{ color: "var(--t1)" }}>{data.team.name}</span>
        </div>
      )}

      {/* Seat usage */}
      <div className="flex items-center justify-between">
        <div>
          <div className="display font-semibold text-[15px]" style={{ color: "var(--t1)" }}>
            Team seats
          </div>
          <div className="mono text-[11px] mt-0.5" style={{ color: "var(--t3)" }}>
            {seatsFilled} / {seatsIncluded} seats used
          </div>
        </div>
        {plan === "free" && (
          <a
            href="/pricing"
            className="mono text-[10px] uppercase tracking-[0.1em] px-3 py-1.5 rounded-md border transition-colors"
            style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
          >
            Upgrade for more seats
          </a>
        )}
      </div>

      {/* Invite form — only for owner */}
      {data?.isOwner && (
        <form onSubmit={handleInvite} className="flex gap-2">
          <input
            type="email"
            required
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="colleague@company.com"
            disabled={!canInvite || inviteState === "loading"}
            className="flex-1 h-9 px-3 rounded-md border text-[13px] transition-colors focus:outline-none focus:border-(--accent)"
            style={{
              background: "var(--canvas)",
              borderColor: "var(--border)",
              color: "var(--t1)",
              opacity: canInvite ? 1 : 0.5,
            }}
          />
          <button
            type="submit"
            disabled={!canInvite || inviteState === "loading"}
            className="h-9 px-4 rounded-md display text-[13px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
          >
            {inviteState === "loading" ? "Sending…" : inviteState === "success" ? "Sent ✓" : "Invite"}
          </button>
        </form>
      )}

      {!canInvite && data?.isOwner && (
        <p className="mono text-[11px]" style={{ color: "var(--t3)" }}>
          {seatsFilled >= seatsIncluded
            ? `Seat limit reached. Upgrade to invite more members.`
            : ""}
        </p>
      )}

      {inviteState === "error" && (
        <p className="mono text-[11px]" style={{ color: "var(--kill)" }}>{inviteError}</p>
      )}

      {/* Members list */}
      {data?.memberships && data.memberships.length > 0 && (
        <div className="rounded-md border divide-y" style={{ borderColor: "var(--border)" }}>
          {data.memberships.map((m) => (
            <div key={m.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="text-[13px]" style={{ color: "var(--t1)" }}>
                  {m.invitedEmail}
                </div>
                <div className="mono text-[10px] mt-0.5" style={{ color: "var(--t3)" }}>
                  {m.status === "pending" ? "Invite pending" : "Active"} · {m.role}
                </div>
              </div>
              {data.isOwner && m.role !== "owner" && (
                <button
                  onClick={() => handleRemove(m.id)}
                  disabled={removingId === m.id}
                  className="mono text-[10px] uppercase tracking-[0.08em] px-2 py-1 rounded transition-opacity hover:opacity-70 disabled:opacity-40"
                  style={{ color: "var(--kill)" }}
                >
                  {removingId === m.id ? "…" : "Remove"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {(!data?.memberships || data.memberships.length === 0) && (
        <p className="mono text-[11px]" style={{ color: "var(--t3)" }}>
          No team members yet.{data?.isOwner ? " Invite someone above." : ""}
        </p>
      )}

      {/* Leave team — only for members */}
      {data?.team && !data.isOwner && (
        <div className="pt-4 border-t" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={handleLeave}
            disabled={leaving}
            className="mono text-[11px] uppercase tracking-[0.08em] px-3 py-1.5 rounded-md border transition-opacity hover:opacity-70 disabled:opacity-40"
            style={{ borderColor: "var(--kill)", color: "var(--kill)" }}
          >
            {leaving ? "Leaving…" : "Leave team"}
          </button>
        </div>
      )}
    </div>
  );
}
