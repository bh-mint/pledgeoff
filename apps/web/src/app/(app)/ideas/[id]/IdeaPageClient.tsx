"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getAuthToken } from "@/lib/auth-client";
import { DecisionCard } from "@/components/DecisionCard";
import { ValidatingLoader } from "@/components/ValidatingLoader";
import { FeedbackButtons } from "@/components/FeedbackButtons";
import { AuditTrailClient } from "./audit-trail/AuditTrailClient";
import { StageTabs } from "./StageTabs";
import type { Idea, Decision, Signal, Simulation, LandingPage, CustomerAnalysis, BuildAnalysis, CompetitorAnalysis, LaunchKit } from "@pledgeoff/core";

type Plan = "free" | "founder" | "team" | "studio" | "enterprise";

interface IdeaPageClientProps {
  idea: Idea;
  initialDecision: Decision | null;
  initialSignals: Signal[];
  initialSimulation: Simulation | null;
  initialLanding: LandingPage | null;
  initialCustomers: CustomerAnalysis | null;
  initialBuild: BuildAnalysis | null;
  initialCompetitors: CompetitorAnalysis | null;
  initialLaunchKit: LaunchKit | null;
  plan: Plan;
  categoryAvg?: number | null;
}

const POLL_INTERVAL_MS = 4000;
const MAX_POLLS = 30;

export function IdeaPageClient({
  idea,
  initialDecision,
  initialSignals,
  initialSimulation,
  initialLanding,
  initialCustomers,
  initialBuild,
  initialCompetitors,
  initialLaunchKit,
  plan,
  categoryAvg,
}: IdeaPageClientProps) {
  const router = useRouter();
  const [decision, setDecision] = useState<Decision | null>(initialDecision);
  const [signals, setSignals] = useState<Signal[]>(initialSignals);
  const [polls, setPolls] = useState(0);

  const polling = !decision && polls < MAX_POLLS;

  const fetchLatest = useCallback(async () => {
    const token = await getAuthToken();
    if (!token) return;

    const res = await fetch(`/api/v1/ideas/${idea.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;

    const json = await res.json() as { data: { decision: Decision | null; signals?: Signal[] } };
    if (json.data.decision) {
      setDecision(json.data.decision);
      setSignals(json.data.signals ?? []);
    }
    setPolls((p) => p + 1);
  }, [idea.id]);

  useEffect(() => {
    if (!polling) return;
    const id = setInterval(fetchLatest, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [polling, fetchLatest]);

  const analysisS =
    decision
      ? Math.max(1, Math.round(
          (new Date(decision.createdAt).getTime() - new Date(idea.createdAt).getTime()) / 1000
        ))
      : null;

  const valId = `val_${idea.id.slice(0, 8)}`;

  const bySource = signals.reduce<Record<string, Signal[]>>((acc, s) => {
    (acc[s.source] ??= []).push(s);
    return acc;
  }, {});

  const isDone = {
    simulate:      !!initialSimulation,
    landing:       !!initialLanding,
    customers:     !!initialCustomers,
    build:         !!initialBuild,
    competitors:   !!initialCompetitors,
    "launch-kit":  !!initialLaunchKit,
  };

  return (
    <>
      {decision && (
        <div className="flex items-center justify-between pb-3 mb-1 border-b"
          style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2 mono text-[11px] text-(--t3)">
            <span className="text-(--t1) font-medium">
              Pledge<span style={{ color: "var(--accent)" }}>OFF</span>
            </span>
            <span>·</span>
            <span className="hidden sm:inline">signal verdict ·</span>
            <span>{valId}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="mono text-[10px] text-(--t3)">
              {analysisS !== null ? `${analysisS}s analysis` : "scored"}
            </div>
            <button
              onClick={() => router.push(`/ideas/compare?a=${idea.id}`)}
              className="mono text-[10px] h-7 px-3 rounded-md border transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
              style={{ borderColor: "var(--border)", color: "var(--t3)" }}
            >
              Compare →
            </button>
            <button
              onClick={() => router.push(`/ideas/new?from=${idea.id}`)}
              className="mono text-[10px] h-7 px-3 rounded-md border transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
              style={{ borderColor: "var(--border)", color: "var(--t3)" }}
            >
              Duplicate →
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center pb-3 mb-6 border-b" style={{ borderColor: "var(--border)" }}>
        <p className="mono text-[10px] text-(--t3) uppercase tracking-[0.12em]">Verdict</p>
      </div>

      <div className="grid xl:grid-cols-[380px_1fr] gap-8 items-start">
        <div className="xl:sticky xl:top-6 xl:self-start">
          {decision ? (
            <>
              <DecisionCard decision={decision} ideaId={idea.id} categoryAvg={categoryAvg} />
              <div className="mt-4">
                <FeedbackButtons ideaId={idea.id} decisionId={decision.id} />
              </div>
            </>
          ) : (
            <ValidatingLoader ideaId={idea.id} />
          )}
        </div>

        {decision ? (
          <div className="min-w-0">
            <StageTabs
              verdict={decision.verdict as "GO" | "KILL" | "PIVOT"}
              score={decision.score}
              ideaId={idea.id}
              signals={signals}
              bySource={bySource}
              isDone={isDone}
              initialSimulation={initialSimulation}
              initialLanding={initialLanding}
              initialCustomers={initialCustomers}
              initialBuild={initialBuild}
              initialCompetitors={initialCompetitors}
              initialLaunchKit={initialLaunchKit}
            />
          </div>
        ) : (
          <div>
            {polls >= MAX_POLLS && (
              <p className="text-[13px] text-(--t3)">
                Analysis is taking longer than usual.{" "}
                <button
                  onClick={() => window.location.reload()}
                  className="underline transition-opacity hover:opacity-70"
                  style={{ color: "var(--accent)" }}
                >
                  Refresh →
                </button>
              </p>
            )}
          </div>
        )}
      </div>

      {decision && (
        <div className="mt-10 pt-8 border-t" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-3 mb-5">
            <span className="mono text-[10px] w-5 shrink-0" style={{ color: "var(--t3)" }}>07</span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold leading-snug" style={{ color: "var(--t1)" }}>Decision Audit Trail</p>
              <p className="mono text-[10px]" style={{ color: "var(--t3)" }}>Full history of validations · PDF export for Studio</p>
            </div>
          </div>
          <AuditTrailClient ideaId={idea.id} plan={plan} />
        </div>
      )}
    </>
  );
}
