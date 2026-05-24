"use client";

import { useState, useEffect } from "react";

interface Props {
  slug: string;
}

type Feedback = "yes" | "no" | null;

export function ArticleFeedback({ slug }: Props) {
  const storageKey = `article-feedback-${slug}`;
  const [feedback, setFeedback] = useState<Feedback>(null);

  useEffect(() => {
    const stored = localStorage.getItem(storageKey) as Feedback;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored) setFeedback(stored);
  }, [storageKey]);

  function submit(value: "yes" | "no") {
    setFeedback(value);
    localStorage.setItem(storageKey, value);
  }

  return (
    <div
      className="mt-10 pt-8 flex flex-col sm:flex-row sm:items-center gap-4"
      style={{ borderTop: "1px solid var(--border)" }}
    >
      <span className="mono text-[11px] uppercase tracking-[0.08em] shrink-0" style={{ color: "var(--t3)" }}>
        Was this helpful?
      </span>

      {feedback === null ? (
        <div className="flex items-center gap-2">
          <button
            onClick={() => submit("yes")}
            className="inline-flex items-center gap-1.5 rounded-md border h-8 px-4 mono text-[11px] transition-colors hover:border-(--validated)"
            style={{ borderColor: "var(--border)", color: "var(--t2)" }}
          >
            Yes
          </button>
          <button
            onClick={() => submit("no")}
            className="inline-flex items-center gap-1.5 rounded-md border h-8 px-4 mono text-[11px] transition-colors hover:border-(--caution)"
            style={{ borderColor: "var(--border)", color: "var(--t2)" }}
          >
            Could be better
          </button>
        </div>
      ) : (
        <span className="mono text-[11px]" style={{ color: feedback === "yes" ? "var(--validated)" : "var(--caution)" }}>
          {feedback === "yes" ? "Thanks — glad it helped." : "Thanks for the feedback."}
        </span>
      )}
    </div>
  );
}
