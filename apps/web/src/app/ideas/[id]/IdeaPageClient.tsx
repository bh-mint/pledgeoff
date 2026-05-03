"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { DecisionCard, DecisionPending } from "@/components/DecisionCard";
import { SignalList } from "@/components/SignalList";
import { FeedbackButtons } from "@/components/FeedbackButtons";
import type { Idea, Decision, Signal } from "@pledgeoff/core";

interface IdeaPageClientProps {
  idea: Idea;
  initialDecision: Decision | null;
  initialSignals: Signal[];
}

const POLL_INTERVAL_MS = 4000;
const MAX_POLLS = 30; // 2 minutes max

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
    const { data: { session } } = await supabase.auth.getSession();
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

  return (
    <div className="space-y-10">
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

      {/* Signals */}
      {(signals.length > 0 || decision) && (
        <section>
          <p className="mono text-[10px] text-[var(--t3)] uppercase tracking-[0.12em] mb-4">
            Evidence ({signals.length} signal{signals.length !== 1 ? "s" : ""})
          </p>
          <SignalList signals={signals} />
        </section>
      )}

      {/* Timeout message */}
      {!decision && polls >= MAX_POLLS && (
        <p className="text-[13px] text-[var(--t3)]">
          Analysis is taking longer than expected. Refresh the page in a few seconds.
        </p>
      )}
    </div>
  );
}
