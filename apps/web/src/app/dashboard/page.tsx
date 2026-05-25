import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth-server";
import { createSupabaseServiceClient } from "@/lib/supabase-server";
import { container } from "@/lib/container";
import { getUserPlan } from "@/server/billing/getUserPlan";
import { DashboardClient, type TableRow, type TeamFeedRow } from "./DashboardClient";
import { ProfileButton } from "@/components/ProfileButton";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FooterMicro } from "@/components/FooterMicro";
import { GoldmineFeed } from "@/components/GoldmineFeed";
import { getGoldmineData } from "@/server/goldmine/getGoldmineData";
import type { Decision } from "@pledgeoff/core";
import { logger } from "@pledgeoff/observability";
import { StatNumber } from "@/components/StatNumber";

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

function Spark({
  data,
  w = 56,
  h = 20,
  color = "var(--accent)",
}: {
  data: number[];
  w?: number;
  h?: number;
  color?: string;
}) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const d = data
    .map((v, i) => {
      const x = ((i / (data.length - 1)) * w).toFixed(1);
      const y = ((1 - (v - min) / range) * h).toFixed(1);
      return `${i === 0 ? "M" : "L"}${x} ${y}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h}>
      <path d={d} stroke={color} strokeWidth="1.25" fill="none" />
    </svg>
  );
}



export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = createSupabaseServiceClient();
  const { data: profile } = await supabase.from("profiles").select("first_name, last_name").eq("id", user.id).single();
  const displayName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || user.email?.split("@")[0] || "—";

  const [ideasResult, plan, teamResult] = await Promise.all([
    container._repos.ideaRepo.findByUserId(user.id),
    getUserPlan(user.id),
    container._repos.teamRepo.findByMemberId(user.id),
  ]);
  const isPaidPlan = plan !== "free";
  const team = teamResult.isOk() ? teamResult.value : null;
  const goldmine = await getGoldmineData(plan);
  if (ideasResult.isErr()) {
    logger.error({ traceId: "dashboard", userId: user.id, error: String(ideasResult.error), outcome: "error" as const }, "dashboard: ideaRepo.findByUserId failed");
  }
  const ideas = ideasResult.isOk() ? ideasResult.value : [];


  const [decisionResults, simulateResults, landingResults, customerResults, buildResults, outcomesResult] = await Promise.all([
    Promise.all(ideas.map((idea) => container._repos.decisionRepo.findByIdeaId(idea.id))),
    Promise.all(ideas.map((idea) => container._repos.simulationRepo.findByIdeaId(idea.id))),
    Promise.all(ideas.map((idea) => container._repos.landingPageRepo.findByIdeaId(idea.id))),
    Promise.all(ideas.map((idea) => container._repos.customerAnalysisRepo.findByIdeaId(idea.id))),
    Promise.all(ideas.map((idea) => container._repos.buildAnalysisRepo.findByIdeaId(idea.id))),
    container._repos.decisionOutcomeRepo.findByUser(user.id),
  ]);

  const outcomeMap = new Map<string, string>();
  if (outcomesResult.isOk()) {
    for (const o of outcomesResult.value) {
      outcomeMap.set(o.ideaId, o.outcomeType);
    }
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const failedDecisions = decisionResults.filter((r) => r.isErr()).length;
  if (failedDecisions > 0) {
    logger.error({ traceId: "dashboard", userId: user.id, failedDecisions, outcome: "error" as const }, "dashboard: decisionRepo failures");
  }

  const rows = ideas
    .map((idea, i) => ({
      idea,
      decision: decisionResults[i].isOk() ? decisionResults[i].value : null,
      tools: {
        simulate: !!(simulateResults[i].isOk() && simulateResults[i].value),
        landing: !!(landingResults[i].isOk() && landingResults[i].value),
        customers: !!(customerResults[i].isOk() && customerResults[i].value),
        build: !!(buildResults[i].isOk() && buildResults[i].value),
      },
    }))
    .sort(
      (a, b) =>
        new Date(b.idea.createdAt).getTime() -
        new Date(a.idea.createdAt).getTime()
    );

  // ── Stats ──
  const withDecision = rows.filter((r) => r.decision);
  const scores = withDecision.map((r) => computeScore(r.decision)!);
  const avgScore =
    scores.length > 0
      ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length)
      : null;
  const killed = rows.filter((r) => r.decision?.verdict === "KILL").length;

  const firstGoRow = [...rows]
    .reverse()
    .find((r) => r.decision?.verdict === "GO");
  const daysToFirstGo = firstGoRow
    ? Math.max(
        1,
        Math.round(
          (new Date(firstGoRow.decision!.createdAt).getTime() -
            new Date(user.created_at).getTime()) /
            86_400_000
        )
      )
    : null;

  // Sparkline data (last 10, oldest first)
  const sorted = withDecision
    .slice()
    .sort(
      (a, b) =>
        new Date(a.idea.createdAt).getTime() -
        new Date(b.idea.createdAt).getTime()
    )
    .slice(-10);

  const sparkValidated = sorted.map((_, i) => i + 1);
  const sparkScores = sorted.map((r) => computeScore(r.decision)!);
  const sparkKilled = rows
    .filter((r) => r.decision?.verdict === "KILL")
    .map((_, i) => i + 1)
    .slice(-10);

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

  // Pipeline — dynamic status based on top GO idea's tool completions
  const pipelineRow = rows.find((r) => r.decision?.verdict === "GO");
  const pt = pipelineRow?.tools;
  const pipelineSteps = [
    { k: "Validate",  done: !!pipelineRow, active: false },
    { k: "Simulate",  done: !!pt?.simulate, active: !!pipelineRow && !pt?.simulate },
    { k: "Landing",   done: !!pt?.landing, active: !!pt?.simulate && !pt?.landing },
    { k: "Customers", done: !!pt?.customers, active: !!pt?.landing && !pt?.customers },
    { k: "Build",     done: !!pt?.build, active: !!pt?.customers && !pt?.build },
  ];
  const stepsLeft = pipelineSteps.filter((s) => !s.done).length;

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

  const userInitials = (user.email ?? "?")
    .split("@")[0]
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen" style={{ background: "var(--canvas)" }}>
      {/* Dashboard nav */}
      <div className="border-b sticky top-0 z-50" style={{ borderColor: "var(--border)", background: "var(--canvas)" }}>
        <div className="max-w-360 mx-auto px-4 sm:px-10 h-14 flex items-center justify-between">
          <div className="flex items-center gap-8 sm:gap-10">
            <Link
              href="/dashboard"
              className="flex items-center gap-2"
              style={{ color: "var(--t1)" }}
              aria-label="PledgeOFF home"
            >
              <Logo size={22} />
              <span className="display text-[15px] font-semibold tracking-tight">
                Pledge<span style={{ color: "var(--accent)" }}>OFF</span>
              </span>
            </Link>
            <nav className="hidden sm:flex items-center gap-7 text-[13px]" style={{ color: "var(--t2)" }}>
              <span style={{ color: "var(--t1)" }}>Dashboard</span>
              <Link href="/ideas/new" className="transition-colors hover:text-(--t1)">Validator</Link>
              <Link href="/blog" className="transition-colors hover:text-(--t1)">Blog</Link>
            </nav>
          </div>
          <div className="flex items-center">
            <div className="hidden sm:flex items-center gap-2 mr-4">
              <span className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: "var(--accent)" }} />
              <span className="mono text-[11px]" style={{ color: "var(--t3)" }}>live</span>
            </div>
            <div className="w-px h-4 mx-4 hidden sm:block" style={{ background: "var(--border)" }} />
            <div className="hidden sm:block mr-3">
              <ThemeToggle />
            </div>
            <ProfileButton email={user.email ?? ""} initials={userInitials} />
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="border-b" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-360 mx-auto px-4 sm:px-10 py-6 sm:py-10 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
          {/* Ideas validated */}
          <div className="border-l pl-4" style={{ borderColor: "var(--border)" }}>
            <div className="mono text-[10px] uppercase tracking-[0.14em] text-(--t3)">
              ideas validated
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <StatNumber value={withDecision.length} className="display text-[36px] tnum font-semibold leading-none text-(--t1)" />
              <Spark data={sparkValidated} color="var(--accent)" />
            </div>
            <div className="mono text-[10px] tnum mt-2 text-(--validated)">
              {withDecision.length > 0 ? `+${withDecision.length} total` : "start validating"}
            </div>
          </div>

          {/* Average score */}
          <div className="border-l pl-4" style={{ borderColor: "var(--border)" }}>
            <div className="mono text-[10px] uppercase tracking-[0.14em] text-(--t3)">
              average score
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <StatNumber value={avgScore} fallback="—" className="display text-[36px] tnum font-semibold leading-none text-(--t1)" />
              <Spark data={sparkScores} color="var(--validated)" />
            </div>
            <div className="mono text-[10px] tnum mt-2 text-(--validated)">
              {avgScore ? `out of 100` : "no data yet"}
            </div>
          </div>

          {/* Killed early */}
          <div className="border-l pl-4" style={{ borderColor: "var(--border)" }}>
            <div className="mono text-[10px] uppercase tracking-[0.14em] text-(--t3)">
              ideas killed early
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <StatNumber value={killed} className="display text-[36px] tnum font-semibold leading-none text-(--t1)" />
              <Spark data={sparkKilled} color="var(--kill)" />
            </div>
            <div className="mono text-[10px] tnum mt-2 text-(--t2)">
              {killed > 0 ? `≈ ${killed * 50}h saved` : "none yet"}
            </div>
          </div>

          {/* Days to first GO */}
          <div className="border-l pl-4" style={{ borderColor: "var(--border)" }}>
            <div className="mono text-[10px] uppercase tracking-[0.14em] text-(--t3)">
              days · first launch-ready
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <StatNumber value={daysToFirstGo} fallback="—" className="display text-[36px] tnum font-semibold leading-none text-(--t1)" />
            </div>
            <div className="mono text-[10px] tnum mt-2 text-(--validated)">
              {daysToFirstGo ? "Pledge avg 23" : "no GO verdict yet"}
            </div>
          </div>
        </div>
      </div>

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

          {/* Onboarding checklist — hidden once all done */}
          {!onboardingDone && (
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

          {/* Pipeline */}
          {rows.length > 0 && (
            <div
              className="border rounded-md p-6"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            >
              <div className="flex items-baseline justify-between mb-5">
                <div className="flex-1 min-w-0 pr-4">
                  <div className="mono text-[10px] uppercase tracking-[0.14em] text-(--t3)">
                    your top idea · launch-ready progress
                  </div>
                  <h2 className="display text-[18px] font-semibold tracking-tight mt-1.5 text-(--t1) truncate">
                    {pipelineRow?.idea.text ?? rows[0].idea.text}
                  </h2>
                </div>
                <div className="text-right shrink-0">
                  <div
                    className="display text-[28px] tnum font-semibold leading-none"
                    style={{ color: "var(--validated)" }}
                  >
                    {stepsLeft}
                  </div>
                  <div className="mono text-[10px] mt-1 text-(--t3)">
                    steps from launch-ready
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {pipelineSteps.map((s, i) => (
                  <div key={s.k}>
                    <div
                      className="h-0.75 rounded-full"
                      style={{
                        background: s.done
                          ? "var(--validated)"
                          : s.active
                          ? "var(--accent)"
                          : "var(--border)",
                      }}
                    />
                    <div className="mt-2 flex items-baseline gap-1.5">
                      <span className="mono text-[10px] tnum text-(--t3)">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span
                        className={`display text-[13px] ${s.done || s.active ? "font-semibold" : ""}`}
                        style={{
                          color: s.done
                            ? "var(--t1)"
                            : s.active
                            ? "var(--accent)"
                            : "var(--t3)",
                        }}
                      >
                        {s.k}
                      </span>
                    </div>
                    <div className="mono text-[10px] mt-1 text-(--t3)">
                      {s.done ? "complete" : s.active ? "in progress" : "pending"}
                    </div>
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
            <GoldmineFeed niches={goldmine.data} locked={goldmine.locked} />
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
