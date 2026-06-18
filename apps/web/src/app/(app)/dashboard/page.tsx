import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth-server";
import { createSupabaseServiceClient } from "@/lib/supabase-server";
import { container } from "@/lib/container";
import { getUserPlan } from "@/server/billing/getUserPlan";
import { getDashboardData } from "@/server/dashboard/getDashboardData";
import { DashboardClient, type TableRow, type TeamFeedRow } from "./DashboardClient";
import { SignalFeed } from "@/components/SignalFeed";
import { getSignalFeedData } from "@/server/signal-feed/getSignalFeedData";
import { getTeamActivity, type TeamActivityEvent } from "@/server/team/getTeamActivity";
import { TeamActivityFeed } from "@/components/TeamActivityFeed";
import { DecisionQueueView } from "./DecisionQueueView";
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
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", user.id)
    .single();

  // Phase 1 — plan + team (parallel)
  const [plan, memberTeamResult, ownerTeamResult] = await Promise.all([
    getUserPlan(user.id),
    container.teamRepo.findByMemberId(user.id),
    container.teamRepo.findByOwnerId(user.id),
  ]);

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

  // Phase 3 — ideas + signal feed (parallel)
  const [{ ideas: rawIdeas, outcomes: rawOutcomes }, signalFeedData] =
    await Promise.all([
      getDashboardData(allMemberIds),
      getSignalFeedData(plan),
    ]);

  // Phase 4 — team activity
  let teamActivityEvents: TeamActivityEvent[] = [];
  if (team && isWorkspacePlan) {
    teamActivityEvents = await getTeamActivity(
      team.id,
      allMemberIds,
      user.id
    );
  }

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

  // Stats
  const withVerdict = ownIdeas.filter((r) => r.decision !== null);
  const goCount = withVerdict.filter((r) => r.decision?.verdict === "GO").length;
  const goRate =
    withVerdict.length > 0
      ? Math.round((goCount / withVerdict.length) * 100)
      : 0;
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
  const allScores = withVerdict
    .map((r) => computeScore(r.decision))
    .filter((s): s is number => s !== null);
  const avgScore =
    allScores.length > 0
      ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
      : null;

  const isEmpty = rawIdeas.length === 0;
  const displayName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    user.email?.split("@")[0] ||
    "—";

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
            backed by real signals from Hacker News, GitHub, and the wider web —
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
              desc: "The system scans Hacker News, GitHub, Dev.to, and the web for evidence. You watch it happen.",
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
    <>
      {/* Stats strip */}
      <div className="stats-strip">
        <div className="stats-i">
          <div className="stat-cell">
            <span className="stat-lbl">Ideas validated</span>
            <div className="stat-val">{ownIdeas.length}</div>
            <div className="stat-sub">Total all time</div>
          </div>
          <div className="stat-cell">
            <span className="stat-lbl">GO rate</span>
            <div className="stat-val go">
              {goRate}
              <em>%</em>
            </div>
            <div className="stat-sub">
              {goCount} of {withVerdict.length} surveys
            </div>
          </div>
          <div className="stat-cell">
            <span className="stat-lbl">This month</span>
            <div className="stat-val">
              {thisMonth}
              {monthLimitDisplay !== null && <em>/ {monthLimitDisplay}</em>}
            </div>
            {monthLimitDisplay !== null && (
              <div className="stat-bar">
                <div
                  className="stat-fill"
                  style={{
                    width: `${Math.min(100, Math.round((thisMonth / monthLimitDisplay) * 100))}%`,
                  }}
                />
              </div>
            )}
            {monthLimitDisplay === null && (
              <div className="stat-sub">{plan} plan</div>
            )}
          </div>
          <div className="stat-cell">
            <span className="stat-lbl">Avg score</span>
            <div className="stat-val">{avgScore ?? "—"}</div>
            <div className="stat-sub">Across all verdicts</div>
          </div>
        </div>
      </div>

      {/* Mobile tabs */}
      <div className="db-mtabs">
        <div className="db-mt-i">
          <button className="db-mtab on" id="db-mt-ideas">Ideas</button>
          <button className="db-mtab" id="db-mt-queue">Queue</button>
          {team && isWorkspacePlan && (
            <button className="db-mtab" id="db-mt-activity">Activity</button>
          )}
        </div>
      </div>

      {/* 3-col layout */}
      <div className="dash-wrap">
        {/* Left: Signal Feed (≥1300px) */}
        <aside className="dash-left">
          <div className="sf-inner">
            <div className="sf-head">
              Signal Feed <span className="sf-r">Live</span>
            </div>
            <SignalFeed
              niches={signalFeedData.data}
              locked={signalFeedData.locked}
            />
          </div>
        </aside>

        {/* Main column */}
        <main className="dash-main">
          <DashboardClient
            rows={tableRows}
            totalCount={rawIdeas.length}
            teamFeedRows={teamFeedRows}
            teamActivityEvents={teamActivityEvents}
            teamName={teamName}
            teamLogoUrl={team?.logoUrl ?? null}
            teamId={teamId}
            plan={plan}
            isWorkspace={isWorkspacePlan && !!team}
            displayName={displayName}
          />
        </main>

        {/* Right sidebar */}
        <aside className="dash-right">
          <div className="dr-inner">
            <div className="sb-bh">
              Decision Queue <span className="r">Top 5</span>
            </div>
            <DecisionQueueView variant="sidebar" />

            {team && isWorkspacePlan && teamActivityEvents.length > 0 && (
              <>
                <div className="sb-bh sb-bh-sep">Team Activity</div>
                <TeamActivityFeed events={teamActivityEvents.slice(0, 6)} />
              </>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
