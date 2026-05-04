import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth-server";
import { container } from "@/lib/container";
import { DashboardClient, type TableRow } from "./DashboardClient";
import type { Decision } from "@pledgeoff/core";

export const metadata: Metadata = {
  title: "Dashboard — PledgeOFF",
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

const GOLDMINE_ITEMS = [
  { score: 91, cat: "DEV·TOOLING", title: "AI code reviewer that understands your team's style guide", mentions: 412 },
  { score: 87, cat: "FITNESS",     title: "Meal planner that adapts to your training calendar",        mentions: 347 },
  { score: 84, cat: "CREATOR",     title: "Sponsorship rate-card calculator priced by real engagement", mentions: 289 },
];

const PIPELINE_STEPS = [
  { k: "Validate",  done: true,  active: false },
  { k: "Simulate",  done: false, active: false },
  { k: "Landing",   done: false, active: false },
  { k: "Customers", done: false, active: false },
  { k: "Build",     done: false, active: false },
];

export default async function DashboardPage() {
  const user = await requireUser();

  const ideasResult = await container._repos.ideaRepo.findByUserId(user.id);
  const ideas = ideasResult.isOk() ? ideasResult.value : [];

  const decisionResults = await Promise.all(
    ideas.map((idea) => container._repos.decisionRepo.findByIdeaId(idea.id))
  );

  const rows = ideas
    .map((idea, i) => ({
      idea,
      decision: decisionResults[i].isOk() ? decisionResults[i].value : null,
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

  // Pipeline — update first step status
  const pipelineRow = rows.find((r) => r.decision?.verdict === "GO");
  const pipelineSteps = PIPELINE_STEPS.map((s, i) => ({
    ...s,
    done: i === 0 && pipelineRow ? true : s.done,
    active: i === 1 && pipelineRow ? true : s.active,
  }));
  const stepsLeft = pipelineSteps.filter((s) => !s.done).length;

  // Days since account created (proxy for streak)
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const daysSinceJoin = Math.max(
    1,
    Math.round((now - new Date(user.created_at).getTime()) / 86_400_000)
  );

  // Table rows
  const tableRows: TableRow[] = rows.map(({ idea, decision }) => ({
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
  }));

  const userInitials = (user.email ?? "?")
    .split("@")[0]
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen" style={{ background: "var(--canvas)" }}>
      {/* Dashboard nav */}
      <div className="border-b" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-[1440px] mx-auto px-10 h-12 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="display text-[15px] font-semibold tracking-tight text-[var(--t1)]"
            >
              Pledge<span style={{ color: "var(--accent)" }}>OFF</span>
            </Link>
            <nav className="flex items-center gap-5 text-[13px] text-[var(--t2)]">
              <span className="text-[var(--t1)]">Dashboard</span>
              <Link href="/ideas/new" className="hover:text-[var(--t1)] transition-colors">
                Validator
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 mono text-[11px] text-[var(--t2)]">
              <span className="w-1.5 h-1.5 rounded-full pulse-dot bg-[var(--accent)]" />
              <span>live</span>
            </div>
            <div
              className="w-7 h-7 rounded-full border display text-[11px] font-semibold flex items-center justify-center text-[var(--t1)]"
              style={{ borderColor: "var(--border)", background: "var(--canvas)" }}
            >
              {userInitials}
            </div>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="border-b" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-[1440px] mx-auto px-10 py-10 grid grid-cols-12 gap-6">
          {/* Ideas validated */}
          <div className="col-span-3 border-l pl-4" style={{ borderColor: "var(--border)" }}>
            <div className="mono text-[10px] uppercase tracking-[0.14em] text-[var(--t3)]">
              ideas validated
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <div className="display text-[36px] tnum font-semibold leading-none text-[var(--t1)]">
                {withDecision.length}
              </div>
              <Spark data={sparkValidated} color="var(--accent)" />
            </div>
            <div className="mono text-[10px] tnum mt-2 text-[var(--validated)]">
              {withDecision.length > 0 ? `+${withDecision.length} total` : "start validating"}
            </div>
          </div>

          {/* Average score */}
          <div className="col-span-3 border-l pl-4" style={{ borderColor: "var(--border)" }}>
            <div className="mono text-[10px] uppercase tracking-[0.14em] text-[var(--t3)]">
              average score
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <div className="display text-[36px] tnum font-semibold leading-none text-[var(--t1)]">
                {avgScore ?? "—"}
              </div>
              <Spark data={sparkScores} color="var(--validated)" />
            </div>
            <div className="mono text-[10px] tnum mt-2 text-[var(--validated)]">
              {avgScore ? `out of 100` : "no data yet"}
            </div>
          </div>

          {/* Killed early */}
          <div className="col-span-3 border-l pl-4" style={{ borderColor: "var(--border)" }}>
            <div className="mono text-[10px] uppercase tracking-[0.14em] text-[var(--t3)]">
              ideas killed early
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <div className="display text-[36px] tnum font-semibold leading-none text-[var(--t1)]">
                {killed}
              </div>
              <Spark data={sparkKilled} color="var(--kill)" />
            </div>
            <div className="mono text-[10px] tnum mt-2 text-[var(--t2)]">
              {killed > 0 ? `≈ ${killed * 50}h saved` : "none yet"}
            </div>
          </div>

          {/* Days to first GO */}
          <div className="col-span-3 border-l pl-4" style={{ borderColor: "var(--border)" }}>
            <div className="mono text-[10px] uppercase tracking-[0.14em] text-[var(--t3)]">
              days · first launch-ready
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <div className="display text-[36px] tnum font-semibold leading-none text-[var(--t1)]">
                {daysToFirstGo ?? "—"}
              </div>
            </div>
            <div className="mono text-[10px] tnum mt-2 text-[var(--validated)]">
              {daysToFirstGo ? "Pledge avg 23" : "no GO verdict yet"}
            </div>
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="max-w-[1440px] mx-auto px-10 py-10 grid grid-cols-12 gap-6">
        {/* LEFT — pipeline + table */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {/* Pipeline */}
          {rows.length > 0 && (
            <div
              className="border rounded-md p-6"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            >
              <div className="flex items-baseline justify-between mb-5">
                <div className="flex-1 min-w-0 pr-4">
                  <div className="mono text-[10px] uppercase tracking-[0.14em] text-[var(--t3)]">
                    your top idea · launch-ready progress
                  </div>
                  <h2 className="display text-[18px] font-semibold tracking-tight mt-1.5 text-[var(--t1)] truncate">
                    {pipelineRow?.idea.text ?? rows[0].idea.text}
                  </h2>
                </div>
                <div className="text-right flex-shrink-0">
                  <div
                    className="display text-[28px] tnum font-semibold leading-none"
                    style={{ color: "var(--validated)" }}
                  >
                    {stepsLeft}
                  </div>
                  <div className="mono text-[10px] mt-1 text-[var(--t3)]">
                    steps from launch-ready
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {pipelineSteps.map((s, i) => (
                  <div key={s.k}>
                    <div
                      className="h-[3px] rounded-full"
                      style={{
                        background: s.done
                          ? "var(--validated)"
                          : s.active
                          ? "var(--accent)"
                          : "var(--border)",
                      }}
                    />
                    <div className="mt-2 flex items-baseline gap-1.5">
                      <span className="mono text-[10px] tnum text-[var(--t3)]">
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
                    <div className="mono text-[10px] mt-1 text-[var(--t3)]">
                      {s.done ? "complete" : s.active ? "in progress" : "pending"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Validations table */}
          <DashboardClient rows={tableRows} totalCount={rows.length} />
        </div>

        {/* RIGHT */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {/* Streak */}
          <div
            className="border rounded-md p-5 flex items-center gap-4"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          >
            <div className="display text-[40px] tnum font-semibold leading-none text-[var(--t1)]">
              {daysSinceJoin}
            </div>
            <div>
              <div className="mono text-[10px] uppercase tracking-[0.14em] text-[var(--t3)]">
                day streak
              </div>
              <div className="text-[12px] mt-1 text-[var(--t2)]">
                keep validating daily
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
                    opacity: i < Math.min(daysSinceJoin, 10) ? 1 : 0.2,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Goldmine preview */}
          <div
            className="border rounded-md"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          >
            <div
              className="px-5 py-3.5 border-b flex items-center justify-between"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full pulse-dot bg-[var(--accent)]" />
                <span className="display text-[13px] font-semibold tracking-tight text-[var(--t1)]">
                  Today&apos;s goldmine
                </span>
              </div>
              <span className="mono text-[10px] text-[var(--t3)]">3 of 12 · Pro</span>
            </div>
            {GOLDMINE_ITEMS.map((g) => (
              <div
                key={g.title}
                className="px-5 py-3.5 border-b last:border-0 flex items-start gap-3"
                style={{ borderColor: "var(--border)" }}
              >
                <div
                  className="display text-[16px] tnum font-semibold w-7 flex-shrink-0"
                  style={{
                    color: g.score >= 85 ? "var(--accent)" : "var(--t1)",
                  }}
                >
                  {g.score}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="mono text-[10px] text-[var(--t3)]">{g.cat}</div>
                  <div className="text-[12px] mt-1 leading-snug text-[var(--t1)]">
                    {g.title}
                  </div>
                  <div className="mono text-[10px] mt-1 text-[var(--t3)]">
                    {g.mentions} mentions · 7d
                  </div>
                </div>
                <span className="mono text-[10px] text-[var(--accent)]">→</span>
              </div>
            ))}
            <div className="px-5 py-3 mono text-[10px] text-center text-[var(--t3)]">
              unlock all 12 with Pro →
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        className="max-w-[1440px] mx-auto px-10 py-6 flex items-center justify-between border-t"
        style={{ borderColor: "var(--border)" }}
      >
        <span className="mono text-[10px] text-[var(--t3)]">
          {user.email ?? "—"} · free plan · {rows.length} idea{rows.length !== 1 ? "s" : ""} · {daysSinceJoin}d streak
        </span>
        <Link
          href="/pricing"
          className="mono text-[10px] text-[var(--t3)] hover:text-[var(--t2)] transition-colors"
        >
          upgrade to Pro →
        </Link>
      </div>
    </div>
  );
}
