"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getAuthToken } from "@/lib/auth-client";
import type { Idea, Decision } from "@pledgeoff/core";

type IdeaSummary = Idea & { decision: Decision | null };
type IdeaDetail = { idea: Idea; decision: Decision | null };

const VERDICT_COLOR: Record<string, string> = {
  GO: "var(--validated)",
  KILL: "var(--kill)",
  PIVOT: "var(--caution)",
};

function dimColor(score: number) {
  return score >= 75 ? "var(--validated)" : score >= 50 ? "var(--caution)" : "var(--kill)";
}

function ideaTitle(text: string, max = 80) {
  const t = text.split("\n\n")[0] ?? text;
  return t.length > max ? t.slice(0, max) + "…" : t;
}

function IdeaSelector({
  ideas,
  value,
  onChange,
  label,
  exclude,
  loading,
}: {
  ideas: IdeaSummary[];
  value: string;
  onChange: (id: string) => void;
  label: string;
  exclude?: string;
  loading: boolean;
}) {
  const filtered = ideas.filter((i) => i.id !== exclude);

  return (
    <div className="flex-1 min-w-0">
      <p className="mono text-[10px] text-(--t3) uppercase tracking-[0.1em] mb-2">{label}</p>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading}
        className="w-full h-9 px-3 rounded-md border text-[13px] text-(--t1) bg-(--canvas) disabled:opacity-50"
        style={{ borderColor: "var(--border)" }}
      >
        <option value="">Select an idea…</option>
        {filtered.map((idea) => (
          <option key={idea.id} value={idea.id}>
            {idea.decision ? `[${idea.decision.verdict}] ` : ""}
            {ideaTitle(idea.text, 60)}
          </option>
        ))}
      </select>
    </div>
  );
}

const DIMENSION_NAMES = ["Market Demand", "Competition", "Feasibility", "Timing"];

function ScoreCard({
  detail,
  isWinner,
  winDelta,
}: {
  detail: IdeaDetail;
  isWinner: boolean;
  winDelta: number;
}) {
  const d = detail.decision!;
  const score = d.score ?? Math.round(d.confidence * 100);
  const color = VERDICT_COLOR[d.verdict] ?? "var(--t1)";

  return (
    <div
      className="rounded-md border p-6"
      style={{
        borderColor: isWinner ? `${color}60` : "var(--border)",
        background: "var(--surface)",
      }}
    >
      {isWinner && (
        <div className="mono text-[10px] mb-3" style={{ color: "var(--validated)" }}>
          ↑ Higher score (+{winDelta})
        </div>
      )}

      <p className="text-[13px] font-semibold text-(--t1) leading-snug mb-5 line-clamp-2">
        {ideaTitle(detail.idea.text, 100)}
      </p>

      <div className="flex items-end gap-4 mb-6">
        <span
          className="display tnum font-semibold"
          style={{
            fontSize: "clamp(48px, 8vw, 80px)",
            lineHeight: 0.9,
            color,
          }}
        >
          {score}
        </span>
        <div className="pb-1">
          <div className="mono text-[13px] font-semibold" style={{ color }}>
            {d.verdict}
          </div>
          <div className="mono text-[10px] text-(--t3)">
            {Math.round(d.confidence * 100)}% conf.
          </div>
        </div>
      </div>

      <Link
        href={`/ideas/${detail.idea.id}`}
        className="mono text-[11px] text-(--t3) hover:text-(--t1) transition-colors"
      >
        View full verdict →
      </Link>
    </div>
  );
}

function DimensionTable({
  detailA,
  detailB,
}: {
  detailA: IdeaDetail;
  detailB: IdeaDetail;
}) {
  return (
    <div className="mt-8">
      <p className="mono text-[10px] text-(--t3) uppercase tracking-[0.1em] mb-4">
        Score breakdown
      </p>

      {/* Column headers */}
      <div className="grid grid-cols-[140px_1fr_1fr] gap-x-4 mb-2">
        <div />
        <div className="mono text-[10px] text-(--t3) uppercase tracking-[0.08em] px-1">Idea A</div>
        <div className="mono text-[10px] text-(--t3) uppercase tracking-[0.08em] px-1">Idea B</div>
      </div>

      {DIMENSION_NAMES.map((name) => {
        const dA = detailA.decision!;
        const dB = detailB.decision!;
        const dimA = dA.dimensions?.find((d) => d.name === name);
        const dimB = dB.dimensions?.find((d) => d.name === name);
        if (!dimA || !dimB) return null;

        const aWins = dimA.score > dimB.score;
        const bWins = dimB.score > dimA.score;

        return (
          <div
            key={name}
            className="grid grid-cols-[140px_1fr_1fr] gap-x-4 py-3 border-b"
            style={{ borderColor: "var(--border)" }}
          >
            {/* Dimension name */}
            <div className="text-[12px] text-(--t2) flex items-center">{name}</div>

            {/* Idea A bar + score */}
            <div className="flex items-center gap-2 px-1">
              <div className="flex-1 h-[3px] rounded-full" style={{ background: "var(--border)" }}>
                <div
                  className="h-[3px] rounded-full"
                  style={{ width: `${dimA.score}%`, background: dimColor(dimA.score) }}
                />
              </div>
              <span
                className="mono tnum text-[12px] w-7 text-right shrink-0"
                style={{
                  color: dimColor(dimA.score),
                  fontWeight: aWins ? 700 : 400,
                }}
              >
                {dimA.score}
              </span>
            </div>

            {/* Idea B bar + score */}
            <div className="flex items-center gap-2 px-1">
              <div className="flex-1 h-[3px] rounded-full" style={{ background: "var(--border)" }}>
                <div
                  className="h-[3px] rounded-full"
                  style={{ width: `${dimB.score}%`, background: dimColor(dimB.score) }}
                />
              </div>
              <span
                className="mono tnum text-[12px] w-7 text-right shrink-0"
                style={{
                  color: dimColor(dimB.score),
                  fontWeight: bWins ? 700 : 400,
                }}
              >
                {dimB.score}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
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
    load();
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
      const json = (await res.json()) as {
        data: { idea: Idea; decision: Decision | null };
      };
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
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set("a", id);
    else params.delete("a");
    router.replace(`/ideas/compare?${params.toString()}`);
  }

  function selectB(id: string) {
    setIdeaB(id);
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set("b", id);
    else params.delete("b");
    router.replace(`/ideas/compare?${params.toString()}`);
  }

  const bothReady =
    detailA?.decision &&
    detailB?.decision &&
    !loadingA &&
    !loadingB;

  const scoreA = detailA?.decision
    ? (detailA.decision.score ?? Math.round(detailA.decision.confidence * 100))
    : 0;
  const scoreB = detailB?.decision
    ? (detailB.decision.score ?? Math.round(detailB.decision.confidence * 100))
    : 0;
  const aWins = scoreA > scoreB;
  const bWins = scoreB > scoreA;

  return (
    <div>
      {/* Selection row */}
      <div className="flex items-end gap-4 mb-8">
        <IdeaSelector
          ideas={ideas}
          value={ideaA}
          onChange={selectA}
          label="Idea A"
          exclude={ideaB}
          loading={ideasLoading}
        />
        <div className="mono text-[11px] text-(--t3) pb-2.5 shrink-0">vs</div>
        <IdeaSelector
          ideas={ideas}
          value={ideaB}
          onChange={selectB}
          label="Idea B"
          exclude={ideaA}
          loading={ideasLoading}
        />
      </div>

      {/* Loading */}
      {(loadingA || loadingB) && (
        <p className="mono text-[11px] text-(--t3)">Loading…</p>
      )}

      {/* Comparison */}
      {bothReady && (
        <>
          <div className="grid sm:grid-cols-2 gap-4">
            <ScoreCard
              detail={detailA!}
              isWinner={aWins}
              winDelta={scoreA - scoreB}
            />
            <ScoreCard
              detail={detailB!}
              isWinner={bWins}
              winDelta={scoreB - scoreA}
            />
          </div>
          <DimensionTable detailA={detailA!} detailB={detailB!} />
        </>
      )}

      {/* No decision for one/both */}
      {!loadingA &&
        !loadingB &&
        ideaA &&
        ideaB &&
        (!detailA?.decision || !detailB?.decision) && (
          <div
            className="rounded-md border p-8 text-center"
            style={{ borderColor: "var(--border)", borderStyle: "dashed" }}
          >
            <p className="text-[13px] text-(--t2)">
              {!detailA?.decision && !detailB?.decision
                ? "Neither idea has a verdict yet."
                : !detailA?.decision
                  ? "Idea A has no verdict yet."
                  : "Idea B has no verdict yet."}{" "}
              Only scored ideas can be compared.
            </p>
          </div>
        )}

      {/* Empty state */}
      {!ideasLoading && (!ideaA || !ideaB) && !loadingA && !loadingB && (
        <div
          className="rounded-md border p-8 text-center"
          style={{ borderColor: "var(--border)", borderStyle: "dashed" }}
        >
          <p className="text-[13px] text-(--t2)">
            Select two ideas above to compare their scores and dimensions.
          </p>
        </div>
      )}
    </div>
  );
}
