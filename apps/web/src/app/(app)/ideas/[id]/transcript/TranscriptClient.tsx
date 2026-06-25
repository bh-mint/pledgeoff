"use client";

import { useState } from "react";
import { getAuthToken } from "@/lib/auth-client";
import type { TranscriptAnalysis } from "@pledgeoff/core";

interface Props {
  ideaId: string;
  initialAnalysis: TranscriptAnalysis | null;
}

const STRENGTH_META = {
  strong:   { label: "Strong signal",   color: "var(--validated)" },
  moderate: { label: "Moderate signal", color: "var(--pivot)" },
  weak:     { label: "Weak signal",     color: "var(--kill)" },
};

const SENTIMENT_META = {
  positive: { symbol: "+", color: "var(--validated)" },
  negative: { symbol: "–", color: "var(--kill)" },
  neutral:  { symbol: "·", color: "var(--dim)" },
};

export function TranscriptClient({ ideaId, initialAnalysis }: Props) {
  const [analysis, setAnalysis] = useState<TranscriptAnalysis | null>(initialAnalysis);
  const [transcript, setTranscript] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function analyze() {
    if (transcript.trim().length < 10) { setErr("Paste at least 10 characters of transcript."); return; }
    setLoading(true);
    setErr("");
    const token = await getAuthToken();
    if (!token) { setLoading(false); return; }

    const res = await fetch(`/api/v1/ideas/${ideaId}/transcript`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ transcript: transcript.trim() }),
    });
    const json = (await res.json()) as { data?: TranscriptAnalysis; error?: { code: string } };
    setLoading(false);
    if (!res.ok || !json.data) { setErr("Analysis failed. Try again."); return; }
    setAnalysis(json.data);
    setTranscript("");
  }

  const strengthMeta = analysis ? STRENGTH_META[analysis.signalStrength] : null;

  return (
    <div className="ta-wrap">
      {/* Input area */}
      <div className="ta-input-section">
        <div className="bc" style={{ background: "var(--surface)" }}>
          <div className="bc-hd">
            Paste interview transcript
            <span className="r">{transcript.length} / 10000</span>
          </div>
          <textarea
            className="ni-ta"
            rows={6}
            maxLength={10000}
            placeholder="Paste the full transcript of your customer interview here. The AI will extract key signals, validate your hypotheses, and surface notable quotes."
            value={transcript}
            onChange={(e) => { setTranscript(e.target.value); setErr(""); }}
          />
        </div>
        {err && <div className="auth-err" style={{ marginTop: "8px" }}>{err}</div>}
        <div style={{ marginTop: "12px" }}>
          <button type="button" className="btn-p" onClick={analyze} disabled={loading || transcript.trim().length < 10}>
            {loading ? "Analyzing…" : "Analyze Transcript →"}
          </button>
        </div>
      </div>

      {/* Results */}
      {analysis && (
        <div className="ta-results">
          {strengthMeta && (
            <div className="ta-strength">
              <span style={{ color: strengthMeta.color, fontWeight: 700, fontFamily: "var(--font-chivo-mono), monospace", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                {strengthMeta.label}
              </span>
            </div>
          )}

          <div className="ta-cols">
            <div className="ta-col">
              <div className="ta-col-hd confirmed">Confirmed</div>
              {analysis.confirmedHypotheses.length > 0
                ? analysis.confirmedHypotheses.map((h, i) => (
                    <div key={i} className="ta-item confirmed">✓ {h}</div>
                  ))
                : <div className="ta-empty">No hypotheses confirmed</div>}
            </div>

            <div className="ta-col">
              <div className="ta-col-hd rejected">Rejected</div>
              {analysis.rejectedHypotheses.length > 0
                ? analysis.rejectedHypotheses.map((h, i) => (
                    <div key={i} className="ta-item rejected">✗ {h}</div>
                  ))
                : <div className="ta-empty">No hypotheses rejected</div>}
            </div>

            <div className="ta-col">
              <div className="ta-col-hd insights">New Insights</div>
              {analysis.newInsights.length > 0
                ? analysis.newInsights.map((ins, i) => (
                    <div key={i} className="ta-item insights">→ {ins}</div>
                  ))
                : <div className="ta-empty">No new insights</div>}
            </div>
          </div>

          {analysis.quotes.length > 0 && (
            <div className="ta-quotes">
              <div className="ta-quotes-hd">Notable Quotes</div>
              {analysis.quotes.map((q, i) => {
                const sm = SENTIMENT_META[q.sentiment];
                return (
                  <div key={i} className="ta-quote">
                    <span className="ta-quote-sent" style={{ color: sm.color }}>{sm.symbol}</span>
                    <div>
                      <div className="ta-quote-text">&ldquo;{q.text}&rdquo;</div>
                      <div className="ta-quote-theme">{q.theme}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
