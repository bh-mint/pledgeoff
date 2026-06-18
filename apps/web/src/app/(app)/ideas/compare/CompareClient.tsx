"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getAuthToken } from "@/lib/auth-client";
import type { Idea, Decision } from "@pledgeoff/core";

type IdeaSummary = Idea & { decision: Decision | null };
type IdeaDetail = { idea: Idea; decision: Decision | null };

function dimScoreClass(score: number): "go" | "pivot" | "kill" {
  return score >= 75 ? "go" : score >= 50 ? "pivot" : "kill";
}

function verdictClass(v: string): "go" | "pivot" | "kill" {
  return v === "GO" ? "go" : v === "PIVOT" ? "pivot" : "kill";
}

function ideaTitle(text: string, max = 90): string {
  const t = text.split("\n\n")[0] ?? text;
  return t.length > max ? t.slice(0, max) + "…" : t;
}

function ideaSummary(text: string, max = 220): string {
  const parts = text.split("\n\n");
  const last = parts[parts.length - 1]?.trim() ?? "";
  const body = last.startsWith("Category:") ? parts.slice(1, -1) : parts.slice(1);
  const joined = body.join(" ").trim();
  if (!joined) return "";
  return joined.length > max ? joined.slice(0, max) + "…" : joined;
}

function ideaCategory(text: string): string | null {
  const parts = text.split("\n\n");
  const last = parts[parts.length - 1]?.trim() ?? "";
  return last.startsWith("Category:") ? last.replace("Category:", "").trim() : null;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function getBattleWidths(
  dimsA: Decision["dimensions"],
  dimsB: Decision["dimensions"],
): Array<{ a: number; b: number }> {
  if (!dimsA?.length || !dimsB?.length) return [];
  return dimsA.map((dA) => {
    const dB = dimsB.find((d) => d.name === dA.name);
    if (!dB) return { a: 50, b: 50 };
    const total = dA.score + dB.score;
    if (total === 0) return { a: 50, b: 50 };
    const aW = parseFloat(((dA.score / total) * 100).toFixed(1));
    return { a: aW, b: parseFloat((100 - aW).toFixed(1)) };
  });
}

type Assessment = { text: string; summary: string; leader: "a" | "b" | "even" };

function getAssessment(
  detailA: IdeaDetail,
  detailB: IdeaDetail,
  scoreA: number,
  scoreB: number,
): Assessment {
  const dimsA = detailA.decision?.dimensions ?? [];
  const dimsB = detailB.decision?.dimensions ?? [];
  let aLeads = 0;
  let bLeads = 0;
  const total = dimsA.length;

  for (const dA of dimsA) {
    const dB = dimsB.find((d) => d.name === dA.name);
    if (!dB) continue;
    if (dA.score - dB.score > 2) aLeads++;
    else if (dB.score - dA.score > 2) bLeads++;
  }

  const diff = Math.abs(scoreA - scoreB);
  const leader: "a" | "b" | "even" = diff < 3 ? "even" : scoreA > scoreB ? "a" : "b";

  let text = "";
  let summary = "";

  if (leader === "even") {
    text = `Both ideas score within ${diff} point${diff !== 1 ? "s" : ""} of each other — too close to call on current signals. The dimension breakdown shows ${aLeads > bLeads ? `Idea A edges ahead on ${aLeads}` : bLeads > aLeads ? `Idea B edges ahead on ${bLeads}` : "an even split across"} of ${total} dimensions. Additional signal passes would sharpen the separation.`;
    summary = `Even match · A leads ${aLeads}, B leads ${bLeads} of ${total} dimensions`;
  } else {
    const wLabel = leader === "a" ? "Idea A" : "Idea B";
    const wLeads = leader === "a" ? aLeads : bLeads;
    const wScore = leader === "a" ? scoreA : scoreB;
    text = `${wLabel} has the cleaner path, leading on ${wLeads} of ${total} dimensions with a ${diff}-point score advantage. ${wScore >= 75 ? "Signal strength supports an early move." : "Further validation on the weaker dimensions is recommended before committing resources."}`;
    summary = `${wLabel} leads on ${wLeads} of ${total} dimensions`;
  }

  return { text, summary, leader };
}

export function CompareClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [ideas, setIdeas] = useState<IdeaSummary[]>([]);
  const [ideasLoading, setIdeasLoading] = useState(true);
  const [ideaA, setIdeaA] = useState(searchParams.get("a") ?? "");
  const [ideaB, setIdeaB] = useState(searchParams.get("b") ?? "");
  const [detailA, setDetailA] = useState<IdeaDetail | null>(null);
  const [detailB, setDetailB] = useState<IdeaDetail | null>(null);
  const [loadingA, setLoadingA] = useState(false);
  const [loadingB, setLoadingB] = useState(false);
  const [barWidths, setBarWidths] = useState<Array<{ a: number; b: number }>>([]);

  useEffect(() => {
    async function load() {
      const token = await getAuthToken();
      if (!token) return;
      const res = await fetch("/api/v1/ideas?limit=100", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const json = (await res.json()) as { data: IdeaSummary[] };
      setIdeas(json.data ?? []);
      setIdeasLoading(false);
    }
    void load();
  }, []);

  const fetchDetail = useCallback(
    async (
      id: string,
      setDetail: (d: IdeaDetail | null) => void,
      setLoading: (l: boolean) => void,
    ) => {
      if (!id) {
        setDetail(null);
        return;
      }
      setLoading(true);
      const token = await getAuthToken();
      if (!token) {
        setLoading(false);
        return;
      }
      const res = await fetch(`/api/v1/ideas/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLoading(false);
      if (!res.ok) {
        setDetail(null);
        return;
      }
      const json = (await res.json()) as { data: { idea: Idea; decision: Decision | null } };
      setDetail({ idea: json.data.idea, decision: json.data.decision });
    },
    [],
  );

  useEffect(() => {
    fetchDetail(ideaA, setDetailA, setLoadingA);
  }, [ideaA, fetchDetail]);

  useEffect(() => {
    fetchDetail(ideaB, setDetailB, setLoadingB);
  }, [ideaB, fetchDetail]);

  function selectA(id: string) {
    setIdeaA(id);
    setBarWidths([]);
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set("a", id);
    else params.delete("a");
    router.replace(`/ideas/compare?${params.toString()}`);
  }

  function selectB(id: string) {
    setIdeaB(id);
    setBarWidths([]);
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set("b", id);
    else params.delete("b");
    router.replace(`/ideas/compare?${params.toString()}`);
  }

  const bothReady = !!(detailA?.decision && detailB?.decision && !loadingA && !loadingB);

  const scoreA = detailA?.decision
    ? (detailA.decision.score ?? Math.round(detailA.decision.confidence * 100))
    : 0;
  const scoreB = detailB?.decision
    ? (detailB.decision.score ?? Math.round(detailB.decision.confidence * 100))
    : 0;

  useEffect(() => {
    if (!bothReady) return;
    const dimsA = detailA?.decision?.dimensions;
    const dimsB = detailB?.decision?.dimensions;
    if (!dimsA?.length || !dimsB?.length) return;
    const t = setTimeout(() => {
      setBarWidths(getBattleWidths(dimsA, dimsB));
    }, 150);
    return () => clearTimeout(t);
  }, [bothReady, detailA, detailB]);

  const assessment =
    bothReady && detailA && detailB
      ? getAssessment(detailA, detailB, scoreA, scoreB)
      : null;

  const hasDimensions =
    bothReady &&
    (detailA?.decision?.dimensions?.length ?? 0) > 0 &&
    (detailB?.decision?.dimensions?.length ?? 0) > 0;

  return (
    <div className="cmp-wrap">
      {/* Selector row */}
      <div className="cmp-sel-grid" style={{ marginBottom: 24 }}>
        <div className="fg" style={{ marginBottom: 0 }}>
          <label className="flbl">Idea A</label>
          <select
            className="finp"
            value={ideaA}
            onChange={(e) => selectA(e.target.value)}
            disabled={ideasLoading}
          >
            <option value="">Select idea…</option>
            {ideas
              .filter((i) => i.id !== ideaB)
              .map((idea) => (
                <option key={idea.id} value={idea.id}>
                  {idea.decision ? `[${idea.decision.verdict}] ` : ""}
                  {ideaTitle(idea.text, 55)}
                </option>
              ))}
          </select>
        </div>

        <div className="cmp-sel-vs">VS</div>

        <div className="fg" style={{ marginBottom: 0 }}>
          <label className="flbl">Idea B</label>
          <select
            className="finp"
            value={ideaB}
            onChange={(e) => selectB(e.target.value)}
            disabled={ideasLoading}
          >
            <option value="">Select idea…</option>
            {ideas
              .filter((i) => i.id !== ideaA)
              .map((idea) => (
                <option key={idea.id} value={idea.id}>
                  {idea.decision ? `[${idea.decision.verdict}] ` : ""}
                  {ideaTitle(idea.text, 55)}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Loading */}
      {(loadingA || loadingB) && (
        <p className="fine" style={{ marginBottom: 16 }}>
          Loading…
        </p>
      )}

      {/* Empty state */}
      {!ideasLoading && (!ideaA || !ideaB) && !loadingA && !loadingB && (
        <div className="sec">
          <div className="sec-bd" style={{ textAlign: "center", padding: "48px 24px" }}>
            <p className="fine">Select two ideas above to compare their scores and dimensions.</p>
          </div>
        </div>
      )}

      {/* No decision */}
      {!loadingA &&
        !loadingB &&
        ideaA &&
        ideaB &&
        (!detailA?.decision || !detailB?.decision) && (
          <div className="sec">
            <div className="sec-bd" style={{ textAlign: "center", padding: "32px 24px" }}>
              <p className="fine">
                {!detailA?.decision && !detailB?.decision
                  ? "Neither idea has a verdict yet."
                  : !detailA?.decision
                    ? "Idea A has no verdict yet."
                    : "Idea B has no verdict yet."}{" "}
                Only scored ideas can be compared.
              </p>
            </div>
          </div>
        )}

      {/* Comparison */}
      {bothReady && detailA && detailB && (
        <>
          {/* Idea pair */}
          <div className="cmp-pair">
            {/* Card A */}
            <div className="cmp-card">
              <div className="cc-head a">
                <span>Idea A</span>
                <span className="cc-r">{formatDate(detailA.idea.createdAt)}</span>
              </div>
              <div className="cc-body">
                <div className="cc-verdict">
                  <span className={`cc-v ${verdictClass(detailA.decision!.verdict)}`}>
                    <span className={`cc-dot ${verdictClass(detailA.decision!.verdict)}`} />
                    {detailA.decision!.verdict}
                  </span>
                </div>
                <div className={`cc-score ${verdictClass(detailA.decision!.verdict)}`}>
                  {scoreA}{" "}
                  <span className="cc-score-sub">/ 100</span>
                </div>
                <div className="cc-title">{ideaTitle(detailA.idea.text)}</div>
                <div className="cc-meta">
                  {ideaCategory(detailA.idea.text) && (
                    <span className="cc-cat">{ideaCategory(detailA.idea.text)}</span>
                  )}
                  <span className="cc-conf">
                    Confidence {Math.round(detailA.decision!.confidence * 100)}%
                  </span>
                </div>
                {ideaSummary(detailA.idea.text) && (
                  <p className="cc-sum">{ideaSummary(detailA.idea.text)}</p>
                )}
              </div>
            </div>

            {/* VS */}
            <div className="cmp-vs">
              <span className="cmp-vs-lbl">VS</span>
            </div>

            {/* Card B */}
            <div className="cmp-card">
              <div className="cc-head b">
                <span>Idea B</span>
                <span className="cc-r">{formatDate(detailB.idea.createdAt)}</span>
              </div>
              <div className="cc-body">
                <div className="cc-verdict">
                  <span className={`cc-v ${verdictClass(detailB.decision!.verdict)}`}>
                    <span className={`cc-dot ${verdictClass(detailB.decision!.verdict)}`} />
                    {detailB.decision!.verdict}
                  </span>
                </div>
                <div className={`cc-score ${verdictClass(detailB.decision!.verdict)}`}>
                  {scoreB}{" "}
                  <span className="cc-score-sub">/ 100</span>
                </div>
                <div className="cc-title">{ideaTitle(detailB.idea.text)}</div>
                <div className="cc-meta">
                  {ideaCategory(detailB.idea.text) && (
                    <span className="cc-cat">{ideaCategory(detailB.idea.text)}</span>
                  )}
                  <span className="cc-conf">
                    Confidence {Math.round(detailB.decision!.confidence * 100)}%
                  </span>
                </div>
                {ideaSummary(detailB.idea.text) && (
                  <p className="cc-sum">{ideaSummary(detailB.idea.text)}</p>
                )}
              </div>
            </div>
          </div>

          {/* Dimension duel */}
          {hasDimensions && (
            <div className="duel-board">
              <div className="duel-bh">
                Dimension Analysis
                <span className="r">
                  Idea A vs Idea B · {detailA.decision!.dimensions!.length} dimensions
                </span>
              </div>
              <div className="duel-col-head">
                <span className="dch right">Idea A</span>
                <span className="dch right">A lead</span>
                <span className="dch center">Dimension</span>
                <span className="dch">B lead</span>
                <span className="dch">Idea B</span>
              </div>

              {detailA.decision!.dimensions!.map((dA, i) => {
                const dB = detailB.decision!.dimensions?.find((d) => d.name === dA.name);
                if (!dB) return null;
                const diff = dA.score - dB.score;
                const aWins = diff > 2;
                const bWins = diff < -2;
                const leadClass = aWins ? "go" : bWins ? "pivot" : "even";
                const leadText = aWins
                  ? `A + ${diff}`
                  : bWins
                    ? `B + ${Math.abs(diff)}`
                    : `Even + ${Math.abs(diff)}`;
                const aW = barWidths[i]?.a ?? 50;
                const bW = barWidths[i]?.b ?? 50;

                return (
                  <div key={dA.name} className="duel-row">
                    <div className={`duel-sc ${dimScoreClass(dA.score)}`}>{dA.score}</div>

                    <div className="duel-half">
                      <div className="battle-wrap">
                        <div className="battle-a" style={{ width: `${aW}%` }} />
                        <div className="battle-b" style={{ width: `${bW}%` }} />
                        <div className="battle-mid" />
                      </div>
                    </div>

                    <div className="duel-center">
                      <span className="duel-name">{dA.name}</span>
                      <span className="duel-wt">Wt {Math.round(dA.weight * 100)}%</span>
                      <span className={`duel-lead ${leadClass}`}>{leadText}</span>
                    </div>

                    <div className="duel-half" />

                    <div className={`duel-sc right ${dimScoreClass(dB.score)}`}>{dB.score}</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Assessment */}
          {assessment && (
            <div className="assessment">
              <div className="assess-head">
                Assessment
                <span className="r">{assessment.summary}</span>
              </div>
              <div className="assess-body">
                <span className="assess-tag">
                  Instrument synthesis ·{" "}
                  {new Date().toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                <p className="assess-text">{assessment.text}</p>
                {assessment.leader !== "even" && (
                  <Link
                    href={`/ideas/${assessment.leader === "a" ? detailA.idea.id : detailB.idea.id}`}
                    className="assess-rec"
                  >
                    <div className="assess-rec-dot" />
                    <span className="assess-rec-title">
                      {assessment.leader === "a" ? "Idea A" : "Idea B"} ·{" "}
                      {ideaTitle(
                        assessment.leader === "a" ? detailA.idea.text : detailB.idea.text,
                        45,
                      )}
                    </span>
                    <span className="assess-rec-arr">→</span>
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
