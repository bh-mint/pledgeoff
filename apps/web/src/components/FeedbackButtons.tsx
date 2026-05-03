"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface FeedbackButtonsProps {
  ideaId: string;
  decisionId: string;
}

type Vote = "thumbs_up" | "thumbs_down";

export function FeedbackButtons({ ideaId, decisionId }: FeedbackButtonsProps) {
  const [voted, setVoted] = useState<Vote | null>(null);
  const [loading, setLoading] = useState(false);

  const handleVote = async (vote: Vote) => {
    if (voted || loading) return;
    setLoading(true);

    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await fetch("/api/v1/feedback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ ideaId, decisionId, vote }),
    });

    setVoted(vote);
    setLoading(false);
  };

  if (voted) {
    return (
      <p className="mono text-[11px] text-[var(--validated)] uppercase tracking-[0.08em]">
        ✓ Thanks for your feedback.
      </p>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="mono text-[11px] text-[var(--t3)] uppercase tracking-[0.08em]">
        Was this verdict helpful?
      </span>
      <button
        onClick={() => handleVote("thumbs_up")}
        disabled={loading}
        className="h-8 w-8 rounded border border-[var(--border)] text-[16px] hover:border-[var(--validated)] hover:bg-[var(--validated)]/10 transition-colors disabled:opacity-50"
        aria-label="Thumbs up"
      >
        👍
      </button>
      <button
        onClick={() => handleVote("thumbs_down")}
        disabled={loading}
        className="h-8 w-8 rounded border border-[var(--border)] text-[16px] hover:border-[var(--kill)] hover:bg-[var(--kill)]/10 transition-colors disabled:opacity-50"
        aria-label="Thumbs down"
      >
        👎
      </button>
    </div>
  );
}
