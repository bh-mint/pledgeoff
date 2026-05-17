"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface FeedbackButtonsProps {
  ideaId: string;
  decisionId: string;
}

type Vote = "thumbs_up" | "thumbs_down";
type Stage = "idle" | "voted" | "submitted";

export function FeedbackButtons({ ideaId, decisionId }: FeedbackButtonsProps) {
  const [stage, setStage] = useState<Stage>("idle");
  const [vote, setVote] = useState<Vote | null>(null);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  async function submitFeedback(v: Vote, c?: string) {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await fetch("/api/v1/feedback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        ideaId,
        decisionId,
        vote: v,
        ...(c?.trim() ? { comment: c.trim() } : {}),
      }),
    });
  }

  const handleVote = async (v: Vote) => {
    if (stage !== "idle" || loading) return;
    setVote(v);
    setStage("voted");
  };

  const handleSubmitComment = async () => {
    if (!vote || loading) return;
    setLoading(true);
    await submitFeedback(vote, comment);
    setLoading(false);
    setStage("submitted");
  };

  const handleSkip = async () => {
    if (!vote || loading) return;
    setLoading(true);
    await submitFeedback(vote);
    setLoading(false);
    setStage("submitted");
  };

  if (stage === "submitted") {
    return (
      <p className="mono text-[11px] text-(--validated) uppercase tracking-[0.08em]">
        ✓ Thanks for your feedback.
      </p>
    );
  }

  if (stage === "voted") {
    const prompt = vote === "thumbs_up"
      ? "What worked well?"
      : "What could be improved?";

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="mono text-[11px] text-(--t3) uppercase tracking-[0.08em]">
            Was this verdict helpful?
          </span>
          <button
            className="h-8 w-8 rounded border text-[16px] transition-colors"
            style={{ borderColor: "var(--accent)", background: "color-mix(in srgb, var(--accent) 8%, transparent)" }}
            disabled
          >
            {vote === "thumbs_up" ? "👍" : "👎"}
          </button>
        </div>
        <div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={prompt}
            maxLength={500}
            rows={2}
            autoFocus
            className="w-full max-w-md bg-transparent outline-none border rounded-md px-3 py-2 text-[13px] leading-relaxed resize-none"
            style={{ borderColor: "var(--border)", color: "var(--t1)" }}
          />
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={handleSubmitComment}
              disabled={loading || !comment.trim()}
              className="mono text-[11px] px-4 h-8 rounded border transition-colors disabled:opacity-40"
              style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
            >
              {loading ? "Sending…" : "Send →"}
            </button>
            <button
              onClick={handleSkip}
              disabled={loading}
              className="mono text-[11px] px-4 h-8 rounded border transition-colors hover:border-(--t2) disabled:opacity-40"
              style={{ borderColor: "var(--border)", color: "var(--t3)" }}
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="mono text-[11px] text-(--t3) uppercase tracking-[0.08em]">
        Was this verdict helpful?
      </span>
      <button
        onClick={() => handleVote("thumbs_up")}
        disabled={loading}
        className="h-8 w-8 rounded border border-(--border) text-[16px] hover:border-(--validated) hover:bg-(--validated)/10 transition-colors disabled:opacity-50"
        aria-label="Thumbs up"
      >
        👍
      </button>
      <button
        onClick={() => handleVote("thumbs_down")}
        disabled={loading}
        className="h-8 w-8 rounded border border-(--border) text-[16px] hover:border-(--kill) hover:bg-(--kill)/10 transition-colors disabled:opacity-50"
        aria-label="Thumbs down"
      >
        👎
      </button>
    </div>
  );
}
