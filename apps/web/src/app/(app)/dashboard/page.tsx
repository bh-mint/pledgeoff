import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth-server";
import { createSupabaseServiceClient } from "@/lib/supabase-server";
import { container } from "@/lib/container";
import { getUserPlan } from "@/server/billing/getUserPlan";
import { getDashboardData } from "@/server/dashboard/getDashboardData";
import { getMarketMovements } from "@/server/dashboard/getMarketMovements";
import { getWinLossData, type WinLossRow } from "@/server/analytics/getWinLossData";
import { DashboardClient, type TableRow, type TeamFeedRow } from "./DashboardClient";
import { getSignalFeedData } from "@/server/signal-feed/getSignalFeedData";
import { getTeamActivity, type TeamActivityEvent } from "@/server/team/getTeamActivity";
import type { Decision } from "@pledgeoff/core";
import { PLAN_LIMITS } from "@pledgeoff/core";

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

  // Phase 1 — plan + team + otto balance (parallel)
  const [plan, memberTeamResult, ownerTeamResult, ottoBalanceResult] = await Promise.all([
    getUserPlan(user.id),
    container.teamRepo.findByMemberId(user.id),
    container.teamRepo.findByOwnerId(user.id),
    container.getOttoBalanceUseCase.execute(user.id),
  ]);

  const ottoBalance = ottoBalanceResult.isOk() ? ottoBalanceResult.value : null;
  // includedLimit can be Infinity (enterprise) — not JSON-serializable; null = unlimited
  const otto =
    ottoBalance && (ottoBalance.includedLimit > 0 || ottoBalance.purchased > 0)
      ? {
          includedUsed:
            ottoBalance.includedLimit === Infinity
              ? 0
              : Math.max(0, ottoBalance.includedLimit - ottoBalance.included),
          includedLimit:
            ottoBalance.includedLimit === Infinity ? null : ottoBalance.includedLimit,
          purchased: ottoBalance.purchased,
        }
      : null;

  const isWorkspacePlan = plan === "team" || plan === "studio" || plan === "enterprise";
  const isPaidPlan = plan !== "free";
  const team =
    (memberTeamResult.isOk() ? memberTeamResult.value : null) ??
    (ownerTeamResult.isOk() ? ownerTeamResult.value : null);

  // Phase 2 — member profiles (workspace only)
  let allMemberIds: string[] = [user.id];
  let profileMap = new Map<
    string,
    { firstName: string | null; lastName: string | null }
  >();
  let teamName: string | null = null;
  let teamId: string | null = null;

  if (team && isWorkspacePlan) {
    teamName = team.name;
    teamId = team.id;

    const membershipsResult = await container.teamRepo.findMembershipsByTeamId(
      team.id
    );
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
        {
          firstName: (p.first_name as string | null) ?? null,
          lastName: (p.last_name as string | null) ?? null,
        },
      ])
    );
  }

  // Phase 3 — ideas + signal feed + win-loss (parallel)
  const isFounderPlus = plan !== 'free';
  const [{ ideas: rawIdeas, outcomes: rawOutcomes }, signalFeedData, winLossRows] =
    await Promise.all([
      getDashboardData(allMemberIds),
      getSignalFeedData(plan),
      isFounderPlus ? getWinLossData(user.id) : Promise.resolve([] as WinLossRow[]),
    ]);

  // Phase 4 — team activity + market movements (parallel)
  const [teamActivityEvents, marketMovements] = await Promise.all([
    team && isWorkspacePlan
      ? getTeamActivity(team.id, allMemberIds, user.id)
      : Promise.resolve([] as TeamActivityEvent[]),
    getMarketMovements(rawIdeas.map((r) => ({ id: r.id, text: r.text }))),
  ]);

  const outcomeMap = new Map<string, string>();
  for (const o of rawOutcomes) {
    outcomeMap.set(o.ideaId, o.outcomeType);
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const ownIdeas = rawIdeas.filter((r) => r.userId === user.id);

  function getMemberInitials(userId: string): string {
    const p = profileMap.get(userId);
    if (p) {
      const full = [p.firstName, p.lastName].filter(Boolean).join(" ");
      if (full)
        return full
          .split(" ")
          .slice(0, 2)
          .map((s) => s[0]?.toUpperCase() ?? "")
          .join("");
    }
    return userId.slice(0, 2).toUpperCase();
  }

  // Table rows
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
      category: row.niche,
      outcomeType,
      needsOutcome:
        isOwn && isOlderThan30Days && !!row.decision && !outcomeType,
      signalsStale: isOlderThan30Days && !!row.decision,
      isOwn,
      memberInitials:
        isWorkspacePlan && team
          ? getMemberInitials(row.userId)
          : undefined,
    };
  });

  // Team feed rows
  let teamFeedRows: TeamFeedRow[] = [];
  if (team && isPaidPlan) {
    const teamIdeaIds = rawIdeas.map((r) => r.id);
    const reactionsResult =
      await container.ideaReactionRepo.findByIdeaIds(teamIdeaIds);
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
          disagree: ideaReactions.filter((r) => r.reaction === "disagree")
            .length,
          myReaction: (ideaReactions.find((r) => r.userId === user.id)
            ?.reaction ?? null) as "agree" | "disagree" | null,
        },
      };
    });
  }

  const now = new Date();
  const thisMonth = ownIdeas.filter((r) => {
    const d = new Date(r.createdAt);
    return (
      d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    );
  }).length;
  const monthLimit = PLAN_LIMITS[plan].verificationsPerMonth;
  const monthLimitDisplay =
    monthLimit === Infinity ? null : (monthLimit as number);

  const builtCount = tableRows.filter(
    (r) =>
      r.isOwn &&
      (r.outcomeType === "built_worked" || r.outcomeType === "built_failed")
  ).length;

  // Win rate: built_worked / all own outcomes (min 3 to show)
  const ownIdeaIds = new Set(ownIdeas.map((r) => r.id));
  const ownOutcomes = rawOutcomes.filter((o) => ownIdeaIds.has(o.ideaId));
  const winRate =
    ownOutcomes.length >= 3
      ? Math.round((ownOutcomes.filter((o) => o.outcomeType === "built_worked").length / ownOutcomes.length) * 100)
      : null;

  const isEmpty = rawIdeas.length === 0;

  // ── Empty state ──
  if (isEmpty) {
    return (
      <div className="db-empty-wrap">
        <div className="db-empty-hero">
          <span className="db-empty-eyebrow">Survey Bureau · No cases on file</span>
          <h1 className="db-empty-h">
            Three steps from<br />a confident decision.
          </h1>
          <p className="db-empty-sub">
            Write your idea. Wait 15 seconds. Receive a GO / KILL / PIVOT verdict
            backed by real signals from {isPaidPlan ? "Reddit, GitHub, Hacker News, Dev.to, and the wider web" : "Reddit and GitHub"} —
            with the reasoning to trust it.
          </p>
          <Link className="db-empty-cta" href="/ideas/new">
            Run your first survey →
          </Link>
        </div>

        <div className="db-empty-preview" style={{ padding: "28px", maxWidth: 860, margin: "0 auto" }}>
          <div className="db-empty-prv-lbl" style={{ fontFamily: "var(--font-chivo-mono), monospace", fontSize: 8, letterSpacing: ".28em", textTransform: "uppercase", color: "var(--faint)", textAlign: "center", marginBottom: 16 }}>
            Your idea history will look like this
          </div>
          <div className="db-ghost-board">
            <div className="bc-hd" style={{ opacity: .4 }}>
              Idea History Board <span className="r">Your account</span>
            </div>
            {[
              { w: "55%", v: "var(--go-mid)" },
              { w: "48%", v: "var(--go-mid)" },
              { w: "62%", v: "rgba(139,96,16,.25)" },
            ].map((g, i) => (
              <div key={i} className="db-ghost-row">
                <div className="db-ghost-blk" style={{ width: 40, height: 10, background: g.v }} />
                <div className="db-ghost-blk" style={{ width: 28, height: 22 }} />
                <div className="db-ghost-blk" style={{ flex: 1, height: 10, maxWidth: g.w }} />
                <div className="db-ghost-blk" style={{ width: 60, height: 8 }} />
              </div>
            ))}
          </div>
        </div>

        <div className="db-steps">
          {[
            {
              n: "Step 01 · Write",
              title: "Describe the idea",
              desc: "Free text, 10–2000 characters. The more specific, the sharper the verdict. Pick a category.",
            },
            {
              n: "Step 02 · Wait 15 s",
              title: "Real signals are fetched",
              desc: isPaidPlan
                ? "The system scans Reddit, GitHub, Hacker News, Dev.to, and the web for evidence. You watch it happen."
                : "The system scans Reddit and GitHub for evidence. Upgrade for six more sources.",
            },
            {
              n: "Step 03 · Read",
              title: "GO · KILL · PIVOT",
              desc: "A verdict with a 0–100 score, four weighted dimensions, and the evidence that produced it.",
            },
          ].map((s) => (
            <div key={s.n} className="db-step">
              <span className="db-step-n">{s.n}</span>
              <div className="db-step-title">{s.title}</div>
              <p className="db-step-desc">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Main dashboard ──
  return (
    <DashboardClient
      rows={tableRows}
      totalCount={rawIdeas.length}
      ownCount={ownIdeas.length}
      teamFeedRows={teamFeedRows}
      teamActivityEvents={teamActivityEvents}
      teamName={teamName}
      teamId={teamId}
      plan={plan}
      isWorkspace={isWorkspacePlan && !!team}
      usedThisMonth={thisMonth}
      monthLimit={monthLimitDisplay}
      builtCount={builtCount}
      winRate={winRate}
      winLossRows={winLossRows}
      signalFeedData={signalFeedData}
      marketMovements={marketMovements}
      otto={otto}
    />
  );
}
