"use client";

import { useState, useEffect, useCallback } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { PLAN_LIMITS } from "@pledgeoff/core";
import type { Team, TeamMembership } from "@pledgeoff/core";

type TeamData = {
  team: Team | null;
  memberships: TeamMembership[];
  isOwner: boolean;
};

type Props = {
  plan: "free" | "pro" | "pro_plus";
};

export function TeamSection({ plan }: Props) {
  const [data, setData] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteState, setInviteState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [inviteError, setInviteError] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamNameState, setTeamNameState] = useState<"idle" | "loading" | "success" | "error">("idle");

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
      {/* Team name — always visible for owner */}
      {data?.isOwner && (
        <form onSubmit={handleUpdateTeamName} className="flex gap-2 items-center">
          <input
            type="text"
            required
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="My Team"
            disabled={teamNameState === "loading"}
            maxLength={100}
            className="flex-1 h-9 px-3 rounded-md border text-[13px] transition-colors focus:outline-none focus:border-(--accent)"
            style={{
              background: "var(--canvas)",
              borderColor: "var(--border)",
              color: "var(--t1)",
            }}
          />
          <button
            type="submit"
            disabled={teamNameState === "loading" || !teamName.trim()}
            className="h-9 px-4 rounded-md display text-[13px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
          >
            {teamNameState === "loading" ? "Saving…" : teamNameState === "success" ? "Saved ✓" : "Save name"}
          </button>
        </form>
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
