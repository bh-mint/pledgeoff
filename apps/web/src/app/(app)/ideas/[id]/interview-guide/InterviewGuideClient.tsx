"use client";

import { useState } from "react";
import { getAuthToken } from "@/lib/auth-client";
import type { InterviewGuide } from "@pledgeoff/core";

interface Props {
  ideaId: string;
  initialGuide: InterviewGuide | null;
}

export function InterviewGuideClient({ ideaId, initialGuide }: Props) {
  const [guide, setGuide] = useState<InterviewGuide | null>(initialGuide);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function generate() {
    setLoading(true);
    setErr("");
    const token = await getAuthToken();
    if (!token) { setLoading(false); return; }

    const res = await fetch(`/api/v1/ideas/${ideaId}/interview-guide`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = (await res.json()) as { data?: InterviewGuide; error?: { code: string } };
    setLoading(false);
    if (!res.ok || !json.data) { setErr("Failed to generate interview guide. Try again."); return; }
    setGuide(json.data);
  }

  if (!guide) {
    return (
      <div style={{ padding: "20px 0" }}>
        <p style={{ color: "var(--dim)", marginBottom: "16px", fontSize: 13 }}>
          Generate a structured interview guide to validate your idea with real customers.
        </p>
        {err && <div className="auth-err" style={{ marginBottom: "12px" }}>{err}</div>}
        <button type="button" className="btn-p" onClick={generate} disabled={loading}>
          {loading ? "Generating…" : "Generate Interview Guide →"}
        </button>
      </div>
    );
  }

  return (
    <div className="ig-wrap">
      <div className="ig-meta">
        <span className="ig-seg-label">Target segment</span>
        <span className="ig-seg">{guide.targetSegment}</span>
      </div>

      <div className="ig-section">
        <div className="ig-section-hd">Interview Questions</div>
        <ol className="ig-qlist">
          {guide.questions.map((q, i) => (
            <li key={i} className="ig-q">
              <div className="ig-q-text">{q.question}</div>
              <div className="ig-q-purpose">{q.purpose}</div>
              {q.followUp && (
                <div className="ig-q-followup">↳ {q.followUp}</div>
              )}
            </li>
          ))}
        </ol>
      </div>

      <div className="ig-cols">
        <div className="ig-col">
          <div className="ig-section-hd">Hypotheses to Test</div>
          <ul className="ig-bullets">
            {guide.hypotheses.map((h, i) => (
              <li key={i} className="ig-hyp">{h}</li>
            ))}
          </ul>
        </div>

        <div className="ig-col">
          <div className="ig-section-hd">Red Flags</div>
          <ul className="ig-bullets">
            {guide.redFlags.map((r, i) => (
              <li key={i} className="ig-red">{r}</li>
            ))}
          </ul>
        </div>
      </div>

      <div style={{ marginTop: "20px" }}>
        <button
          type="button"
          className="btn-g"
          onClick={generate}
          disabled={loading}
          style={{ fontSize: 11 }}
        >
          {loading ? "Regenerating…" : "Regenerate →"}
        </button>
      </div>
    </div>
  );
}
