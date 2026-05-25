"use client";

import { useEffect, useState, useCallback } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { DecisionCard } from "@/components/DecisionCard";
import { ValidatingLoader } from "@/components/ValidatingLoader";
import { FeedbackButtons } from "@/components/FeedbackButtons";
import { SimulateClient } from "./simulate/SimulateClient";
import { LandingClient } from "./landing/LandingClient";
import { CustomersClient } from "./customers/CustomersClient";
import { BuildClient } from "./build/BuildClient";
import { CompetitorsClient } from "./competitors/CompetitorsClient";
import { AuditTrailClient } from "./audit-trail/AuditTrailClient";
import { LaunchKitClient } from "./launch-kit/LaunchKitClient";
import type { Idea, Decision, Signal, Simulation, LandingPage, CustomerAnalysis, BuildAnalysis, CompetitorAnalysis, LaunchKit } from "@pledgeoff/core";

type Plan = "free" | "founder" | "team" | "studio" | "enterprise";

interface IdeaPageClientProps {
  idea: Idea;
  initialDecision: Decision | null;
  initialSignals: Signal[];
  initialSimulation: Simulation | null;
  initialLanding: LandingPage | null;
  initialCustomers: CustomerAnalysis | null;
  initialBuild: BuildAnalysis | null;
  initialCompetitors: CompetitorAnalysis | null;
  initialLaunchKit: LaunchKit | null;
  plan: Plan;
  categoryAvg?: number | null;
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
  devto: (
    <svg width="11" height="11" viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">
      <rect width="100" height="100" rx="12" fill="#0A0A0A"/>
      <text x="50" y="68" textAnchor="middle" fontSize="42" fontWeight="bold" fill="white" fontFamily="monospace">DEV</text>
    </svg>
  ),
  brave: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2L3 7v5c0 5.25 3.75 10.14 9 11.25C17.25 22.14 21 17.25 21 12V7L12 2z" fill="#FB542B"/>
    </svg>
  ),
};

const SOURCE_NAME: Record<string, string> = {
  hn: "Hacker News",
  github: "GitHub",
  reddit: "Reddit",
  producthunt: "Product Hunt",
  google: "Google / Reddit",
  devto: "Dev.to",
  brave: "Reddit (Brave)",
};

type Verdict = "GO" | "KILL" | "PIVOT";
type ToolKey = "simulate" | "landing" | "customers" | "build" | "competitors" | "launch-kit";

const OTTO_MESSAGE: Record<Verdict, (score: number | undefined) => string> = {
  GO: (score) =>
    `Your idea scored GO${score !== undefined ? ` with a ${score}/100` : ""}. The data confirms the pain is real and the market isn't oversaturated. You have a green light — now build smart. Run the tools below to understand who buys, how much you can make, who you're up against, and what to build first.`,
  PIVOT: (score) =>
    `Your idea scored PIVOT${score !== undefined ? ` with a ${score}/100` : ""}. The foundation is solid — there's a real pain in the market. The problem is the direction: the way you're approaching it now doesn't fit the current market. Run the 2 tools below to find where the real opportunity is, then adjust your direction and re-validate. If you get GO, all tools unlock automatically.`,
  KILL: (score) =>
    `Your idea scored KILL${score !== undefined ? ` with a ${score}/100` : ""}. The data shows the market either doesn't exist at scale or is dominated by entrenched players you can't compete with right now. Before you move on, run Competitive Landscape — understand exactly why, so you don't fall into the same trap with your next idea.`,
};

const TOOL_META: Record<ToolKey, { num: string; label: string; desc: string }> = {
  simulate:    { num: "02", label: "Revenue Model",           desc: "TAM, 3 pricing scenarios, break-even" },
  landing:     { num: "03", label: "Page Brief",              desc: "AI-generated headline, features, CTA" },
  customers:   { num: "04", label: "ICP Analysis",            desc: "Segments, pain points, real quotes" },
  build:       { num: "05", label: "Build Spec",              desc: "Tech stack, libraries, GitHub gaps" },
  competitors: { num: "06", label: "Competitive Landscape",   desc: "Who exists, how they position, where the gaps are" },
  "launch-kit": { num: "08", label: "GTM Brief",              desc: "A/B headlines · email sequence · pricing recommendation" },
};

const LOCK_REASONS: Record<ToolKey, Record<"PIVOT" | "KILL", string>> = {
  simulate: {
    PIVOT: "Don't model revenue for a direction you're about to change. Run this after you confirm the new angle.",
    KILL:  "No point projecting revenue for an idea you won't build.",
  },
  landing: {
    PIVOT: "You'd be writing copy for an idea that needs to change. Wasted time and effort.",
    KILL:  "No point writing copy for an idea you won't launch.",
  },
  customers: {
    PIVOT: "",
    KILL:  "No point defining a customer profile for a market that doesn't exist at scale.",
  },
  build: {
    PIVOT: "Your tech stack depends on what exactly you're building. Lock the direction first.",
    KILL:  "No point planning architecture for something that won't be built.",
  },
  competitors: {
    PIVOT: "",
    KILL:  "",
  },
  "launch-kit": {
    PIVOT: "Generate the launch kit after you lock the new direction and get a GO.",
    KILL:  "No point building a launch kit for an idea you won't launch.",
  },
};

function getAvailability(verdict: Verdict): { available: ToolKey[]; locked: Array<{ key: ToolKey; reason: string }> } {
  if (verdict === "GO") {
    return { available: ["simulate", "landing", "customers", "build", "competitors", "launch-kit"], locked: [] };
  }
  if (verdict === "PIVOT") {
    return {
      available: ["customers", "competitors"],
      locked: [
        { key: "simulate",    reason: LOCK_REASONS.simulate.PIVOT },
        { key: "landing",     reason: LOCK_REASONS.landing.PIVOT },
        { key: "build",       reason: LOCK_REASONS.build.PIVOT },
        { key: "launch-kit",  reason: LOCK_REASONS["launch-kit"].PIVOT },
      ],
    };
  }
  return {
    available: ["competitors"],
    locked: [
      { key: "simulate",    reason: LOCK_REASONS.simulate.KILL },
      { key: "landing",     reason: LOCK_REASONS.landing.KILL },
      { key: "customers",   reason: LOCK_REASONS.customers.KILL },
      { key: "build",       reason: LOCK_REASONS.build.KILL },
      { key: "launch-kit",  reason: LOCK_REASONS["launch-kit"].KILL },
    ],
  };
}

interface ToolSectionProps {
  toolKey: ToolKey;
  done: boolean;
  children: React.ReactNode;
}

function ToolSection({ toolKey, done, children }: ToolSectionProps) {
  const meta = TOOL_META[toolKey];
  return (
    <div className="pt-6 border-t" style={{ borderColor: "var(--border)" }}>
      <div className="flex items-center gap-3 mb-4">
        <span className="mono text-[10px] w-5 flex-shrink-0" style={{ color: "var(--t3)" }}>{meta.num}</span>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold leading-snug" style={{ color: "var(--t1)" }}>{meta.label}</p>
          <p className="mono text-[10px]" style={{ color: "var(--t3)" }}>{meta.desc}</p>
        </div>
        {done && (
          <span className="mono text-[9px] px-1.5 py-0.5 rounded flex-shrink-0"
            style={{ background: "rgba(125,214,107,0.12)", color: "var(--validated)", border: "1px solid rgba(125,214,107,0.3)" }}>
            ✓ done
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

interface OttoSectionProps {
  verdict: Verdict;
  score: number | undefined;
  ideaId: string;
  initialSimulation: Simulation | null;
  initialLanding: LandingPage | null;
  initialCustomers: CustomerAnalysis | null;
  initialBuild: BuildAnalysis | null;
  initialCompetitors: CompetitorAnalysis | null;
  initialLaunchKit: LaunchKit | null;
}

type ToolGroup = "all" | "analysis" | "execution" | "intelligence";

const TOOL_GROUP_KEYS: Record<ToolGroup, ToolKey[]> = {
  all:          ["simulate", "landing", "customers", "build", "competitors", "launch-kit"],
  analysis:     ["simulate", "competitors"],
  execution:    ["landing", "build", "launch-kit"],
  intelligence: ["customers"],
};

const TOOL_GROUP_LABELS: Record<ToolGroup, string> = {
  all:          "All",
  analysis:     "Analysis",
  execution:    "Execution",
  intelligence: "Intelligence",
};

function OttoSection({
  verdict, score, ideaId,
  initialSimulation, initialLanding, initialCustomers, initialBuild, initialCompetitors, initialLaunchKit,
}: OttoSectionProps) {
  const [overrideAll, setOverrideAll] = useState(false);
  const [toolGroup, setToolGroup] = useState<ToolGroup>("all");
  const message = OTTO_MESSAGE[verdict](score);
  const { available, locked } = getAvailability(verdict);

  const groupKeys = TOOL_GROUP_KEYS[toolGroup];
  const filteredAvailable = available.filter((k) => groupKeys.includes(k));
  const filteredLocked = locked.filter(({ key }) => groupKeys.includes(key));

  const isDone: Record<ToolKey, boolean> = {
    simulate:      !!initialSimulation,
    landing:       !!initialLanding,
    customers:     !!initialCustomers,
    build:         !!initialBuild,
    competitors:   !!initialCompetitors,
    "launch-kit":  !!initialLaunchKit,
  };

  function renderToolContent(key: ToolKey) {
    switch (key) {
      case "simulate":    return <SimulateClient    ideaId={ideaId} initialSimulation={initialSimulation} />;
      case "landing":     return <LandingClient     ideaId={ideaId} initialLanding={initialLanding} />;
      case "customers":   return <CustomersClient   ideaId={ideaId} initialAnalysis={initialCustomers} />;
      case "build":       return <BuildClient       ideaId={ideaId} initialAnalysis={initialBuild} />;
      case "competitors": return <CompetitorsClient ideaId={ideaId} initialAnalysis={initialCompetitors} />;
      case "launch-kit":  return <LaunchKitClient   ideaId={ideaId} initialKit={initialLaunchKit} />;
    }
  }

  const lockedToShow = filteredLocked.filter(({ key }) => key !== "customers" || verdict !== "PIVOT");

  return (
    <div className="space-y-0">
      <p className="text-[13px] leading-[1.65] mb-5" style={{ color: "var(--t2)" }}>
        {message}
      </p>

      {/* Group filter pills */}
      <div className="flex flex-wrap gap-1.5 mb-6">
        {(Object.keys(TOOL_GROUP_LABELS) as ToolGroup[]).map((g) => (
          <button
            key={g}
            onClick={() => setToolGroup(g)}
            className="mono text-[10px] px-3 h-7 rounded-full border transition-all"
            style={toolGroup === g
              ? { borderColor: "var(--accent)", color: "var(--accent)", background: "color-mix(in srgb, var(--accent) 10%, transparent)" }
              : { borderColor: "var(--border)", color: "var(--t3)" }
            }
          >
            {TOOL_GROUP_LABELS[g]}
          </button>
        ))}
      </div>

      {/* Available tools — rendered inline */}
      {filteredAvailable.map((key) => (
        <ToolSection key={key} toolKey={key} done={isDone[key]}>
          {renderToolContent(key)}
        </ToolSection>
      ))}

      {/* Override — all tools unlocked */}
      {overrideAll && filteredLocked.map(({ key }) => (
        <ToolSection key={key} toolKey={key} done={isDone[key]}>
          {renderToolContent(key)}
        </ToolSection>
      ))}

      {/* Locked tools — collapsed with reason */}
      {!overrideAll && lockedToShow.map(({ key, reason }) => (
        <div key={key} className="pt-6 border-t" style={{ borderColor: "var(--border)" }}>
          <div className="rounded border px-3 py-2.5"
            style={{ borderColor: "var(--border)", background: "var(--surface)", opacity: 0.45 }}>
            <div className="flex items-center gap-3 mb-1">
              <span className="mono text-[10px] w-5 flex-shrink-0" style={{ color: "var(--t3)" }}>{TOOL_META[key].num}</span>
              <p className="flex-1 text-[12px] font-medium leading-snug" style={{ color: "var(--t1)" }}>{TOOL_META[key].label}</p>
              <span className="mono text-[9px] px-1.5 py-0.5 rounded border flex-shrink-0"
                style={verdict === "PIVOT"
                  ? { borderColor: "rgba(232,179,65,0.35)", color: "var(--caution)", background: "rgba(232,179,65,0.08)" }
                  : { borderColor: "var(--border)", color: "var(--t3)" }}>
                {verdict === "PIVOT" ? "after pivot" : "unavailable"}
              </span>
            </div>
            <p className="mono text-[10px] ml-8 leading-[1.55]" style={{ color: "var(--t3)" }}>
              ↳ {reason}
            </p>
          </div>
        </div>
      ))}

      {/* Override button — PIVOT / KILL only */}
      {locked.length > 0 && (
        <div className="pt-4">
          <button
            onClick={() => setOverrideAll((v) => !v)}
            className="mono text-[10px] transition-colors"
            style={{ color: overrideAll ? "var(--validated)" : "var(--kill)" }}
          >
            {overrideAll
              ? "← Back to Otto's recommendations"
              : "Ignore recommendations — run all tools →"}
          </button>
        </div>
      )}
    </div>
  );
}

export function IdeaPageClient({
  idea,
  initialDecision,
  initialSignals,
  initialSimulation,
  initialLanding,
  initialCustomers,
  initialBuild,
  initialCompetitors,
  initialLaunchKit,
  plan,
  categoryAvg,
}: IdeaPageClientProps) {
  const [decision, setDecision] = useState<Decision | null>(initialDecision);
  const [signals, setSignals] = useState<Signal[]>(initialSignals);
  const [polls, setPolls] = useState(0);

  const polling = !decision && polls < MAX_POLLS;

  const fetchLatest = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
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

  const analysisS =
    decision
      ? Math.max(1, Math.round(
          (new Date(decision.createdAt).getTime() - new Date(idea.createdAt).getTime()) / 1000
        ))
      : null;

  const valId = `val_${idea.id.slice(0, 8)}`;

  const bySource = signals.reduce<Record<string, Signal[]>>((acc, s) => {
    (acc[s.source] ??= []).push(s);
    return acc;
  }, {});

  return (
    <>
      <style>{`
        @keyframes ottoBreath{0%,100%{transform:scale(1);opacity:.65}50%{transform:scale(1.18);opacity:1}}
        @keyframes ottoRing{0%{transform:scale(1);opacity:.4}100%{transform:scale(2.4);opacity:0}}
        .otto-dot{animation:ottoBreath 4400ms cubic-bezier(0.4,0,0.6,1) infinite}
        .otto-ring{animation:ottoRing 4400ms cubic-bezier(0.4,0,0.6,1) infinite}
      `}</style>

      {/* ── Full-width top bar ── */}
      {decision && (
        <div className="flex items-center justify-between pb-3 mb-1 border-b"
          style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2 mono text-[11px] text-(--t3)">
            <span className="text-(--t1) font-medium">
              Pledge<span style={{ color: "var(--accent)" }}>OFF</span>
            </span>
            <span>·</span>
            <span className="hidden sm:inline">signal verdict ·</span>
            <span>{valId}</span>
          </div>
          <div className="mono text-[10px] text-(--t3)">
            {analysisS !== null ? `${analysisS}s analysis` : "scored"}
          </div>
        </div>
      )}

      {/* ── Full-width verdict label row ── */}
      <div className="flex items-center pb-3 mb-6 border-b" style={{ borderColor: "var(--border)" }}>
        <p className="mono text-[10px] text-(--t3) uppercase tracking-[0.12em]">Verdict</p>
      </div>

      {/* ── 3-column grid ── */}
      <div className="grid xl:grid-cols-[420px_1fr_320px] gap-8 items-start">

        {/* ── LEFT: Decision card (sticky) ── */}
        <div className="xl:sticky xl:top-6 xl:self-start">
          {decision ? (
            <>
              <DecisionCard decision={decision} ideaId={idea.id} categoryAvg={categoryAvg} />
              <div className="mt-4">
                <FeedbackButtons ideaId={idea.id} decisionId={decision.id} />
              </div>
            </>
          ) : (
            <ValidatingLoader />
          )}
        </div>

        {/* ── MIDDLE: Otto + Intelligence Tools inline ── */}
        {decision ? (
          <div className="min-w-0">
            {/* Otto header */}
            <div className="flex flex-col items-center text-center gap-4 mb-8 pb-7 border-b"
              style={{ borderColor: "var(--border)" }}>
              <div className="relative w-28 h-28 flex items-center justify-center">
                <div className="absolute w-24 h-24 rounded-full otto-ring"
                  style={{ background: "var(--accent)", opacity: 0.08 }} />
                <div className="absolute w-16 h-16 rounded-full otto-ring"
                  style={{ background: "var(--accent)", opacity: 0.15, animationDelay: "-1.5s" }} />
                <div className="absolute w-9 h-9 rounded-full otto-ring"
                  style={{ background: "var(--accent)", opacity: 0.25, animationDelay: "-3s" }} />
                <div className="w-5 h-5 rounded-full otto-dot"
                  style={{ background: "var(--accent)" }} />
              </div>
              <div>
                <div className="display text-[32px] font-semibold tracking-tight leading-none"
                  style={{ color: "var(--accent)" }}>
                  Otto
                </div>
                <div className="mono text-[11px] mt-1.5" style={{ color: "var(--t3)" }}>
                  your AI co-founder
                </div>
              </div>
            </div>

            <OttoSection
              verdict={decision.verdict as Verdict}
              score={decision.score}
              ideaId={idea.id}
              initialSimulation={initialSimulation}
              initialLanding={initialLanding}
              initialCustomers={initialCustomers}
              initialBuild={initialBuild}
              initialCompetitors={initialCompetitors}
              initialLaunchKit={initialLaunchKit}
            />
          </div>
        ) : (
          <div />
        )}

        {/* ── RIGHT: Signals ── */}
        <div>
          {decision && signals.length === 0 && (
            <>
              <p className="mono text-[10px] text-(--t3) uppercase tracking-[0.12em] mb-4">
                Evidence wall · 0 signals
              </p>
              <div className="rounded border px-4 py-5 text-[12px] text-(--t3) leading-relaxed"
                style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                No market signals found for this idea. The verdict is based on
                general AI knowledge — not live data. Try refining your description.
              </div>
            </>
          )}

          {signals.length > 0 && (
            <>
              <p className="mono text-[10px] text-(--t3) uppercase tracking-[0.12em] mb-4">
                Evidence wall · {signals.length} signal{signals.length !== 1 ? "s" : ""}
              </p>
              <div className="space-y-5">
                {Object.entries(bySource).map(([source, items]) => (
                  <div key={source}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-(--t3)">{SOURCE_ICON[source]}</span>
                      <span className="mono text-[10px] text-(--t3) uppercase tracking-[0.1em]">
                        {SOURCE_NAME[source] ?? source} · {items.length}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {items.map((signal) => (
                        <a key={signal.id} href={signal.url} target="_blank" rel="noopener noreferrer"
                          className="block rounded border px-3 py-2.5 hover:border-(--accent) transition-colors group"
                          style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${SENTIMENT_DOT[signal.sentiment]}`} />
                            <span className="mono text-[10px]" style={{ color: "var(--t3)" }}>
                              {SENTIMENT_LABEL[signal.sentiment]}
                            </span>
                          </div>
                          <p className="text-[12px] text-(--t1) font-medium leading-snug group-hover:text-(--accent) transition-colors line-clamp-2">
                            {signal.title}
                          </p>
                          <p className="mono text-[10px] mt-2 text-right" style={{ color: "var(--accent)" }}>
                            View ↗
                          </p>
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {!decision && polls >= MAX_POLLS && (
            <p className="text-[13px] text-(--t3)">
              Analysis is taking longer than expected. Refresh the page in a few seconds.
            </p>
          )}
        </div>

      </div>

      {/* Audit Trail — full width, below two-column layout */}
      <div className="mt-10 pt-8 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-3 mb-5">
          <span className="mono text-[10px] w-5 shrink-0" style={{ color: "var(--t3)" }}>07</span>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold leading-snug" style={{ color: "var(--t1)" }}>Decision Audit Trail</p>
            <p className="mono text-[10px]" style={{ color: "var(--t3)" }}>Full history of validations · PDF export for Agency</p>
          </div>
        </div>
        <AuditTrailClient ideaId={idea.id} plan={plan} />
      </div>

    </>
  );
}
