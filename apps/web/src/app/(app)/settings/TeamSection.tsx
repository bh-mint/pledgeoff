"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getAuthToken } from "@/lib/auth-client";
import { PLAN_LIMITS } from "@pledgeoff/core";
import type { Team, TeamMembership, SubscriptionStatus } from "@pledgeoff/core";

type TeamData = {
  team: Team | null;
  memberships: TeamMembership[];
  isOwner: boolean;
  callerRole: "owner" | "admin" | "member" | null;
};

function TeamLogoUpload({
  currentLogoUrl,
  onUploaded,
}: {
  currentLogoUrl?: string | null;
  onUploaded: (url: string) => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentLogoUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setUploading(true);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    const token = await getAuthToken();
    if (!token) { setUploading(false); return; }
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/v1/teams/logo", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    if (!res.ok) {
      const json = (await res.json()) as { error?: { message?: string } };
      setError(json.error?.message ?? "Upload failed. Try again.");
      setPreviewUrl(currentLogoUrl ?? null);
    } else {
      const json = (await res.json()) as { data: { logoUrl: string } };
      onUploaded(json.data.logoUrl);
    }
    setUploading(false);
  };

  return (
    <div className="av-upload">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="av-lg sq"
        aria-label="Upload workspace logo"
        style={{ cursor: "pointer", position: "relative", overflow: "hidden" }}
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="Workspace logo" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 4 }} />
        ) : (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <rect x="2" y="2" width="16" height="16" rx="4" stroke="var(--faint)" strokeWidth="1.5" />
            <path d="M10 7v6M7 10h6" stroke="var(--faint)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        )}
        {uploading && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)" }}>
            <div style={{ width: 16, height: 16, border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
          </div>
        )}
      </button>
      <div>
        <div className="av-nm">{/* team name shown above */}</div>
        <div className="av-sub">Team logo · PNG or SVG · 512×512</div>
        <button className="btn-xs" onClick={() => inputRef.current?.click()} disabled={uploading}>
          Upload logo
        </button>
        {error && <p className="fine" style={{ color: "var(--kill)" }}>{error}</p>}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

type Props = {
  plan: "free" | "founder" | "team" | "studio" | "enterprise";
  subscriptionStatus: SubscriptionStatus | null;
};

function roleBadge(role: string) {
  if (role === "owner") return <span className="bdg bdg-go">Owner</span>;
  if (role === "admin") return <span className="bdg bdg-dim">Admin</span>;
  return <span className="bdg bdg-faint">Member</span>;
}

function statusBadge(status: string) {
  if (status === "active") return <span className="bdg bdg-go">Active</span>;
  return <span className="bdg bdg-piv">Pending</span>;
}

function getInitials(email: string): string {
  return email.slice(0, 2).toUpperCase();
}

export function TeamSection({ plan, subscriptionStatus }: Props) {
  const [data, setData] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
  const [inviteState, setInviteState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [inviteError, setInviteError] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamNameState, setTeamNameState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [renamingTeam, setRenamingTeam] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteLinkState, setInviteLinkState] = useState<"idle" | "loading" | "revoking" | "copied">("idle");
  const [teamLogoUrl, setTeamLogoUrl] = useState<string | null>(null);
  const [domainAllowlists, setDomainAllowlists] = useState<string[]>([]);
  const [newDomain, setNewDomain] = useState("");
  const [domainState, setDomainState] = useState<"idle" | "loading" | "error">("idle");
  const [domainError, setDomainError] = useState("");

  const seatsIncluded = PLAN_LIMITS[plan].seatsIncluded;

  const fetchTeam = useCallback(async () => {
    const token = await getAuthToken();
    if (!token) return;
    const requests: Promise<Response>[] = [
      fetch("/api/v1/teams", { headers: { Authorization: `Bearer ${token}` } }),
      fetch("/api/v1/teams/invite-link", { headers: { Authorization: `Bearer ${token}` } }),
    ];
    if (plan === "enterprise") {
      requests.push(fetch("/api/v1/teams/domain-allowlist", { headers: { Authorization: `Bearer ${token}` } }));
    }
    const [teamRes, linkRes, domainRes] = await Promise.all(requests);
    if (teamRes.ok) {
      const json = (await teamRes.json()) as { data: Omit<TeamData, "callerRole"> & { isOwner: boolean } };
      const { data: supabaseUser } = await (await import("@/lib/supabase/client")).createSupabaseBrowserClient().auth.getUser();
      const currentUserId = supabaseUser?.user?.id ?? null;
      let callerRole: TeamData["callerRole"] = null;
      if (json.data.isOwner) {
        callerRole = "owner";
      } else if (currentUserId) {
        const m = json.data.memberships.find((mb) => mb.userId === currentUserId && mb.status === "active");
        callerRole = (m?.role as TeamData["callerRole"]) ?? "member";
      }
      setData({ ...json.data, callerRole });
      if (json.data.team) {
        setTeamName(json.data.team.name);
        setTeamLogoUrl(json.data.team.logoUrl ?? null);
      }
    }
    if (linkRes.ok) {
      const json = (await linkRes.json()) as { data: { url: string | null } };
      setInviteLink(json.data.url ?? null);
    }
    if (domainRes?.ok) {
      const json = (await domainRes.json()) as { data: { domain: string }[] };
      setDomainAllowlists(json.data.map((e) => e.domain));
    }
    setLoading(false);
  }, [plan]);

  const handleGenerateLink = async () => {
    setInviteLinkState("loading");
    const token = await getAuthToken();
    if (!token) { setInviteLinkState("idle"); return; }
    const res = await fetch("/api/v1/teams/invite-link", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const json = (await res.json()) as { data: { url: string } };
      setInviteLink(json.data.url);
    }
    setInviteLinkState("idle");
  };

  const handleRevokeLink = async () => {
    setInviteLinkState("revoking");
    const token = await getAuthToken();
    if (!token) { setInviteLinkState("idle"); return; }
    await fetch("/api/v1/teams/invite-link", { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    setInviteLink(null);
    setInviteLinkState("idle");
  };

  const handleCopyLink = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setInviteLinkState("copied");
    setTimeout(() => setInviteLinkState("idle"), 2000);
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void fetchTeam(); }, [fetchTeam]);

  if (subscriptionStatus === "past_due") {
    return (
      <div className="sec danger-sec">
        <div className="sec-hd">Team access suspended</div>
        <div className="sec-bd">
          <p style={{ fontSize: 13, color: "var(--dim)", marginBottom: 14, lineHeight: 1.6 }}>
            Your subscription payment failed. Team features are locked until the payment is resolved. If not resolved within 24 hours, your account will be downgraded to the Free plan.
          </p>
          <a
            href="/settings/billing"
            onClick={async (e) => {
              e.preventDefault();
              const { getAuthToken: getToken } = await import("@/lib/auth-client");
              const token = await getToken();
              if (!token) return;
              const res = await fetch("/api/v1/billing/portal", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
              if (res.ok) {
                const json = (await res.json()) as { data: { url: string } };
                window.location.assign(json.data.url);
              }
            }}
            className="btn-xs p"
            style={{ padding: "8px 16px" }}
          >
            Update payment method →
          </a>
        </div>
      </div>
    );
  }

  const handleInvite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setInviteState("loading");
    setInviteError("");
    const token = await getAuthToken();
    if (!token) return;
    const res = await fetch("/api/v1/teams/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    });
    const json = await res.json();
    if (!res.ok) {
      setInviteError(json.error?.message ?? "Failed to send invite. Try again.");
      setInviteState("error");
      return;
    }
    setInviteState("success");
    setInviteEmail("");
    void fetchTeam();
    setTimeout(() => setInviteState("idle"), 3000);
  };

  const handleLeave = async () => {
    if (!confirm("Are you sure you want to leave this team?")) return;
    setLeaving(true);
    const token = await getAuthToken();
    if (!token) { setLeaving(false); return; }
    await fetch("/api/v1/teams/leave", { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    setLeaving(false);
    void fetchTeam();
  };

  const handleUpdateTeamName = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setTeamNameState("loading");
    const token = await getAuthToken();
    if (!token) return;
    const res = await fetch("/api/v1/teams", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: teamName }),
    });
    if (!res.ok) { setTeamNameState("error"); return; }
    setTeamNameState("success");
    setRenamingTeam(false);
    void fetchTeam();
    setTimeout(() => setTeamNameState("idle"), 2000);
  };

  const handleRemove = async (membershipId: string) => {
    setRemovingId(membershipId);
    const token = await getAuthToken();
    if (!token) { setRemovingId(null); return; }
    await fetch(`/api/v1/teams/members/${membershipId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    setRemovingId(null);
    void fetchTeam();
  };

  const handleUpdateRole = async (membershipId: string, newRole: "admin" | "member") => {
    setUpdatingRoleId(membershipId);
    const token = await getAuthToken();
    if (!token) { setUpdatingRoleId(null); return; }
    await fetch(`/api/v1/teams/members/${membershipId}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ role: newRole }),
    });
    setUpdatingRoleId(null);
    void fetchTeam();
  };

  if (loading) {
    return <p className="fine">Loading team…</p>;
  }

  const activeCount = data?.memberships.filter((m) => m.status === "active").length ?? 0;
  const seatsFilled = activeCount + 1;
  const canInvite = (data?.callerRole === "owner" || data?.callerRole === "admin") && seatsFilled < seatsIncluded;

  const teamDisplayName = data?.team?.name ?? "My Team";

  return (
    <div>
      {/* Team identity */}
      <div className="sec">
        <div className="sec-hd">
          Team identity
          <span className="r">{teamDisplayName}</span>
        </div>
        <div className="sec-bd">
          {data?.callerRole === "owner" && (
            <TeamLogoUpload
              currentLogoUrl={teamLogoUrl}
              onUploaded={(url) => setTeamLogoUrl(url)}
            />
          )}

          {data?.callerRole === "owner" && !renamingTeam && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div className="av-nm">
                {teamDisplayName}
                {teamNameState === "success" && (
                  <span className="fine" style={{ marginLeft: 8, color: "var(--go)" }}>Saved ✓</span>
                )}
              </div>
              <button
                className="btn-xs"
                onClick={() => { setTeamName(teamDisplayName); setRenamingTeam(true); setTeamNameState("idle"); }}
              >
                Rename
              </button>
            </div>
          )}

          {data?.callerRole === "owner" && renamingTeam && (
            <form onSubmit={handleUpdateTeamName} className="finp-row">
              <input
                className="finp"
                type="text"
                required
                autoFocus
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Team name"
                disabled={teamNameState === "loading"}
                maxLength={100}
              />
              <button
                type="submit"
                className="btn-xs p"
                style={{ padding: "10px 14px" }}
                disabled={teamNameState === "loading" || !teamName.trim()}
              >
                {teamNameState === "loading" ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                className="btn-xs"
                onClick={() => { setRenamingTeam(false); setTeamNameState("idle"); }}
              >
                Cancel
              </button>
            </form>
          )}

          {data?.callerRole !== "owner" && data?.team && (
            <p className="fine">
              Team: <span style={{ color: "var(--ink)" }}>{data.team.name}</span>
            </p>
          )}
        </div>
      </div>

      {/* Members */}
      <div className="sec">
        <div className="sec-hd">
          Members
          <span className="r">{seatsFilled} of {seatsIncluded} seats used</span>
        </div>
        <div className="sec-bd">
          {data?.memberships && data.memberships.length > 0 ? (
            data.memberships.map((m) => (
              <div key={m.id} className="mrow">
                <div className="av">{getInitials(m.invitedEmail ?? "??")}</div>
                <div className="minfo">
                  <div className="mnm">{m.invitedEmail}</div>
                  <div className="mem">{m.invitedEmail}</div>
                </div>
                {roleBadge(m.role)}
                {statusBadge(m.status)}
                {m.role !== "owner" && (
                  <div className="macts">
                    {data.callerRole === "owner" && m.status === "active" && (
                      <button
                        className="btn-xs"
                        onClick={() => handleUpdateRole(m.id, m.role === "admin" ? "member" : "admin")}
                        disabled={updatingRoleId === m.id}
                      >
                        {updatingRoleId === m.id ? "…" : m.role === "admin" ? "Demote" : "Make admin"}
                      </button>
                    )}
                    {(data.callerRole === "owner" || (data.callerRole === "admin" && m.role === "member")) && (
                      <button
                        className="btn-xs d"
                        onClick={() => handleRemove(m.id)}
                        disabled={removingId === m.id}
                      >
                        {removingId === m.id ? "…" : "Remove"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          ) : (
            <p style={{ fontSize: 13, color: "var(--dim)" }}>
              No team members yet.{(data?.callerRole === "owner" || data?.callerRole === "admin") ? " Invite someone below." : ""}
            </p>
          )}
        </div>
      </div>

      {/* Invite by email */}
      {(data?.callerRole === "owner" || data?.callerRole === "admin") && (
        <div className="sec">
          <div className="sec-hd">Invite by email</div>
          <div className="sec-bd">
            <form onSubmit={handleInvite}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <label className="flbl" htmlFor="t-email">Email address</label>
                  <input
                    id="t-email"
                    className="finp"
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@example.com"
                    disabled={!canInvite || inviteState === "loading"}
                  />
                </div>
                <div style={{ width: 130 }}>
                  <label className="flbl" htmlFor="t-role">Role</label>
                  <select
                    id="t-role"
                    className="finp"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as "member" | "admin")}
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="btn-xs p"
                  style={{ padding: "10px 14px", flexShrink: 0 }}
                  disabled={!canInvite || inviteState === "loading"}
                >
                  {inviteState === "loading" ? "Sending…" : inviteState === "success" ? "Sent ✓" : "Send invite"}
                </button>
              </div>
              {!canInvite && seatsFilled >= seatsIncluded && (
                <p className="fine">Seat limit reached. Upgrade to invite more members.</p>
              )}
              {inviteState === "error" && (
                <p className="fine" style={{ color: "var(--kill)" }}>{inviteError}</p>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Invite link */}
      {data?.callerRole === "owner" && (
        <div className="sec">
          <div className="sec-hd">
            Invite link
            <span className="r">Expires in 30 days · Anyone with this link joins as Member</span>
          </div>
          <div className="sec-bd">
            {inviteLink ? (
              <>
                <div className="link-row">
                  <span className="link-val">{inviteLink}</span>
                  <button
                    className="btn-xs p"
                    onClick={handleCopyLink}
                  >
                    {inviteLinkState === "copied" ? "Copied ✓" : "Copy"}
                  </button>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <button
                    className="btn-xs d"
                    onClick={handleRevokeLink}
                    disabled={inviteLinkState === "revoking"}
                  >
                    {inviteLinkState === "revoking" ? "…" : "Revoke link"}
                  </button>
                  <button
                    className="btn-xs"
                    onClick={handleGenerateLink}
                    disabled={inviteLinkState === "loading"}
                  >
                    {inviteLinkState === "loading" ? "…" : "Regenerate"}
                  </button>
                </div>
              </>
            ) : (
              <button
                className="btn-xs p"
                onClick={handleGenerateLink}
                disabled={inviteLinkState === "loading"}
              >
                {inviteLinkState === "loading" ? "Generating…" : "Generate invite link →"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Domain allowlist — Enterprise only */}
      {plan === "enterprise" && data?.callerRole === "owner" ? (
        <div className="sec">
          <div className="sec-hd">
            Domain allowlist
            <span className="r">Enterprise</span>
          </div>
          <div className="sec-bd">
            <p style={{ fontSize: 13, color: "var(--dim)", marginBottom: 14 }}>
              Automatically approve anyone with a verified email from your domain. No invite needed.
            </p>
            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              <input
                className="finp"
                type="text"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="acme.com"
                style={{ flex: 1 }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void (async () => {
                      if (!newDomain.trim()) return;
                      setDomainState("loading");
                      setDomainError("");
                      const token = await getAuthToken();
                      if (!token) { setDomainState("idle"); return; }
                      const res = await fetch("/api/v1/teams/domain-allowlist", {
                        method: "POST",
                        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                        body: JSON.stringify({ domain: newDomain.trim() }),
                      });
                      if (res.ok) {
                        const json = (await res.json()) as { data: { domain: string } };
                        setDomainAllowlists((prev) => [...prev, json.data.domain]);
                        setNewDomain("");
                      } else {
                        const json = (await res.json()) as { error?: { message?: string } };
                        setDomainError(json.error?.message ?? "Could not add domain.");
                      }
                      setDomainState("idle");
                    })();
                  }
                }}
              />
              <button
                className="btn-xs p"
                style={{ padding: "10px 14px" }}
                disabled={domainState === "loading" || !newDomain.trim()}
                onClick={() => {
                  void (async () => {
                    if (!newDomain.trim()) return;
                    setDomainState("loading");
                    setDomainError("");
                    const token = await getAuthToken();
                    if (!token) { setDomainState("idle"); return; }
                    const res = await fetch("/api/v1/teams/domain-allowlist", {
                      method: "POST",
                      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                      body: JSON.stringify({ domain: newDomain.trim() }),
                    });
                    if (res.ok) {
                      const json = (await res.json()) as { data: { domain: string } };
                      setDomainAllowlists((prev) => [...prev, json.data.domain]);
                      setNewDomain("");
                    } else {
                      const json = (await res.json()) as { error?: { message?: string } };
                      setDomainError(json.error?.message ?? "Could not add domain.");
                    }
                    setDomainState("idle");
                  })();
                }}
              >
                {domainState === "loading" ? "…" : "Add"}
              </button>
            </div>
            {domainError && <p className="fine" style={{ color: "var(--kill)" }}>{domainError}</p>}
            {domainAllowlists.length > 0 ? (
              domainAllowlists.map((domain) => (
                <div key={domain} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid var(--line-soft)" }}>
                  <span style={{ fontFamily: "var(--font-chivo-mono), monospace", fontSize: 12, color: "var(--ink)" }}>@{domain}</span>
                  <button
                    className="btn-xs d"
                    onClick={() => {
                      void (async () => {
                        const token = await getAuthToken();
                        if (!token) return;
                        const res = await fetch(`/api/v1/teams/domain-allowlist/${encodeURIComponent(domain)}`, {
                          method: "DELETE",
                          headers: { Authorization: `Bearer ${token}` },
                        });
                        if (res.ok || res.status === 204) {
                          setDomainAllowlists((prev) => prev.filter((d) => d !== domain));
                        }
                      })();
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))
            ) : (
              <p className="fine">No domains added yet.</p>
            )}
          </div>
        </div>
      ) : plan !== "enterprise" && (
        <div className="sec">
          <div className="sec-hd">
            Domain allowlist
            <span className="r">Enterprise only</span>
          </div>
          <div className="sec-bd">
            <div className="plan-gate">
              <span className="pg-tag">Enterprise</span>
              <div>
                <div className="pg-ttl">Requires Enterprise</div>
                <p className="pg-desc">Automatically approve anyone with a verified email from your domain. No invite needed — they land on a team join screen and enter instantly.</p>
                <a href="/pricing" className="btn-xs p">Talk to sales</a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leave team — non-owners */}
      {data?.team && data.callerRole !== "owner" && (
        <div className="sec danger-sec">
          <div className="sec-hd">Leave team</div>
          <div className="sec-bd">
            <button
              className="btn-xs d"
              style={{ padding: "8px 16px" }}
              onClick={handleLeave}
              disabled={leaving}
            >
              {leaving ? "Leaving…" : "Leave team"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
