"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { getAuthToken } from "@/lib/auth-client";
import { SimulateClient } from "./simulate/SimulateClient";
import { LandingClient } from "./landing/LandingClient";
import { CustomersClient } from "./customers/CustomersClient";
import { BuildClient } from "./build/BuildClient";
import { CompetitorsClient } from "./competitors/CompetitorsClient";
import { LaunchKitClient } from "./launch-kit/LaunchKitClient";
import { FeaturesClient } from "./features/FeaturesClient";
import { BattlecardClient } from "./battlecard/BattlecardClient";
import { MarketLandscapeClient } from "./market-landscape/MarketLandscapeClient";
import { InterviewGuideClient } from "./interview-guide/InterviewGuideClient";
import { TranscriptClient } from "./transcript/TranscriptClient";
import { FeedbackButtons } from "@/components/FeedbackButtons";
import { useUpgradeModal } from "@/components/UpgradeModal";
import type {
  Idea,
  Decision,
  Signal,
  Simulation,
  LandingPage,
  CustomerAnalysis,
  BuildAnalysis,
  CompetitorAnalysis,
  LaunchKit,
  FeatureAnalysis,
  Battlecard,
  MarketLandscape,
  InterviewGuide,
  TranscriptAnalysis,
  Dimension,
  DecisionOutcome,
  OutcomeType,
} from "@pledgeoff/core";

type Plan = "free" | "founder" | "team" | "studio" | "enterprise";
type ToolKey = "customers" | "competitors" | "simulate" | "build" | "landing" | "launch-kit" | "features" | "battlecard" | "market-landscape" | "interview-guide" | "transcript";

interface Props {
  idea: Idea;
  initialDecision: Decision | null;
  initialSignals: Signal[];
  initialSimulation: Simulation | null;
  initialLanding: LandingPage | null;
  initialCustomers: CustomerAnalysis | null;
  initialBuild: BuildAnalysis | null;
  initialCompetitors: CompetitorAnalysis | null;
  initialLaunchKit: LaunchKit | null;
  initialFeatures: FeatureAnalysis | null;
  initialBattlecard: Battlecard | null;
  initialMarketLandscape: MarketLandscape | null;
  initialInterviewGuide: InterviewGuide | null;
  initialTranscript: TranscriptAnalysis | null;
  plan: Plan;
  categoryAvg?: number | null;
  ideaTitle: string;
  ideaCategory: string | null;
  existingOutcome: DecisionOutcome | null;
  canReportOutcome: boolean;
}

const POLL_INTERVAL_MS = 4000;
const MAX_POLLS = 30;

const TOOL_META: Record<ToolKey, { stage: string; label: string; desc: string }> = {
  customers:    { stage: "Understand", label: "ICP Analysis",         desc: "Segments · pain points · real quotes" },
  competitors:  { stage: "Understand", label: "Competitive Landscape", desc: "Who exists · positioning · gaps" },
  simulate:     { stage: "Plan",       label: "Revenue Model",         desc: "TAM · 3 pricing scenarios · break-even" },
  build:        { stage: "Plan",       label: "Build Spec",            desc: "Tech stack · libraries · GitHub gaps" },
  landing:      { stage: "Launch",     label: "Page Brief",            desc: "Headline · features · CTA copy" },
  "launch-kit": { stage: "Launch",     label: "GTM Brief",             desc: "A/B headlines · email seq · pricing rec" },
  features:            { stage: "Intel", label: "Feature Analysis",   desc: "Feature-by-feature comparison vs. competitors" },
  battlecard:          { stage: "Intel", label: "Battlecard",          desc: "Objection handling · talking points per competitor" },
  "market-landscape":  { stage: "Intel",     label: "Market Landscape",    desc: "Segments · trends · uncovered opportunities" },
  "interview-guide":   { stage: "Validate",  label: "Interview Guide",     desc: "Structured customer questions · hypotheses · red flags" },
  transcript:          { stage: "Validate",  label: "Transcript Analyzer", desc: "Validate hypotheses · key quotes · signal strength" },
};

const STAGES: { key: string; tools: ToolKey[] }[] = [
  { key: "Understand", tools: ["customers", "competitors"] },
  { key: "Intel",      tools: ["features", "battlecard", "market-landscape"] },
  { key: "Validate",   tools: ["interview-guide", "transcript"] },
  { key: "Plan",       tools: ["simulate", "build"] },
  { key: "Launch",     tools: ["landing", "launch-kit"] },
];

const PLAN_LOCK: Record<ToolKey, { requiredPlan: string; requiredLabel: string } | null> = {
  customers:    null,
  competitors:  { requiredPlan: "founder", requiredLabel: "Founder" },
  simulate:     { requiredPlan: "founder", requiredLabel: "Founder" },
  build:        { requiredPlan: "founder", requiredLabel: "Founder" },
  landing:      { requiredPlan: "founder", requiredLabel: "Founder" },
  "launch-kit": { requiredPlan: "team",    requiredLabel: "Team" },
  features:             { requiredPlan: "founder", requiredLabel: "Founder" },
  battlecard:           { requiredPlan: "team",    requiredLabel: "Team" },
  "market-landscape":   { requiredPlan: "founder", requiredLabel: "Founder" },
  "interview-guide":    { requiredPlan: "founder", requiredLabel: "Founder" },
  transcript:           { requiredPlan: "team",    requiredLabel: "Team" },
};

const PLAN_ORDER = ["free", "founder", "team", "studio", "enterprise"];

function hasPlanAccess(plan: Plan, requiredPlan: string): boolean {
  return PLAN_ORDER.indexOf(plan) >= PLAN_ORDER.indexOf(requiredPlan);
}

function dimClass(score: number): "go" | "watch" | "kill" {
  if (score >= 75) return "go";
  if (score >= 50) return "watch";
  return "kill";
}

function dimFlag(score: number): string {
  if (score >= 75) return "Above threshold";
  if (score >= 50) return "Watch";
  return "Below threshold";
}

function verdictClass(v: string): "go" | "pivot" | "kill" {
  if (v === "GO") return "go";
  if (v === "PIVOT") return "pivot";
  return "kill";
}

function flapChars(verdict: string, score: number): [string, string, string, string] {
  const s = Math.max(0, Math.min(99, score));
  const tens = String(Math.floor(s / 10));
  const units = String(s % 10);
  if (verdict === "GO")    return [tens, units, "G", "O"];
  if (verdict === "PIVOT") return [tens, units, "P", "V"];
  return [tens, units, "K", "L"];
}

const SOURCE_NAME: Record<string, string> = {
  hn: "Hacker News", github: "GitHub", reddit: "Reddit",
  producthunt: "Product Hunt", google: "Google", devto: "Dev.to", brave: "Reddit (Brave)",
  reviews: "Reviews (G2 · Capterra)", news: "News & Announcements", jobs: "Job Postings",
};

const SOURCE_BADGE: Record<string, string> = {
  reviews: "var(--accent-orange, #e07b39)",
  news: "var(--accent-blue, #3b7ed6)",
  jobs: "var(--accent-purple, #7c5cbf)",
};

function sentimentFlag(s: Signal["sentiment"]): string {
  if (s === "positive") return "+";
  if (s === "negative") return "−";
  return "·";
}
function sentimentClass(s: Signal["sentiment"]): string {
  if (s === "positive") return "p";
  if (s === "negative") return "n";
  return "u";
}

// ── Subcomponents ──────────────────────────────────────────────

const FLAP_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function BoardCard({ verdict, score, confidence, signals, createdAt, category }: {
  verdict: string; score: number; confidence: number; signals: Signal[]; createdAt: string; category: string | null;
}) {
  const [cells, setCells] = useState<[string, string, string, string]>(["·", "·", "·", "·"]);
  const [armed, setArmed] = useState(false);
  const vc = verdictClass(verdict);
  const target = flapChars(verdict, score);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    let frame = 0;
    const totalFrames = 14;

    const startDelay = setTimeout(() => {
      interval = setInterval(() => {
        frame++;
        if (frame >= totalFrames) {
          clearInterval(interval);
          setCells(target);
          setTimeout(() => setArmed(true), 80);
        } else {
          const r = () => FLAP_CHARS[Math.floor(Math.random() * FLAP_CHARS.length)];
          setCells([
            frame >= totalFrames - 3 ? target[0] : r(),
            frame >= totalFrames - 2 ? target[1] : r(),
            frame >= totalFrames - 4 ? target[2] : r(),
            frame >= totalFrames - 3 ? target[3] : r(),
          ]);
        }
      }, 55);
    }, 280);

    return () => { clearTimeout(startDelay); clearInterval(interval); };
  }, [verdict, score]); // eslint-disable-line react-hooks/exhaustive-deps

  const date = new Date(createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="bc">
      <div className="bc-hd">
        <span>Survey Verdict Board</span>
        <span className="r">{category ? `${category} · ` : ""}{date}</span>
      </div>
      <div className="bc-bd">
        <div className="fcs">
          <div className={`fc fc-lg fc-${vc}`}>{cells[0]}</div>
          <div className={`fc fc-lg fc-${vc}`}>{cells[1]}</div>
          <div className="fc-gap" />
          <div className={`fc fc-${vc}`}>{cells[2]}</div>
          <div className={`fc fc-${vc}`}>{cells[3]}</div>
        </div>
        <div className="bs">
          <div className="bsp"><span className="bspk">Verdict</span><span className={`bspv ${vc}`}>{verdict}</span></div>
          <div className="bsp"><span className="bspk">Score</span><span className="bspv">{score} / 100</span></div>
          <div className="bsp"><span className="bspk">Gate</span><span className="bspv">{verdict === "GO" ? "Open" : "Locked"}</span></div>
          <div className="bsp"><span className="bspk">Confidence</span><span className="bspv">{Math.round(confidence * 100)}%</span></div>
          <div className="bsp"><span className="bspk">Sightings</span><span className="bspv">{signals.length}</span></div>
          <div className="bsp"><span className="bspk">Processed</span><span className="bspv">{date}</span></div>
        </div>
      </div>
      {/* hidden sentinel for animation arm */}
      <span style={{ display: "none" }} data-armed={armed} />
    </div>
  );
}

function ScoreCard({ verdict, score, confidence }: {
  verdict: string; score: number; confidence: number;
}) {
  const vc = verdictClass(verdict);
  const [filled, setFilled] = useState(false);
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setFilled(true), 600);

    let startTime: number | null = null;
    const duration = 1000;
    function step(ts: number) {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(eased * score));
      if (progress < 1) requestAnimationFrame(step);
    }
    const rafId = requestAnimationFrame(step);

    return () => { clearTimeout(t); cancelAnimationFrame(rafId); };
  }, [score]);

  return (
    <div className="vrd-score-card">
      <span className="vrd-sc-lbl">Overall score</span>
      <div className={`vrd-sc-num ${vc === "go" ? "fc-go" : vc === "pivot" ? "fc-pivot" : "fc-kill"}`} style={{ color: `var(--${vc === "pivot" ? "pivot" : vc === "kill" ? "kill" : "go"})`, fontVariantNumeric: "tabular-nums" }}>
        {displayScore} <span>/ 100</span>
      </div>
      <div className="vrd-sc-conf">Confidence {Math.round(confidence * 100)}%</div>
      <div className="vrd-rt">
        <div className="vrd-rt-lbls"><span>0</span><span>50</span><span>75</span><span>100</span></div>
        <div className="vrd-rt-bar">
          <div className="vrd-rt-fill" style={{ width: filled ? `${score}%` : "0%", background: "var(--vm)" }} />
          <div className="vrd-rt-thr" />
        </div>
      </div>
    </div>
  );
}

function DimsGrid({ dimensions }: { dimensions: Dimension[] }) {
  const [filled, setFilled] = useState(false);
  useEffect(() => { const t = setTimeout(() => setFilled(true), 700); return () => clearTimeout(t); }, []);

  return (
    <div className="vrd-dims">
      {dimensions.map((d) => {
        const cls = dimClass(d.score);
        const flag = dimFlag(d.score);
        return (
          <div key={d.name} className={`vrd-dc ${cls !== "go" ? cls : ""}`}>
            <div className="vrd-dc-h">
              <span className={`vrd-dc-n ${cls !== "go" ? cls : ""}`}>{d.name}</span>
              <span className="vrd-dc-wt">{Math.round(d.weight * 100)}%</span>
            </div>
            <div className={`vrd-dc-sc ${cls}`}>{d.score}</div>
            <div className="vrd-dc-bar">
              <div className={`vrd-dc-fill ${cls}`} style={{ width: filled ? `${d.score}%` : "0%", transition: "width .9s cubic-bezier(.2,0,.1,1) .7s" }} />
              <div className="vrd-dc-gl" />
            </div>
            <div className={`vrd-dc-flag ${cls}`}>{flag}</div>
          </div>
        );
      })}
    </div>
  );
}

function SightingsSection({ signals, bySource }: { signals: Signal[]; bySource: Record<string, Signal[]> }) {
  const [openSources, setOpenSources] = useState<Set<string>>(new Set());

  function toggle(src: string) {
    setOpenSources((prev) => {
      const next = new Set(prev);
      if (next.has(src)) next.delete(src); else next.add(src);
      return next;
    });
  }

  if (signals.length === 0) {
    return (
      <div className="vrd-si-section">
        <div className="bc-hd" style={{ marginBottom: 0 }}>
          <span>Evidence Wall</span><span className="r">0 sightings</span>
        </div>
        <div style={{ padding: "20px 22px", background: "var(--surface)", border: "1px solid var(--line)", borderTop: "none", fontSize: 13, color: "var(--dim)", fontStyle: "italic" }}>
          No market signals found. The verdict is based on general AI knowledge — not live data. Try refining your description.
        </div>
      </div>
    );
  }

  return (
    <div className="vrd-si-section">
      <div className="bc-hd">
        <span>Evidence Wall</span>
        <span className="r">{signals.length} sightings · {Object.keys(bySource).length} sources</span>
      </div>
      <div className="vrd-si-list">
        {Object.entries(bySource).map(([source, items]) => {
          const open = openSources.has(source);
          return (
            <div key={source} className="vrd-si-src">
              <button
                className="vrd-si-srchd"
                style={{ width: "100%", textAlign: "left", border: "none", cursor: "pointer", background: "none" }}
                onClick={() => toggle(source)}
              >
                <h4 style={SOURCE_BADGE[source] ? { color: SOURCE_BADGE[source] } : undefined}>
                  {SOURCE_NAME[source] ?? source}
                </h4>
                <span className="vrd-si-srcm">{items.length} signal{items.length !== 1 ? "s" : ""}</span>
                <span className="vrd-si-caret" style={{ transform: open ? "rotate(90deg)" : undefined }}>▶</span>
              </button>
              {open && items.map((sig) => (
                <a
                  key={sig.id}
                  href={sig.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="vrd-si-cite"
                  style={{ display: "grid", textDecoration: "none" }}
                >
                  <span className={`vrd-fl ${sentimentClass(sig.sentiment)}`}>{sentimentFlag(sig.sentiment)}</span>
                  <span className="vrd-si-title">{sig.title}</span>
                  <span className="vrd-si-src-lbl">↗</span>
                </a>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Executive Summary ────────────────────────────────────────────

function ExecSummary({
  decision,
  customers,
  competitors,
  simulation,
  launchKit,
  toolsRun,
}: {
  decision: Decision;
  customers: CustomerAnalysis | null;
  competitors: CompetitorAnalysis | null;
  simulation: Simulation | null;
  launchKit: LaunchKit | null;
  toolsRun: number;
}) {
  const vc = verdictClass(decision.verdict);
  const fmtNum = (n: number) =>
    n >= 1_000_000_000 ? `$${(n / 1_000_000_000).toFixed(1)}B`
    : n >= 1_000_000   ? `$${(n / 1_000_000).toFixed(0)}M`
    : `$${n.toLocaleString()}`;

  const bullets: string[] = [];

  if (customers) {
    const seg = customers.segments[0];
    const pos = customers.sentiment.positive;
    if (seg) bullets.push(`Primary segment: ${seg.name} — ${pos >= 60 ? "strong" : pos >= 40 ? "mixed" : "weak"} market reception (${pos}% positive)`);
  }

  if (competitors) {
    const n = competitors.competitors.length;
    const g = competitors.gaps.length;
    bullets.push(`Competitive landscape: ${n} known competitor${n !== 1 ? "s" : ""}${g > 0 ? `, ${g} exploitable gap${g !== 1 ? "s" : ""}` : " — crowded space"}`);
  }

  if (simulation) {
    const mod = simulation.scenarios.find((s) => s.name === "moderate");
    bullets.push(`Market size ${fmtNum(simulation.tamLow)}–${fmtNum(simulation.tamHigh)} TAM${mod ? ` · projected MRR $${mod.mrr12.toLocaleString()} at 12 months` : ""}`);
  }

  if (launchKit) {
    const pr = launchKit.pricingRecommendation;
    bullets.push(`Recommended pricing: ${pr.tier} at ${pr.currency} ${pr.priceMonthly}/month`);
  }

  const dims = decision.dimensions ?? [];
  const risks = dims.filter((d) => d.score < 50).map((d) => d.name);
  if (risks.length > 0) bullets.push(`Key risks: ${risks.join(", ")}`);

  return (
    <div className="exec-wrap">
      <div className="bc-hd">
        <span>Executive Brief</span>
        <span className="r">{toolsRun} / {STAGES.flatMap((s) => s.tools).length} tools run · {new Date(decision.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
      </div>
      <div className="exec-body">
        <div className="exec-verdict-row">
          <span className={`exec-badge ${vc}`}>{decision.verdict}</span>
          <span className="exec-score">{decision.score ?? "—"} / 100</span>
          <span className="exec-conf">· {Math.round(decision.confidence * 100)}% confidence</span>
        </div>
        <p className="exec-reasoning">{decision.reasoning}</p>
        {bullets.length > 0 && (
          <ul className="exec-bullets">
            {bullets.map((b, i) => <li key={i}>{b}</li>)}
          </ul>
        )}
      </div>
    </div>
  );
}

// ── SWOT section ────────────────────────────────────────────────

function SWOTSection({
  decision,
  customers,
  competitors,
}: {
  decision: Decision;
  customers: CustomerAnalysis | null;
  competitors: CompetitorAnalysis | null;
}) {
  if (!customers && !competitors) {
    return (
      <div className="swot-wrap">
        <div className="bc-hd"><span>SWOT Analysis</span><span className="r">needs data</span></div>
        <div className="swot-empty">
          Run <strong>ICP Analysis</strong> and <strong>Competitive Landscape</strong> to unlock the SWOT.
        </div>
      </div>
    );
  }

  const dims = decision.dimensions ?? [];

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const opportunities: string[] = [];
  const threats: string[] = [];

  // Strengths: strong dimensions + positive sentiment + gaps as advantages
  dims.filter((d) => d.score >= 75).forEach((d) => strengths.push(`${d.name} — score ${d.score}/100`));
  if (customers && customers.sentiment.positive >= 60) {
    strengths.push(`Strong market reception — ${customers.sentiment.positive}% positive sentiment`);
  }
  if (competitors && competitors.gaps.length > 0) {
    strengths.push(`${competitors.gaps.length} identified market gap${competitors.gaps.length > 1 ? "s" : ""} to exploit`);
  }

  // Weaknesses: low dimensions + high negative sentiment
  dims.filter((d) => d.score < 50).forEach((d) => weaknesses.push(`${d.name} — score ${d.score}/100`));
  if (customers && customers.sentiment.negative >= 40) {
    weaknesses.push(`High negative sentiment in market (${customers.sentiment.negative}%)`);
  }
  if (competitors && competitors.competitors.length > 0 && competitors.gaps.length === 0) {
    weaknesses.push("No clear differentiation gaps identified vs. competitors");
  }
  if (weaknesses.length === 0) weaknesses.push("No major structural weaknesses detected");

  // Opportunities: gap opportunities + underserved segments + top pain points
  if (competitors) {
    competitors.gaps.slice(0, 3).forEach((g) => opportunities.push(g.opportunity));
  }
  if (customers) {
    const large = customers.segments.filter((s) => s.size === "large");
    large.slice(0, 1).forEach((s) => opportunities.push(`Large underserved segment: ${s.name}`));
    if (customers.painPoints.length > 0) {
      opportunities.push(`Top pain point unresolved: "${customers.painPoints[0]?.text ?? ""}"`);
    }
  }
  if (opportunities.length === 0) opportunities.push("Run tools to identify opportunities");

  // Threats: strong competitors + low score + market saturation
  if (competitors) {
    const topComp = competitors.competitors
      .sort((a, b) => (b.signals?.length ?? 0) - (a.signals?.length ?? 0))
      .slice(0, 2);
    topComp.forEach((c) => threats.push(`${c.name} — ${c.positioning.slice(0, 80)}${c.positioning.length > 80 ? "…" : ""}`));
    if (competitors.competitors.length >= 5) {
      threats.push(`Saturated market — ${competitors.competitors.length} known competitors`);
    }
  }
  if (decision.score != null && decision.score < 55) {
    threats.push(`Low overall score (${decision.score}/100) — market may be resistant`);
  }
  if (threats.length === 0) threats.push("No critical threats detected in current signals");

  const quadrants: Array<{ key: string; label: string; cls: string; items: string[] }> = [
    { key: "S", label: "Strengths",    cls: "go",    items: strengths },
    { key: "W", label: "Weaknesses",   cls: "kill",  items: weaknesses },
    { key: "O", label: "Opportunities",cls: "watch", items: opportunities },
    { key: "T", label: "Threats",      cls: "pivot", items: threats },
  ];

  return (
    <div className="swot-wrap">
      <div className="bc-hd">
        <span>SWOT Analysis</span>
        <span className="r">derived from signals · {new Date(decision.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
      </div>
      <div className="swot-grid">
        {quadrants.map((q) => (
          <div key={q.key} className={`swot-q swot-q-${q.cls}`}>
            <div className="swot-q-hd">
              <span className={`swot-q-letter ${q.cls}`}>{q.key}</span>
              <span className="swot-q-lbl">{q.label}</span>
            </div>
            <ul className="swot-q-list">
              {q.items.map((item, i) => (
                <li key={i} className="swot-q-item">{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Outcome section ─────────────────────────────────────────────

const OUTCOME_OPTIONS: Array<{ type: OutcomeType; label: string; icon: string }> = [
  { type: "built_worked", label: "Built it — worked",        icon: "✅" },
  { type: "built_failed", label: "Built it — failed",        icon: "❌" },
  { type: "not_built",    label: "Decided not to build",     icon: "⏸" },
];

function OutcomeSection({
  ideaId,
  initialOutcome,
  initialLostTo,
  competitorNames,
}: {
  ideaId: string;
  initialOutcome: OutcomeType | null;
  initialLostTo: string | null;
  competitorNames: string[];
}) {
  const [current, setCurrent]         = useState<OutcomeType | null>(initialOutcome);
  const [lostTo, setLostTo]           = useState<string>(initialLostTo ?? "");
  const [pendingFailure, setPending]  = useState(false);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState(false);
  const [editing, setEditing]         = useState(false);

  const showOptions = !current || editing;
  const active = OUTCOME_OPTIONS.find((o) => o.type === current);

  async function submit(type: OutcomeType, competitor: string) {
    const prev = current;
    setCurrent(type);
    setSaving(true);
    setError(false);
    setEditing(false);
    setPending(false);
    try {
      const token = await getAuthToken();
      const body: Record<string, unknown> = { outcomeType: type };
      if (type === "built_failed" && competitor) body.lostToCompetitor = competitor;
      const res = await fetch(`/api/v1/ideas/${ideaId}/outcome`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setCurrent(prev);
        setError(true);
      }
    } catch {
      setCurrent(prev);
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  function handleOptionClick(type: OutcomeType) {
    if (type === "built_failed" && competitorNames.length > 0) {
      setPending(true);
      setCurrent(type);
    } else {
      void submit(type, "");
    }
  }

  return (
    <div className="out-section">
      <div className="out-hd">
        <span className="out-eye">OUTCOME · CLOSE THE LOOP</span>
        {current && !editing && !pendingFailure && (
          <button className="out-edit" onClick={() => { setEditing(true); setPending(false); }}>Edit →</button>
        )}
      </div>

      {showOptions ? (
        <>
          <p className="out-q">What happened with this idea?</p>
          <div className="out-opts">
            {OUTCOME_OPTIONS.map((opt) => (
              <button
                key={opt.type}
                className={`out-opt${current === opt.type ? " selected" : ""}`}
                onClick={() => handleOptionClick(opt.type)}
                disabled={saving}
              >
                <span className="out-opt-icon">{opt.icon}</span>
                <span className="out-opt-lbl">{opt.label}</span>
              </button>
            ))}
          </div>
          {pendingFailure && (
            <div className="out-loser">
              <label className="out-loser-lbl" htmlFor="out-loser-sel">Which competitor did you lose to?</label>
              <div className="out-loser-row">
                <select
                  id="out-loser-sel"
                  className="finp out-loser-sel"
                  value={lostTo}
                  onChange={(e) => setLostTo(e.target.value)}
                >
                  <option value="">— Not sure / Unknown</option>
                  {competitorNames.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                <button
                  className="btn-p out-loser-save"
                  onClick={() => void submit("built_failed", lostTo)}
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          )}
          {error && <p className="out-err">Failed to save. Try again.</p>}
          {saving && !pendingFailure && <span className="out-saving">Saving…</span>}
        </>
      ) : (
        <div className="out-done">
          <span className="out-done-icon">{active?.icon}</span>
          <div>
            <div className="out-done-lbl">{active?.label}</div>
            {current === "built_failed" && lostTo && (
              <div className="out-done-loser">Lost to: <strong>{lostTo}</strong></div>
            )}
            <div className="out-done-sub">Reported · helps calibrate future verdicts</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────

export function VerdictPageClient({
  idea,
  initialDecision,
  initialSignals,
  initialSimulation,
  initialLanding,
  initialCustomers,
  initialBuild,
  initialCompetitors,
  initialLaunchKit,
  initialFeatures,
  initialBattlecard,
  initialMarketLandscape,
  initialInterviewGuide,
  initialTranscript,
  plan,
  ideaTitle,
  ideaCategory,
  existingOutcome,
  canReportOutcome,
}: Props) {
  const router = useRouter();
  const { openPlanModal } = useUpgradeModal();
  const [decision, setDecision] = useState<Decision | null>(initialDecision);
  const [signals, setSignals] = useState<Signal[]>(initialSignals);
  const [polls, setPolls] = useState(0);
  const [openTools, setOpenTools] = useState<Set<ToolKey>>(new Set());
  const [override, setOverride] = useState(false);
  const toolRefs = useRef<Partial<Record<ToolKey, HTMLDivElement | null>>>({});

  function toggleTool(toolKey: ToolKey) {
    setOpenTools((prev) => {
      const next = new Set(prev);
      if (next.has(toolKey)) next.delete(toolKey); else next.add(toolKey);
      return next;
    });
  }

  const polling = !decision && polls < MAX_POLLS;

  const fetchLatest = useCallback(async () => {
    const token = await getAuthToken();
    if (!token) return;
    const res = await fetch(`/api/v1/ideas/${idea.id}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return;
    const json = await res.json() as { data: { decision: Decision | null; signals?: Signal[] } };
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

  const isDone: Record<ToolKey, boolean> = {
    simulate:            !!initialSimulation,
    landing:             !!initialLanding,
    customers:           !!initialCustomers,
    build:               !!initialBuild,
    competitors:         !!initialCompetitors,
    "launch-kit":        !!initialLaunchKit,
    features:            !!initialFeatures,
    battlecard:          !!initialBattlecard,
    "market-landscape":  !!initialMarketLandscape,
    "interview-guide":   !!initialInterviewGuide,
    transcript:          !!initialTranscript,
  };

  const bySource = signals.reduce<Record<string, Signal[]>>((acc, s) => {
    (acc[s.source] ??= []).push(s);
    return acc;
  }, {});

  function jumpTo(toolKey: ToolKey) {
    setOpenTools((prev) => { const next = new Set(prev); next.add(toolKey); return next; });
    setTimeout(() => {
      toolRefs.current[toolKey]?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }

  function renderToolStrip(toolKey: ToolKey): React.ReactNode {
    const fmtNum = (n: number) =>
      n >= 1_000_000_000 ? `$${(n / 1_000_000_000).toFixed(1)}B`
      : n >= 1_000_000   ? `$${(n / 1_000_000).toFixed(0)}M`
      : `$${n.toLocaleString()}`;

    switch (toolKey) {
      case "customers": {
        if (!initialCustomers) return null;
        const seg = initialCustomers.segments[0];
        const pos = initialCustomers.sentiment.positive;
        const sentCls = pos >= 60 ? "go" : pos <= 30 ? "kill" : "watch";
        return (
          <>
            {seg && <span className="ts-pill">{seg.name}</span>}
            <span className="ts-sep">·</span>
            <span className={`ts-val ${sentCls}`}>{pos}% positive</span>
            <span className="ts-sep">·</span>
            <span className="ts-val">{initialCustomers.segments.length} segments · {initialCustomers.painPoints.length} pain points</span>
          </>
        );
      }
      case "competitors": {
        if (!initialCompetitors) return null;
        const gap = initialCompetitors.gaps[0];
        return (
          <>
            <span className="ts-val">{initialCompetitors.competitors.length} competitors</span>
            <span className="ts-sep">·</span>
            <span className="ts-val">{initialCompetitors.gaps.length} gap{initialCompetitors.gaps.length !== 1 ? "s" : ""} identified</span>
            {gap && <><span className="ts-sep">·</span><span className="ts-pill">{gap.title}</span></>}
          </>
        );
      }
      case "simulate": {
        if (!initialSimulation) return null;
        const mod = initialSimulation.scenarios.find((s) => s.name === "moderate");
        return (
          <>
            <span className="ts-val">TAM {fmtNum(initialSimulation.tamLow)}–{fmtNum(initialSimulation.tamHigh)}</span>
            {mod && <><span className="ts-sep">·</span><span className="ts-val go">MRR yr1 ${mod.mrr12.toLocaleString()}</span></>}
            <span className="ts-sep">·</span>
            <span className="ts-val">break-even {initialSimulation.breakEvenMonths}mo</span>
          </>
        );
      }
      case "build": {
        if (!initialBuild) return null;
        const bld = initialBuild.stack.filter((c) => c.decision === "build").length;
        const oss = initialBuild.stack.filter((c) => c.decision === "oss").length;
        const buy = initialBuild.stack.filter((c) => c.decision === "buy").length;
        const tier = initialBuild.confidenceTier;
        const tierCls = tier === "HIGH" ? "go" : tier === "LOW" ? "kill" : "watch";
        return (
          <>
            <span className="ts-val">{initialBuild.stack.length} components</span>
            <span className="ts-sep">·</span>
            <span className="ts-pill">Build {bld} · OSS {oss} · Buy {buy}</span>
            {tier && <><span className="ts-sep">·</span><span className={`ts-val ${tierCls}`}>{tier} confidence</span></>}
          </>
        );
      }
      case "landing": {
        if (!initialLanding) return null;
        return (
          <>
            <span className="ts-headline">&ldquo;{initialLanding.headline}&rdquo;</span>
            <span className="ts-sep">·</span>
            <span className="ts-pill">{initialLanding.ctaText}</span>
          </>
        );
      }
      case "launch-kit": {
        if (!initialLaunchKit) return null;
        const headA = initialLaunchKit.headlines.find((h) => h.variant === "A");
        const pr = initialLaunchKit.pricingRecommendation;
        return (
          <>
            {headA && <><span className="ts-headline">&ldquo;{headA.headline}&rdquo;</span><span className="ts-sep">·</span></>}
            <span className="ts-val">{pr.tier} · {pr.currency} {pr.priceMonthly}/mo</span>
          </>
        );
      }
      case "features": {
        if (!initialFeatures) return null;
        const yesCount = initialFeatures.features.filter((r) => r.idea === "yes").length;
        const partialCount = initialFeatures.features.filter((r) => r.idea === "partial").length;
        return (
          <>
            <span className="ts-val">{initialFeatures.features.length} features</span>
            <span className="ts-sep">·</span>
            <span className="ts-val go">{yesCount} covered</span>
            {partialCount > 0 && <><span className="ts-sep">·</span><span className="ts-val watch">{partialCount} partial</span></>}
            <span className="ts-sep">·</span>
            <span className="ts-val">{initialFeatures.competitorNames.length} competitors</span>
          </>
        );
      }
      case "battlecard": {
        if (!initialBattlecard) return null;
        return (
          <>
            <span className="ts-val">{initialBattlecard.entries.length} competitor{initialBattlecard.entries.length !== 1 ? "s" : ""}</span>
            <span className="ts-sep">·</span>
            <span className="ts-pill">{initialBattlecard.entries[0]?.competitorName}</span>
            <span className="ts-sep">+</span>
            <span className="ts-val">{initialBattlecard.entries.reduce((s, e) => s + e.ourAdvantages.length, 0)} advantages mapped</span>
          </>
        );
      }
      case "market-landscape": {
        if (!initialMarketLandscape) return null;
        const oppSeg = initialMarketLandscape.segments.filter((s) => s.situation === "opportunity").length;
        return (
          <>
            <span className="ts-val">{initialMarketLandscape.segments.length} segments</span>
            <span className="ts-sep">·</span>
            <span className="ts-val">{oppSeg} opportunity{oppSeg !== 1 ? "s" : ""}</span>
            <span className="ts-sep">·</span>
            <span className="ts-val">{initialMarketLandscape.uncoveredOpportunities.length} gaps</span>
          </>
        );
      }
      case "interview-guide": {
        if (!initialInterviewGuide) return null;
        return (
          <>
            <span className="ts-pill">{initialInterviewGuide.targetSegment}</span>
            <span className="ts-sep">·</span>
            <span className="ts-val">{initialInterviewGuide.questions.length} questions</span>
            <span className="ts-sep">·</span>
            <span className="ts-val">{initialInterviewGuide.hypotheses.length} hypotheses</span>
          </>
        );
      }
      case "transcript": {
        if (!initialTranscript) return null;
        const strengthCls = initialTranscript.signalStrength === "strong" ? "go" : initialTranscript.signalStrength === "moderate" ? "watch" : "kill";
        return (
          <>
            <span className={`ts-val ${strengthCls}`}>{initialTranscript.signalStrength} signal</span>
            <span className="ts-sep">·</span>
            <span className="ts-val go">{initialTranscript.confirmedHypotheses.length} confirmed</span>
            <span className="ts-sep">·</span>
            <span className="ts-val kill">{initialTranscript.rejectedHypotheses.length} rejected</span>
          </>
        );
      }
    }
  }

  function isToolLocked(toolKey: ToolKey): boolean {
    if (override) return false;
    const lock = PLAN_LOCK[toolKey];
    if (lock && !hasPlanAccess(plan, lock.requiredPlan)) return false; // plan lock shown inline
    // Verdict lock: KILL locks plan+launch tools (except competitors), PIVOT locks plan+launch
    if (decision?.verdict === "KILL" && toolKey !== "customers" && toolKey !== "competitors") return true;
    if (decision?.verdict === "PIVOT" && (toolKey === "simulate" || toolKey === "build" || toolKey === "landing" || toolKey === "launch-kit")) return true;
    return false;
  }

  function isPlanLocked(toolKey: ToolKey): boolean {
    if (override) return false;
    const lock = PLAN_LOCK[toolKey];
    return !!(lock && !hasPlanAccess(plan, lock.requiredPlan));
  }

  function renderToolBody(toolKey: ToolKey): React.ReactNode {
    if (isPlanLocked(toolKey)) {
      const lock = PLAN_LOCK[toolKey]!;
      return (
        <div className="vrd-plock">
          <div className="vrd-plock-tool">{TOOL_META[toolKey].label}</div>
          <div className="vrd-plock-title">Requires {lock.requiredLabel}</div>
          <div className="vrd-plock-desc">
            Upgrade to unlock this intelligence tool and get deeper signal from the data.
          </div>
          <div className="vrd-plock-badge">Requires {lock.requiredLabel}+</div>
          <div className="vrd-plock-plan">{lock.requiredLabel}</div>
          <div className="vrd-plock-acts">
            <button
              onClick={() => openPlanModal({
                planKey: lock.requiredPlan as 'founder' | 'team' | 'studio',
                planLabel: lock.requiredLabel,
                toolLabel: TOOL_META[toolKey].label,
              })}
              className="btn-p"
            >
              Upgrade →
            </button>
            <span className="vrd-plock-note">30-day money-back guarantee</span>
          </div>
        </div>
      );
    }

    if (isToolLocked(toolKey)) {
      const verdict = decision?.verdict ?? "KILL";
      const vc = verdict === "PIVOT" ? "pivot" : "kill";
      const reasons: Record<string, Record<ToolKey, string>> = {
        KILL: {
          customers:           "",
          competitors:         "",
          simulate:            "No point projecting revenue for an idea you won't build.",
          build:               "No point planning architecture for something that won't be built.",
          landing:             "No point writing copy for an idea you won't launch.",
          "launch-kit":        "No point building a launch kit for an idea you won't launch.",
          features:            "No point mapping features for an idea you won't build.",
          battlecard:          "No point generating sales scripts for an idea you won't build.",
          "market-landscape":  "No point mapping the market for an idea you won't pursue.",
          "interview-guide":   "No point preparing customer interviews for an idea you've killed.",
          transcript:          "No point analyzing transcripts for an idea you won't build.",
        },
        PIVOT: {
          customers:           "",
          competitors:         "",
          simulate:            "Don't model revenue for a direction you're about to change.",
          build:               "Your tech stack depends on what you're building. Lock the direction first.",
          landing:             "You'd be writing copy for an idea that needs to change.",
          "launch-kit":        "Generate the launch kit after you lock the new direction and get a GO.",
          features:            "Feature matrix depends on what you're building. Lock the direction first.",
          battlecard:          "Battlecard depends on what you're building. Lock the direction first.",
          "market-landscape":  "Landscape the market after you lock the new direction.",
          "interview-guide":   "",
          transcript:          "",
        },
      };
      const reason = reasons[verdict]?.[toolKey] ?? "";
      return (
        <div>
          <div className={`vrd-vlock-hd ${vc === "kill" ? "kill" : ""}`}>
            <span>{verdict} — Recommended lock</span>
            <span>{verdict === "PIVOT" ? "after pivot" : "unavailable"}</span>
          </div>
          <div className="vrd-vlock-bd">
            <div className="vrd-vlock-title">{TOOL_META[toolKey].label}</div>
            <div className="vrd-vlock-desc">{reason}</div>
            <div className="vrd-vlock-acts">
              <button className="btn-g" onClick={() => setOverride(true)}>
                Run anyway →
              </button>
              <span className="vrd-vlock-note">Override affects all locked tools</span>
            </div>
          </div>
        </div>
      );
    }

    switch (toolKey) {
      case "simulate":    return <SimulateClient    ideaId={idea.id} initialSimulation={initialSimulation} />;
      case "landing":     return <LandingClient     ideaId={idea.id} initialLanding={initialLanding} />;
      case "customers":   return <CustomersClient   ideaId={idea.id} initialAnalysis={initialCustomers} />;
      case "build":       return <BuildClient       ideaId={idea.id} initialAnalysis={initialBuild} />;
      case "competitors": return <CompetitorsClient ideaId={idea.id} initialAnalysis={initialCompetitors} />;
      case "launch-kit":  return <LaunchKitClient   ideaId={idea.id} initialKit={initialLaunchKit} />;
      case "features":           return <FeaturesClient          ideaId={idea.id} initialFeatures={initialFeatures} isLocked={false} />;
      case "battlecard":         return <BattlecardClient         ideaId={idea.id} initialBattlecard={initialBattlecard} />;
      case "market-landscape":   return <MarketLandscapeClient    ideaId={idea.id} initialLandscape={initialMarketLandscape} />;
      case "interview-guide":    return <InterviewGuideClient     ideaId={idea.id} initialGuide={initialInterviewGuide} />;
      case "transcript":         return <TranscriptClient          ideaId={idea.id} initialAnalysis={initialTranscript} />;
    }
  }

  // ── Analyzing state ─────────────────────────────────────────
  if (!decision) {
    return (
      <div className="vrd-analyzing">
        <span className="vrd-an-eye">PledgeOFF Survey Bureau · Processing</span>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div className="bc" style={{ display: "inline-block" }}>
            <div className="bc-hd">
              <span>Survey in progress</span>
            </div>
            <div className="bc-bd">
              <div className="fcs">
                <div className="fc fc-lg">·</div>
                <div className="fc fc-lg">·</div>
                <div className="fc-gap" />
                <div className="fc">·</div>
                <div className="fc">·</div>
              </div>
            </div>
          </div>
        </div>
        <span className="vrd-an-note">
          {polls >= MAX_POLLS
            ? <>Analysis taking longer than usual.{" "}<button onClick={() => window.location.reload()} style={{ textDecoration: "underline", color: "var(--go)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: "inherit" }}>Refresh →</button></>
            : "Scanning market signals…"}
        </span>
      </div>
    );
  }

  // ── Verdict state ────────────────────────────────────────────
  const vc = verdictClass(decision.verdict);
  const dims = decision.dimensions ?? [];
  const hasFullDims = dims.length === 4;

  return (
    <div data-verdict={vc} style={{ minHeight: "60vh" }}>
      {/* Context strip */}
      <div className="vrd-ctx">
        <div className="vrd-ctx-i">
          <span className="vrd-ctx-badge">● {decision.verdict} · {decision.score ?? "—"}</span>
          <div className="vrd-ctx-tools">
            {STAGES.flatMap((s) => s.tools).map((toolKey) => (
              <button
                key={toolKey}
                className={`vrd-ctx-t${isDone[toolKey] ? " done" : ""}`}
                onClick={() => jumpTo(toolKey)}
              >
                {TOOL_META[toolKey].label.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Page grid: sidebar + main */}
      <div className="vrd-page">
        {/* Sidebar (1440px+) */}
        <aside className="vrd-sidebar">
          <div className="vrd-sb-inner">
            <span className="vrd-sb-lbl">Current verdict</span>
            <span className="vrd-sb-verd">{decision.verdict}</span>
            <div className="vrd-sb-score">{decision.score ?? "—"}</div>
            <div className="vrd-sb-conf">Confidence {Math.round(decision.confidence * 100)}%</div>
            <div className="vrd-sb-hr" />
            {hasFullDims && dims.map((d) => {
              const dc = dimClass(d.score);
              return (
                <div key={d.name} className="vrd-sb-dim">
                  <div className="vrd-sb-dr">
                    <span className="vrd-sb-dn">{d.name}</span>
                    <span className={`vrd-sb-ds ${dc}`}>{d.score}</span>
                  </div>
                  <div className="vrd-sb-bar">
                    <div className={`vrd-sb-fill ${dc}`} style={{ width: `${d.score}%` }} />
                    <div className="vrd-sb-gl" />
                  </div>
                </div>
              );
            })}
            <div className="vrd-sb-hr" />
            <span className="vrd-sb-tlbl">Instruments</span>
            {STAGES.flatMap((s) => s.tools).map((toolKey) => {
              const locked = isPlanLocked(toolKey) || isToolLocked(toolKey);
              const done = isDone[toolKey];
              return (
                <div key={toolKey} className="vrd-sb-tr">
                  <div className={`vrd-sb-td ${done ? "run" : locked ? "lock" : "idle"}`} />
                  <button className="vrd-sb-tn" onClick={() => jumpTo(toolKey)}>
                    {TOOL_META[toolKey].label}
                  </button>
                </div>
              );
            })}
            <div className="vrd-sb-hr" />
            <div className="vrd-sb-acts">
              <button className="vrd-sb-btn" onClick={() => router.push(`/ideas/compare?a=${idea.id}`)}>Compare →</button>
              <button className="vrd-sb-btn" onClick={() => router.push(`/ideas/${idea.id}/report`)}>Export PDF</button>
            </div>
          </div>
        </aside>

        {/* Main column */}
        <main className="vrd-main">
          {/* Board card */}
          <BoardCard
            verdict={decision.verdict}
            score={decision.score ?? 0}
            confidence={decision.confidence}
            signals={signals}
            createdAt={decision.createdAt}
            category={ideaCategory}
          />

          {/* Verdict head */}
          <div className="vrd-vhead">
            <div>
              <span className="vrd-vh-eye">
                Field Report · {ideaTitle.slice(0, 60)} · {new Date(decision.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </span>
              <p className="vrd-vh-sum">{decision.reasoning}</p>
              <div className="vrd-vh-meta">
                <div><span className="vrd-vmk">Verdict</span><span className={`vrd-vmv a`}>{decision.verdict}</span></div>
                <div><span className="vrd-vmk">Score</span><span className="vrd-vmv">{decision.score ?? "—"} / 100</span></div>
                {ideaCategory && <div><span className="vrd-vmk">Category</span><span className="vrd-vmv">{ideaCategory}</span></div>}
              </div>
            </div>
            <ScoreCard
              verdict={decision.verdict}
              score={decision.score ?? 0}
              confidence={decision.confidence}
            />
          </div>

          {/* Dimensions */}
          {hasFullDims && <DimsGrid dimensions={dims} />}

          {/* Feedback */}
          <div style={{ marginTop: 28 }}>
            <FeedbackButtons ideaId={idea.id} decisionId={decision.id} />
          </div>

          {/* Executive Brief */}
          <ExecSummary
            decision={decision}
            customers={initialCustomers}
            competitors={initialCompetitors}
            simulation={initialSimulation}
            launchKit={initialLaunchKit}
            toolsRun={Object.values(isDone).filter(Boolean).length}
          />

          {/* Tools accordion */}
          <div className="vrd-tools">
            <div className="bc-hd" style={{ marginBottom: 16 }}>
              <span>Intelligence Suite</span>
              <span className="r">{STAGES.flatMap((s) => s.tools).filter((k) => isDone[k]).length} / {STAGES.flatMap((s) => s.tools).length} run</span>
            </div>

            {STAGES.map((stage) => (
              <div key={stage.key} className="vrd-stage">
                <div className="vrd-stage-lbl">{stage.key}</div>
                {stage.tools.map((toolKey) => {
                  const isOpen = openTools.has(toolKey);
                  const done = isDone[toolKey];
                  const planLocked = isPlanLocked(toolKey);
                  const verdLocked = isToolLocked(toolKey);
                  const locked = planLocked || verdLocked;
                  const meta = TOOL_META[toolKey];
                  const strip = done && !locked ? renderToolStrip(toolKey) : null;
                  return (
                    <div
                      key={toolKey}
                      className="vrd-tool"
                      ref={(el) => { toolRefs.current[toolKey] = el; }}
                    >
                      <button
                        className="vrd-tbtn"
                        onClick={() => toggleTool(toolKey)}
                      >
                        <span className="vrd-tbtn-stg">{meta.stage}</span>
                        <span className="vrd-tbtn-sep" />
                        <span className="vrd-tbtn-name">{meta.label}</span>
                        {!strip && <span className="vrd-tbtn-sum">{meta.desc}</span>}
                        <span className="vrd-tbtn-stat">
                          {done ? "✓ done" : locked ? "locked" : "idle"}
                        </span>
                        <span className={`vrd-tbtn-chev${!isOpen ? " closed" : ""}`}>▾</span>
                      </button>
                      {strip && (
                        <div className="vrd-tool-strip">
                          {strip}
                        </div>
                      )}
                      {isOpen && (
                        <div className="vrd-tbody">
                          {renderToolBody(toolKey)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

            {(decision.verdict === "PIVOT" || decision.verdict === "KILL") && !override && (
              <div style={{ paddingTop: 12 }}>
                <button
                  onClick={() => setOverride(true)}
                  className="vrd-ctx-t"
                  style={{ color: "var(--dim)", padding: 0 }}
                >
                  Ignore recommendations — run all tools →
                </button>
              </div>
            )}
          </div>

          {/* SWOT */}
          <SWOTSection
            decision={decision}
            customers={initialCustomers}
            competitors={initialCompetitors}
          />

          {/* Evidence wall */}
          <SightingsSection signals={signals} bySource={bySource} />

          {/* Outcome section */}
          {canReportOutcome && (
            <OutcomeSection
              ideaId={idea.id}
              initialOutcome={existingOutcome?.outcomeType ?? null}
              initialLostTo={existingOutcome?.lostToCompetitor ?? null}
              competitorNames={initialCompetitors?.competitors.map((c) => c.name) ?? []}
            />
          )}

          {/* Actions row */}
          <div style={{ marginTop: 36, paddingTop: 24, borderTop: "1px solid var(--line)", display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              className="btn-g"
              onClick={() => router.push(`/ideas/compare?a=${idea.id}`)}
            >
              Compare idea →
            </button>
            <button
              className="btn-g"
              onClick={() => router.push(`/ideas/new?from=${idea.id}`)}
            >
              Duplicate →
            </button>
            <button
              className="btn-g"
              onClick={() => router.push(`/ideas/${idea.id}/report`)}
            >
              Export PDF
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
