import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth-server";
import { createSupabaseServiceClient } from "@/lib/supabase-server";
import { container } from "@/lib/container";
import { getUserPlan } from "@/server/billing/getUserPlan";
import { getDashboardData } from "@/server/dashboard/getDashboardData";
import { DashboardClient, type TableRow, type TeamFeedRow } from "./DashboardClient";
import { FooterMicro } from "@/components/FooterMicro";
import { SignalFeed } from "@/components/SignalFeed";
import { getSignalFeedData } from "@/server/signal-feed/getSignalFeedData";
import { WeeklyDigestBanner } from "@/components/WeeklyDigestBanner";
import type { Decision } from "@pledgeoff/core";
import { RoleGreeting } from "@/components/RoleGreeting";

export const metadata: Metadata = {
  title: { absolute: "Dashboard — PledgeOFF" },
  robots: { index: false, follow: false },
};

function computeScore(decision: Decision | null | undefined): number | null {
  if (!decision) return null;
  if (decision.dimensions && decision.dimensions.length > 0) {
    return Math.round(
      decision.dimensions.reduce((s, d) => s + d.weight * d.score, 0)
    );
  }
  return Math.round(decision.confidence * 100);
}


export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = createSupabaseServiceClient();
  const { data: profile } = await supabase.from("profiles").select("first_name, last_name").eq("id", user.id).single();
  const displayName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || user.email?.split("@")[0] || "—";

  // Phase 1 — plan + team (parallel)
  const [plan, teamResult] = await Promise.all([
    getUserPlan(user.id),
    container.teamRepo.findByMemberId(user.id),
  ]);

  const isWorkspacePlan = plan === "team" || plan === "studio" || plan === "enterprise";
  const isPaidPlan = plan !== "free";
  const team = teamResult.isOk() ? teamResult.value : null;

  // Phase 2 — if workspace plan + team: resolve all member IDs + profiles
  let allMemberIds: string[] = [user.id];
  let profileMap = new Map<string, { firstName: string | null; lastName: string | null }>();
  let teamName: string | null = null;
  let teamId: string | null = null;

  if (team && isWorkspacePlan) {
    teamName = team.name;
    teamId = team.id;

    const membershipsResult = await container.teamRepo.findMembershipsByTeamId(team.id);
    const memberships = membershipsResult.isOk() ? membershipsResult.value : [];
    const activeMemberUserIds = memberships
      .filter((m) => m.status === "active" && m.userId !== null)
      .map((m) => m.userId as string);

    allMemberIds = [...new Set([team.ownerId, ...activeMemberUserIds])];

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .in("id", allMemberIds);

    profileMap = new Map(
      (profiles ?? []).map((p) => [
        p.id as string,
        { firstName: (p.first_name as string | null) ?? null, lastName: (p.last_name as string | null) ?? null },
      ])
    );
  }

  // Phase 3 — workspace dashboard data + signal feed (parallel)
  const [{ ideas: rawIdeas, outcomes: rawOutcomes }, signalFeedData] = await Promise.all([
    getDashboardData(allMemberIds),
    getSignalFeedData(plan),
  ]);

  const outcomeMap = new Map<string, string>();
  for (const o of rawOutcomes) {
    outcomeMap.set(o.ideaId, o.outcomeType);
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Onboarding uses own ideas only (personal progress)
  const ownIdeas = rawIdeas.filter((r) => r.userId === user.id);
  const hasIdea = ownIdeas.length > 0;
  const hasVerdict = ownIdeas.some((r) => r.decision !== null);
  const hasDeepTool = ownIdeas.some((r) => r.tools.simulate || r.tools.landing || r.tools.customers || r.tools.build);
  const onboardingDone = hasIdea && hasVerdict && hasDeepTool;

  const onboardingSteps = [
    { label: "Submit your first idea", href: "/ideas/new", done: hasIdea },
    { label: "Get a verdict", href: "/ideas/new", done: hasVerdict },
    {
      label: "Run a deep tool (Simulate, Audience, Blueprint…)",
      href: hasVerdict ? `/ideas/${ownIdeas.find((r) => r.decision)?.id}` : "/ideas/new",
      done: hasDeepTool,
    },
  ];

  function getMemberInitials(userId: string): string {
    const p = profileMap.get(userId);
    if (p) {
      const full = [p.firstName, p.lastName].filter(Boolean).join(" ");
      if (full) {
        return full.split(" ").slice(0, 2).map((s) => s[0]?.toUpperCase() ?? "").join("");
      }
    }
    return userId.slice(0, 2).toUpperCase();
  }

  // Table rows — include member initials for workspace view
  const tableRows: TableRow[] = rawIdeas.map((row) => {
    const isOlderThan30Days = new Date(row.createdAt) < thirtyDaysAgo;
    const isOwn = row.userId === user.id;
    const outcomeType = outcomeMap.get(row.id) ?? null;
    return {
      id: row.id,
      text: row.text,
      createdAt: row.createdAt,
      score: computeScore(row.decision),
      verdict: row.decision?.verdict ?? null,
      status: !row.decision
        ? "pending"
        : row.decision.verdict === "GO"
        ? "validated"
        : row.decision.verdict === "KILL"
        ? "killed"
        : "pivoting",
      tools: row.tools,
      outcomeType,
      needsOutcome: isOwn && isOlderThan30Days && !!row.decision && !outcomeType,
      signalsStale: isOlderThan30Days && !!row.decision,
      isOwn,
      memberInitials: isWorkspacePlan && team ? getMemberInitials(row.userId) : undefined,
    };
  });

  // ── Team feed (reuses rawIdeas — no extra idea query needed) ──
  let teamFeedRows: TeamFeedRow[] = [];

  if (team && isPaidPlan) {
    const teamIdeaIds = rawIdeas.map((r) => r.id);
    const reactionsResult = await container.ideaReactionRepo.findByIdeaIds(teamIdeaIds);
    const allReactions = reactionsResult.isOk() ? reactionsResult.value : [];

    teamFeedRows = rawIdeas.map((ideaRow) => {
      const ideaReactions = allReactions.filter((r) => r.ideaId === ideaRow.id);
      return {
        id: ideaRow.id,
        text: ideaRow.text,
        createdAt: ideaRow.createdAt,
        userId: ideaRow.userId,
        memberInitials: getMemberInitials(ideaRow.userId),
        score: computeScore(ideaRow.decision),
        verdict: ideaRow.decision?.verdict ?? null,
        isOwn: ideaRow.userId === user.id,
        reactions: {
          agree: ideaReactions.filter((r) => r.reaction === "agree").length,
          disagree: ideaReactions.filter((r) => r.reaction === "disagree").length,
          myReaction: (ideaReactions.find((r) => r.userId === user.id)?.reaction ?? null) as "agree" | "disagree" | null,
        },
      };
    });
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--canvas)" }}>
      {/* Main grid */}
      <div className="max-w-360 mx-auto px-4 sm:px-10 py-6 sm:py-10 grid grid-cols-12 gap-6">
        {/* LEFT — pipeline + table */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {/* Welcome banner — first-time users */}
          {ownIdeas.length === 0 && (
            <div
              className="rounded-md border p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4"
              style={{ borderColor: "color-mix(in srgb, var(--accent) 30%, transparent)", background: "color-mix(in srgb, var(--accent) 4%, transparent)" }}
            >
              <div className="flex-1 min-w-0">
                <div className="mono text-[10px] uppercase tracking-widest mb-1" style={{ color: "var(--accent)" }}>
                  Welcome to PledgeOFF
                </div>
                <h2 className="display text-[18px] font-semibold tracking-tight mb-1" style={{ color: "var(--t1)" }}>
                  Validate your first idea in under 60 seconds.
                </h2>
                <p className="text-[13px]" style={{ color: "var(--t2)" }}>
                  Write one sentence. We fetch real signals from Reddit and GitHub and give you a GO · KILL · PIVOT verdict.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                <Link
                  href="/ideas/new"
                  className="display text-[13px] font-semibold px-5 h-10 rounded-md flex items-center justify-center transition-opacity hover:opacity-90"
                  style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
                >
                  Start →
                </Link>
                <Link
                  href="/onboarding"
                  className="mono text-[11px] px-4 h-10 rounded-md border flex items-center justify-center transition-colors hover:border-(--t2)"
                  style={{ borderColor: "var(--border)", color: "var(--t3)" }}
                >
                  How it works
                </Link>
              </div>
            </div>
          )}

          {/* Role-specific greeting — reads from localStorage set during onboarding */}
          {ownIdeas.length > 0 && <RoleGreeting />}

          {/* Weekly digest opt-in banner — dismissible */}
          {onboardingDone && <WeeklyDigestBanner />}

          {/* Onboarding checklist — hidden once all done or when no ideas yet */}
          {!onboardingDone && ownIdeas.length > 0 && (
            <div
              className="rounded-md border p-5"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            >
              <div className="mono text-[10px] uppercase tracking-[0.14em] text-(--t3) mb-3">
                Getting started
              </div>
              <div className="space-y-2">
                {onboardingSteps.map((step, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div
                      className="w-5 h-5 rounded shrink-0 flex items-center justify-center"
                      style={{
                        background: step.done ? "color-mix(in srgb, var(--validated) 15%, transparent)" : "var(--border)",
                        border: `1px solid ${step.done ? "color-mix(in srgb, var(--validated) 40%, transparent)" : "var(--border)"}`,
                      }}
                    >
                      {step.done && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="var(--validated)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span
                      className="text-[13px]"
                      style={{
                        color: step.done ? "var(--t3)" : "var(--t1)",
                        textDecoration: step.done ? "line-through" : "none",
                      }}
                    >
                      {step.done ? step.label : (
                        <a href={step.href} style={{ color: "var(--t1)", textDecoration: "none" }}
                          className="hover:underline">{step.label}</a>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}



          {/* Validations table */}
          <DashboardClient
            rows={tableRows}
            totalCount={rawIdeas.length}
            teamFeedRows={teamFeedRows}
            teamName={teamName}
            teamId={teamId}
            plan={plan}
            isWorkspace={isWorkspacePlan && !!team}
          />
        </div>

        {/* RIGHT */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {/* Ideas this month */}
          {(() => {
            const now2 = new Date();
            const ideasThisMonth = ownIdeas.filter((idea) => {
              const d = new Date(idea.createdAt);
              return d.getFullYear() === now2.getFullYear() && d.getMonth() === now2.getMonth();
            }).length;
            return (
              <div
                className="border rounded-md p-5 flex items-center gap-4"
                style={{ borderColor: "var(--border)", background: "var(--surface)" }}
              >
                <div className="display text-[40px] tnum font-semibold leading-none text-(--t1)">
                  {ideasThisMonth}
                </div>
                <div>
                  <div className="mono text-[10px] uppercase tracking-[0.14em] text-(--t3)">
                    ideas this month
                  </div>
                  <div className="text-[12px] mt-1 text-(--t2)">
                    {ideasThisMonth === 0 ? "start validating" : ideasThisMonth === 1 ? "keep going" : "on a roll"}
                  </div>
                </div>
                <div className="ml-auto flex items-end gap-1">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-1 rounded-full"
                      style={{
                        height: 4 + (i % 3) * 4,
                        background: "var(--accent)",
                        opacity: i < Math.min(ideasThisMonth, 10) ? 1 : 0.2,
                      }}
                    />
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Signal Feed */}
          <div
            className="border rounded-md overflow-hidden"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          >
            <div
              className="px-5 py-3.5 border-b flex items-center justify-between"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--validated)" }} />
                <span className="display text-[13px] font-semibold tracking-tight text-(--t1)">
                  Signal Feed
                </span>
              </div>
              <span
                className="mono text-[9px] uppercase tracking-[0.1em] px-2 py-0.5 rounded"
                style={{ background: "color-mix(in srgb, var(--validated) 10%, transparent)", color: "var(--validated)", border: "1px solid color-mix(in srgb, var(--validated) 25%, transparent)" }}
              >
                Team
              </span>
            </div>
            <SignalFeed niches={signalFeedData.data} locked={signalFeedData.locked} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        className="max-w-360 mx-auto px-4 sm:px-10 py-6 flex items-center justify-between border-t"
        style={{ borderColor: "var(--border)" }}
      >
        <span className="mono text-[10px] text-(--t3)">
          {displayName} · {plan} plan · {ownIdeas.length} idea{ownIdeas.length !== 1 ? "s" : ""}
        </span>
        {!isPaidPlan && (
          <Link
            href="/pricing"
            className="mono text-[10px] text-(--t3) hover:text-(--t2) transition-colors"
          >
            upgrade to Founder →
          </Link>
        )}
      </div>

      <FooterMicro />
    </div>
  );
}
