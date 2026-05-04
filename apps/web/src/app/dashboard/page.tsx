import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth-server";
import { container } from "@/lib/container";
import { Nav } from "@/components/Nav";
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

function Sparkline({
  values,
  color = "var(--accent)",
}: {
  values: number[];
  color?: string;
}) {
  if (values.length < 2) return <div style={{ width: 64, height: 28 }} />;
  const W = 64, H = 28, PAD = 2;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values
    .map((v, i) => {
      const x = ((i / (values.length - 1)) * W).toFixed(1);
      const y = (H - PAD - ((v - min) / range) * (H - PAD * 2)).toFixed(1);
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{ overflow: "visible", opacity: 0.8 }}
    >
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
  const ideasKilled = rows.filter((r) => r.decision?.verdict === "KILL").length;

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

  // Sparkline: scores per idea, oldest first, last 10
  const sparkScores = withDecision
    .slice()
    .sort(
      (a, b) =>
        new Date(a.idea.createdAt).getTime() -
        new Date(b.idea.createdAt).getTime()
    )
    .slice(-10)
    .map((r) => computeScore(r.decision)!);

  // Cumulative validated count sparkline
  const sparkValidated = withDecision
    .slice()
    .sort(
      (a, b) =>
        new Date(a.idea.createdAt).getTime() -
        new Date(b.idea.createdAt).getTime()
    )
    .slice(-10)
    .map((_, i) => i + 1);

  // Pipeline: first GO idea
  const pipelineRow = rows.find((r) => r.decision?.verdict === "GO");

  // Table rows (serializable)
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

  const stats = [
    {
      label: "Ideas validated",
      value: withDecision.length,
      unit: "",
      color: "var(--accent)",
      spark: sparkValidated,
    },
    {
      label: "Average score",
      value: avgScore ?? "—",
      unit: avgScore ? "/100" : "",
      color: "var(--validated)",
      spark: sparkScores,
    },
    {
      label: "Ideas killed early",
      value: ideasKilled,
      unit: "",
      color: "var(--kill)",
      spark: rows
        .filter((r) => r.decision?.verdict === "KILL")
        .map((_, i) => i + 1)
        .slice(-10),
    },
    {
      label: "Days to first GO",
      value: daysToFirstGo ?? "—",
      unit: daysToFirstGo ? "d" : "",
      color: "var(--caution)",
      spark: [] as number[],
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--canvas)]">
      <Nav />

      <div className="max-w-[1320px] mx-auto px-8 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <p className="mono text-[10px] text-[var(--t3)] uppercase tracking-[0.12em] mb-1">
              Dashboard
            </p>
            <h1 className="display text-[28px] font-semibold text-[var(--t1)]">
              Your ideas
            </h1>
          </div>
          <Link
            href="/ideas/new"
            className="display h-9 px-5 rounded-md bg-[var(--accent)] text-black text-[13px] font-semibold hover:opacity-90 transition-opacity leading-[36px]"
          >
            New idea →
          </Link>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-md border p-4"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            >
              <p className="mono text-[10px] text-[var(--t3)] uppercase tracking-[0.1em] mb-3">
                {stat.label}
              </p>
              <div className="flex items-end justify-between gap-2">
                <div>
                  <span
                    className="display tnum text-[28px] font-semibold"
                    style={{ color: stat.color }}
                  >
                    {stat.value}
                  </span>
                  {stat.unit && (
                    <span className="mono text-[11px] text-[var(--t3)] ml-1">
                      {stat.unit}
                    </span>
                  )}
                </div>
                <Sparkline values={stat.spark} color={stat.color} />
              </div>
            </div>
          ))}
        </div>

        {/* Main grid 8/4 */}
        <div className="grid grid-cols-12 gap-6">
          {/* Left — pipeline + ideas table */}
          <div className="col-span-12 lg:col-span-8 space-y-6">
            {/* Pipeline */}
            {pipelineRow && (
              <div
                className="rounded-md border p-5"
                style={{ borderColor: "var(--border)", background: "var(--surface)" }}
              >
                <p className="mono text-[10px] text-[var(--t3)] uppercase tracking-[0.1em] mb-3">
                  Pipeline
                </p>
                <p className="text-[13px] text-[var(--t1)] truncate mb-4">
                  {pipelineRow.idea.text}
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Validated", done: true },
                    { label: "Simulated", done: false },
                    { label: "Live",      done: false },
                  ].map((step) => (
                    <div key={step.label}>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        {step.done ? (
                          <span
                            className="text-[9px]"
                            style={{ color: "var(--validated)" }}
                          >
                            ✓
                          </span>
                        ) : (
                          <span
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ background: "var(--border)" }}
                          />
                        )}
                        <span
                          className="mono text-[9px] uppercase tracking-[0.08em]"
                          style={{
                            color: step.done
                              ? "var(--validated)"
                              : "var(--t3)",
                          }}
                        >
                          {step.label}
                        </span>
                      </div>
                      <div
                        className="h-[2px] rounded-full overflow-hidden"
                        style={{ background: "var(--border)" }}
                      >
                        <div
                          className="h-[2px] rounded-full"
                          style={{
                            width: step.done ? "100%" : "0%",
                            background: "var(--validated)",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ideas table */}
            {rows.length === 0 ? (
              <div className="border border-dashed border-[var(--border)] rounded-md p-16 flex flex-col items-center justify-center gap-4">
                <p className="text-[14px] text-[var(--t3)] text-center max-w-xs leading-relaxed">
                  No ideas yet. Validate your first idea — it takes 15 seconds.
                </p>
                <Link
                  href="/ideas/new"
                  className="display h-9 px-5 rounded-md bg-[var(--accent)] text-black text-[13px] font-semibold hover:opacity-90 transition-opacity leading-[36px]"
                >
                  Validate an idea →
                </Link>
              </div>
            ) : (
              <DashboardClient rows={tableRows} />
            )}
          </div>

          {/* Right — sidebar */}
          <div className="col-span-12 lg:col-span-4">
            <div
              className="rounded-md border p-5"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: "var(--border)" }}
                />
                <span className="mono text-[10px] text-[var(--t3)] uppercase tracking-[0.1em]">
                  Niche Goldmine
                </span>
                <span
                  className="mono text-[9px] px-1.5 py-0.5 rounded"
                  style={{ background: "var(--border)", color: "var(--t3)" }}
                >
                  Pro
                </span>
              </div>
              <p className="text-[12px] text-[var(--t3)] leading-relaxed mb-4">
                Live feed of underserved niches with demand signals, search
                volume, and competition scores.
              </p>
              <div className="space-y-2">
                {[
                  "AI productivity tools",
                  "No-code automations",
                  "Indie SaaS for creators",
                ].map((niche) => (
                  <div
                    key={niche}
                    className="flex items-center justify-between px-3 py-2 rounded border"
                    style={{
                      borderColor: "var(--border)",
                      background: "var(--canvas)",
                    }}
                  >
                    <span
                      className="text-[11px] text-[var(--t3)] select-none"
                      style={{ filter: "blur(3px)" }}
                    >
                      {niche}
                    </span>
                    <span
                      className="mono text-[9px] text-[var(--t3)]"
                      style={{ filter: "blur(3px)" }}
                    >
                      ↑84
                    </span>
                  </div>
                ))}
              </div>
              <button
                disabled
                className="w-full mt-4 h-8 rounded border mono text-[11px] text-[var(--t3)] cursor-not-allowed opacity-50"
                style={{ borderColor: "var(--border)" }}
              >
                Coming soon
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="mt-12 pt-6 border-t flex items-center justify-between"
          style={{ borderColor: "var(--border)" }}
        >
          <span className="mono text-[10px] text-[var(--t3)]">
            {user.email ?? "—"} · Free plan ·{" "}
            {rows.length} idea{rows.length !== 1 ? "s" : ""}
          </span>
          <Link
            href="/pricing"
            className="mono text-[10px] text-[var(--t3)] hover:text-[var(--t2)] transition-colors"
          >
            Upgrade →
          </Link>
        </div>
      </div>
    </div>
  );
}
