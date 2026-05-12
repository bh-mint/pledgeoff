"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { DecisionCard } from "@/components/DecisionCard";
import { ValidatingLoader } from "@/components/ValidatingLoader";
import { FeedbackButtons } from "@/components/FeedbackButtons";
import type { Idea, Decision, Signal } from "@pledgeoff/core";

interface IdeaPageClientProps {
  idea: Idea;
  initialDecision: Decision | null;
  initialSignals: Signal[];
}

const POLL_INTERVAL_MS = 4000;
const MAX_POLLS = 30;

const SENTIMENT_DOT: Record<Signal["sentiment"], string> = {
  positive: "bg-(--validated)",
  negative: "bg-(--kill)",
  neutral:  "bg-(--t3)",
};

const SENTIMENT_LABEL: Record<Signal["sentiment"], string> = {
  positive: "Positive",
  negative: "Negative",
  neutral:  "Neutral",
};

const SOURCE_ICON: Record<string, React.ReactNode> = {
  hn: (
    <svg width="11" height="11" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
      <rect width="14" height="14" rx="2" fill="currentColor" opacity="0.85"/>
      <text x="7" y="10.5" textAnchor="middle" fontSize="8" fontWeight="bold" fill="white" fontFamily="monospace">Y</text>
    </svg>
  ),
  github: (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  ),
  reddit: (
    <svg width="11" height="11" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M20 10c0-5.52-4.48-10-10-10S0 4.48 0 10c0 5.51 4.48 10 10 10s10-4.49 10-10zm-13.5 1c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5zm6.5 3.5c-.69.69-1.8 1-3 1s-2.31-.31-3-1a.5.5 0 01.71-.71c.5.5 1.37.71 2.29.71s1.79-.21 2.29-.71a.5.5 0 01.71.71zM14 11.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5zm1.5-4.5a1 1 0 100 2 1 1 0 000-2zm-11 1a1 1 0 100 2 1 1 0 000-2zm3.65-3.77C7.19 3.51 6 4.31 6 5.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5c0-.42-.17-.8-.44-1.09l1.43-.99-.79-.18z" />
    </svg>
  ),
  producthunt: (
    <svg width="11" height="11" viewBox="0 0 40 40" fill="currentColor" aria-hidden="true">
      <circle cx="20" cy="20" r="20" fill="#DA552F"/>
      <path d="M22 14h-6v12h3v-4h3a4 4 0 000-8zm0 5h-3v-2h3a1 1 0 010 2z" fill="white"/>
    </svg>
  ),
  google: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  ),
};

const SOURCE_NAME: Record<string, string> = {
  hn: "Hacker News",
  github: "GitHub",
  reddit: "Reddit",
  producthunt: "Product Hunt",
  google: "Google / Reddit",
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

  // Group signals by source for the right panel
  const bySource = signals.reduce<Record<string, Signal[]>>((acc, s) => {
    (acc[s.source] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start">
      {/* ── LEFT: verdict (sticky on desktop) ── */}
      <div className="w-full lg:w-[480px] lg:flex-shrink-0 lg:sticky lg:top-6 lg:self-start">
        {/* Top bar */}
        {decision && (
          <div
            className="flex items-center justify-between pb-3 mb-4 border-b"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="flex items-center gap-2 mono text-[11px] text-(--t3)">
              <span className="text-(--t1) font-medium">
                Pledge<span style={{ color: "var(--accent)" }}>OFF</span>
              </span>
              <span>·</span>
              <span className="hidden sm:inline">validation ·</span>
              <span>{valId}</span>
            </div>
            <div className="mono text-[10px] text-(--t3)">
              {analysisS !== null ? `${analysisS}s analysis` : "scored"}
            </div>
          </div>
        )}

        <p className="mono text-[10px] text-(--t3) uppercase tracking-[0.12em] mb-4">
          Verdict
        </p>

        {decision ? (
          <>
            <DecisionCard decision={decision} ideaId={idea.id} />
            <div className="mt-4">
              <FeedbackButtons ideaId={idea.id} decisionId={decision.id} />
            </div>
          </>
        ) : (
          <ValidatingLoader />
        )}
      </div>

      {/* ── RIGHT: signals (scrollable) ── */}
      {decision && signals.length === 0 && (
        <div className="flex-1 min-w-0">
          <p className="mono text-[10px] text-(--t3) uppercase tracking-[0.12em] mb-4">
            Evidence wall · 0 signals
          </p>
          <div
            className="rounded border px-4 py-5 text-[12px] text-(--t3) leading-relaxed"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          >
            No market signals found for this idea. The verdict above is based on
            general AI knowledge — not live data. Try submitting the idea again in
            a few minutes, or refine the description for better results.
          </div>
        </div>
      )}
      {signals.length > 0 && (
        <div className="flex-1 min-w-0">
          <p className="mono text-[10px] text-(--t3) uppercase tracking-[0.12em] mb-4">
            Evidence wall · {signals.length} signal{signals.length !== 1 ? "s" : ""}
          </p>

          <div className="space-y-6">
            {Object.entries(bySource).map(([source, items]) => (
              <div key={source}>
                {/* Source heading */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-(--t3)">{SOURCE_ICON[source]}</span>
                  <span className="mono text-[10px] text-(--t3) uppercase tracking-[0.1em]">
                    {SOURCE_NAME[source] ?? source} · {items.length}
                  </span>
                </div>

                {/* Signal cards */}
                <div className="space-y-1.5">
                  {items.map((signal) => (
                    <a
                      key={signal.id}
                      href={signal.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded border px-3 py-2.5 hover:border-(--accent) transition-colors group"
                      style={{
                        borderColor: "var(--border)",
                        background: "var(--surface)",
                      }}
                    >
                      {/* Sentiment dot */}
                      <span
                        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${SENTIMENT_DOT[signal.sentiment]}`}
                      />

                      {/* Title + meta */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-(--t1) font-medium truncate leading-snug group-hover:text-(--accent) transition-colors">
                          {signal.title}
                        </p>
                        <p className="mono text-[10px] text-(--t3) mt-0.5">
                          {SENTIMENT_LABEL[signal.sentiment]}
                        </p>
                      </div>

                      {/* View button */}
                      <span className="mono text-[10px] text-(--t3) group-hover:text-(--accent) transition-colors flex-shrink-0 whitespace-nowrap border rounded px-2 py-1"
                        style={{ borderColor: "var(--border)" }}
                      >
                        View ↗
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeout message */}
      {!decision && polls >= MAX_POLLS && (
        <p className="text-[13px] text-(--t3)">
          Analysis is taking longer than expected. Refresh the page in a few seconds.
        </p>
      )}
    </div>
  );
}
