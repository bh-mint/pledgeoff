import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth-server";
import { createSupabaseServiceClient } from "@/lib/supabase-server";
import { container } from "@/lib/container";
import { getUserPlan } from "@/server/billing/getUserPlan";
import { getDashboardData } from "@/server/dashboard/getDashboardData";
import { DashboardClient, type TableRow, type TeamFeedRow } from "./DashboardClient";
import { FooterMicro } from "@/components/FooterMicro";
import { GoldmineFeed } from "@/components/GoldmineFeed";
import { getGoldmineData } from "@/server/goldmine/getGoldmineData";
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

  const [{ ideas: rawIdeas, outcomes: rawOutcomes }, plan, teamResult] = await Promise.all([
    getDashboardData(user.id),
    getUserPlan(user.id),
    container._repos.teamRepo.findByMemberId(user.id),
  ]);

  const isPaidPlan = plan !== "free";
  const team = teamResult.isOk() ? teamResult.value : null;
  const goldmineData = await getGoldmineData(plan);
  // Alias for compatibility with the rest of the page (stats, onboarding, team feed)
  const ideas = rawIdeas;

  const outcomeMap = new Map<string, string>();
  for (const o of rawOutcomes) {
    outcomeMap.set(o.ideaId, o.outcomeType);
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const rows = rawIdeas.map((row) => ({
    idea: { id: row.id, userId: row.userId, text: row.text, niche: row.niche, createdAt: row.createdAt },
    decision: row.decision,
    tools: row.tools,
  }));

  const withDecision = rows.filter((r) => r.decision);

  // Onboarding checklist — shows until all 3 steps are done
  const hasIdea = ideas.length > 0;
  const hasVerdict = withDecision.length > 0;
  const hasDeepTool = rows.some((r) => r.tools.simulate || r.tools.landing || r.tools.customers || r.tools.build);
  const onboardingDone = hasIdea && hasVerdict && hasDeepTool;

  const onboardingSteps = [
    { label: "Submit your first idea", href: "/ideas/new", done: hasIdea },
    { label: "Get a verdict", href: "/ideas/new", done: hasVerdict },
    { label: "Run a deep tool (Simulate, Audience, Blueprint…)", href: hasVerdict ? `/ideas/${rows.find((r) => r.decision)?.idea.id}` : "/ideas/new", done: hasDeepTool },
  ];

  // Table rows
  const tableRows: TableRow[] = rows.map(({ idea, decision, tools }) => {
    const isOlderThan30Days = new Date(idea.createdAt) < thirtyDaysAgo;
    const outcomeType = outcomeMap.get(idea.id) ?? null;
    return {
      id: idea.id,
      text: idea.text,
      createdAt: idea.createdAt,
      score: computeScore(decision),
      verdict: decision?.verdict ?? null,
      status: !decision
        ? "pending"
        : decision.verdict === "GO"
        ? "validated"
        : decision.verdict === "KILL"
        ? "killed"
        : "pivoting",
      tools,
      outcomeType,
      needsOutcome: isOlderThan30Days && !!decision && !outcomeType,
      signalsStale: isOlderThan30Days && !!decision,
    };
  });

  // ── Team feed ──
  let teamFeedRows: TeamFeedRow[] = [];
  let teamName: string | null = null;
  let teamId: string | null = null;

  if (team && isPaidPlan) {
    teamName = team.name;
    teamId = team.id;

    const membershipsResult = await container._repos.teamRepo.findMembershipsByTeamId(team.id);
    const memberships = membershipsResult.isOk() ? membershipsResult.value : [];
    const activeMemberships = memberships.filter((m) => m.status === "active");

    // Fetch profiles for all active members
    const memberUserIds = activeMemberships.map((m) => m.userId).filter((id): id is string => id !== null);
    const { data: memberProfiles } = await supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .in("id", memberUserIds);

    const profileMap = new Map(
      (memberProfiles ?? []).map((p) => [
        p.id as string,
        { firstName: (p.first_name as string | null) ?? null, lastName: (p.last_name as string | null) ?? null },
      ])
    );

    const allMemberIds = [...new Set([team.ownerId, ...memberUserIds.filter((id): id is string => id !== null)])];

    const teamIdeasResult = await container._repos.ideaRepo.findByUserIds(allMemberIds);
    if (teamIdeasResult.isOk()) {
      const teamIdeas = teamIdeasResult.value;
      const teamIdeaIds = teamIdeas.map((idea) => idea.id);

      const [teamDecisions, reactionsResult] = await Promise.all([
        Promise.all(teamIdeas.map((idea) => container._repos.decisionRepo.findByIdeaId(idea.id))),
        container._repos.ideaReactionRepo.findByIdeaIds(teamIdeaIds),
      ]);

      const allReactions = reactionsResult.isOk() ? reactionsResult.value : [];

      teamFeedRows = teamIdeas.map((idea, i) => {
        const p = profileMap.get(idea.userId);
        const initials = p
          ? ([p.firstName, p.lastName].filter(Boolean).join(" ") || "?")
              .split(" ")
              .slice(0, 2)
              .map((s) => s[0]?.toUpperCase() ?? "")
              .join("")
          : (idea.userId.slice(0, 2).toUpperCase());
        const decision = teamDecisions[i].isOk() ? teamDecisions[i].value : null;
        const ideaReactions = allReactions.filter((r) => r.ideaId === idea.id);
        return {
          id: idea.id,
          text: idea.text,
          createdAt: idea.createdAt,
          userId: idea.userId,
          memberInitials: initials,
          score: computeScore(decision),
          verdict: decision?.verdict ?? null,
          isOwn: idea.userId === user.id,
          reactions: {
            agree: ideaReactions.filter((r) => r.reaction === "agree").length,
            disagree: ideaReactions.filter((r) => r.reaction === "disagree").length,
            myReaction: (ideaReactions.find((r) => r.userId === user.id)?.reaction ?? null) as "agree" | "disagree" | null,
          },
        };
      });
    }
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--canvas)" }}>
      {/* Main grid */}
      <div className="max-w-360 mx-auto px-4 sm:px-10 py-6 sm:py-10 grid grid-cols-12 gap-6">
        {/* LEFT — pipeline + table */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {/* Welcome banner — first-time users */}
          {rows.length === 0 && (
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
          {rows.length > 0 && <RoleGreeting />}

          {/* Weekly digest opt-in banner — dismissible */}
          {onboardingDone && <WeeklyDigestBanner />}

          {/* Onboarding checklist — hidden once all done or when no ideas yet */}
          {!onboardingDone && rows.length > 0 && (
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
            totalCount={rows.length}
            teamFeedRows={teamFeedRows}
            teamName={teamName}
            teamId={teamId}
            plan={plan}
          />
        </div>

        {/* RIGHT */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {/* Ideas this month */}
          {(() => {
            const now2 = new Date();
            const ideasThisMonth = ideas.filter((idea) => {
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

          {/* Goldmine */}
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
                  Goldmine
                </span>
              </div>
              <span
                className="mono text-[9px] uppercase tracking-[0.1em] px-2 py-0.5 rounded"
                style={{ background: "color-mix(in srgb, var(--validated) 10%, transparent)", color: "var(--validated)", border: "1px solid color-mix(in srgb, var(--validated) 25%, transparent)" }}
              >
                Pro+
              </span>
            </div>
            <GoldmineFeed niches={goldmineData.data} locked={goldmineData.locked} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        className="max-w-360 mx-auto px-4 sm:px-10 py-6 flex items-center justify-between border-t"
        style={{ borderColor: "var(--border)" }}
      >
        <span className="mono text-[10px] text-(--t3)">
          {displayName} · {plan} plan · {rows.length} idea{rows.length !== 1 ? "s" : ""}
        </span>
        {!isPaidPlan && (
          <Link
            href="/pricing"
            className="mono text-[10px] text-(--t3) hover:text-(--t2) transition-colors"
          >
            upgrade to Pro →
          </Link>
        )}
      </div>

      <FooterMicro />
    </div>
  );
}
