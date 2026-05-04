"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { DecisionCard, DecisionPending } from "@/components/DecisionCard";
import { FeedbackButtons } from "@/components/FeedbackButtons";
import type { Idea, Decision, Signal } from "@pledgeoff/core";

interface IdeaPageClientProps {
  idea: Idea;
  initialDecision: Decision | null;
  initialSignals: Signal[];
}

const POLL_INTERVAL_MS = 4000;
const MAX_POLLS = 30;

const SENTIMENT_COLORS: Record<Signal["sentiment"], string> = {
  positive: "var(--validated)",
  negative: "var(--kill)",
  neutral: "var(--t3)",
};

export function IdeaPageClient({
  idea,
  initialDecision,
  initialSignals,
}: IdeaPageClientProps) {
  const [decision, setDecision] = useState<Decision | null>(initialDecision);
  const [signals, setSignals] = useState<Signal[]>(initialSignals);
  const [polls, setPolls] = useState(0);

  const polling = !decision && polls < MAX_POLLS;

  const fetchLatest = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch(`/api/v1/ideas/${idea.id}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) return;

    const json = await res.json();
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
      ? Math.max(
          1,
          Math.round(
            (new Date(decision.createdAt).getTime() -
              new Date(idea.createdAt).getTime()) /
              1000
          )
        )
      : null;

  const valId = `val_${idea.id.slice(0, 8)}`;

  return (
    <div className="space-y-10">
      {/* Top bar (visible when decision is ready) */}
      {decision && (
        <div
          className="flex items-center justify-between pb-4 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-2 mono text-[11px] text-[var(--t3)]">
            <span className="text-[var(--t1)] font-medium">
              Pledge<span style={{ color: "var(--accent)" }}>OFF</span>
            </span>
            <span>·</span>
            <span>validation</span>
            <span>·</span>
            <span>{valId}</span>
          </div>
          <div className="mono text-[10px] text-[var(--t3)]">
            scored just now
            {analysisS !== null && ` · ${analysisS}s analysis`}
          </div>
        </div>
      )}

      {/* Decision */}
      <section>
        <p className="mono text-[10px] text-[var(--t3)] uppercase tracking-[0.12em] mb-4">
          Verdict
        </p>
        {decision ? (
          <>
            <DecisionCard decision={decision} />
            <div className="mt-4">
              <FeedbackButtons ideaId={idea.id} decisionId={decision.id} />
            </div>
          </>
        ) : (
          <DecisionPending />
        )}
      </section>

      {/* Evidence wall */}
      {signals.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <p className="mono text-[10px] text-[var(--t3)] uppercase tracking-[0.12em]">
              Evidence wall · {signals.length} signal
              {signals.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {signals.map((signal) => (
              <div
                key={signal.id}
                className="rounded-md border p-4 flex flex-col justify-between gap-3"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--surface)",
                }}
              >
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="mono text-[10px] text-[var(--t2)] font-medium">
                      {signal.source === "reddit"
                        ? `r/${signal.title.split(" ").slice(0, 2).join("_").toLowerCase()}`
                        : "github"}
                    </span>
                    <span
                      className="mono text-[9px] uppercase"
                      style={{ color: SENTIMENT_COLORS[signal.sentiment] }}
                    >
                      ↑ {signal.sentiment}
                    </span>
                  </div>
                  <p className="text-[13px] text-[var(--t1)] leading-relaxed italic">
                    &ldquo;{signal.summary}&rdquo;
                  </p>
                </div>
                <a
                  href={signal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mono text-[10px] text-[var(--t3)] hover:text-[var(--t2)] transition-colors"
                >
                  View on {signal.source === "reddit" ? "Reddit" : "GitHub"}{" "}
                  ↗
                </a>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Timeout message */}
      {!decision && polls >= MAX_POLLS && (
        <p className="text-[13px] text-[var(--t3)]">
          Analysis is taking longer than expected. Refresh the page in a few
          seconds.
        </p>
      )}
    </div>
  );
}
