import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { container } from "@/lib/container";
import { createSupabaseServiceClient } from "@/lib/supabase-server";
import { PublicNav } from "@/components/PublicNav";
import type { Decision, Signal } from "@pledgeoff/core";

interface Props {
  params: Promise<{ id: string }>;
}

const SOURCE_GROUP: Record<string, string> = {
  hn: "Hacker News",
  devto: "Dev.to",
  github: "GitHub",
  brave: "Web",
  google: "Web",
  reddit: "Web",
  producthunt: "Product Hunt",
};

function computeScore(decision: Decision): number {
  if (decision.dimensions && decision.dimensions.length > 0) {
    return Math.round(decision.dimensions.reduce((s, d) => s + d.weight * d.score, 0));
  }
  return Math.round(decision.confidence * 100);
}

function verdictChars(verdict: string): string[] {
  return verdict.split("");
}

function verdictColorClass(verdict: string): string {
  if (verdict === "GO") return "go-c";
  if (verdict === "KILL") return "kll-c";
  return "piv-c";
}

function verdictChipClass(verdict: string): string {
  if (verdict === "GO") return "go";
  if (verdict === "KILL") return "kill";
  return "piv";
}

function sentimentClass(s: string): string {
  if (s === "positive") return "pos";
  if (s === "negative") return "neg";
  return "neu";
}

function sentimentLabel(s: string): string {
  if (s === "positive") return "Positive";
  if (s === "negative") return "Negative";
  return "Neutral";
}

function groupSignals(signals: Signal[]): Array<{ group: string; items: Signal[] }> {
  const order = ["Hacker News", "Dev.to", "GitHub", "Product Hunt", "Web"];
  const map = new Map<string, Signal[]>();
  for (const sig of signals) {
    const group = SOURCE_GROUP[sig.source] ?? "Web";
    if (!map.has(group)) map.set(group, []);
    map.get(group)!.push(sig);
  }
  return order
    .filter((g) => map.has(g))
    .map((g) => ({ group: g, items: map.get(g)! }));
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function ottoObservation(reasoning: string): string {
  const trimmed = reasoning.trim();
  if (trimmed.length <= 300) return trimmed;
  const cut = trimmed.slice(0, 300);
  const lastSpace = cut.lastIndexOf(" ");
  return cut.slice(0, lastSpace > 200 ? lastSpace : 300) + "…";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const [ideaResult, decisionResult] = await Promise.all([
    container.ideaRepo.findById(id),
    container.decisionRepo.findByIdeaId(id),
  ]);
  const idea = ideaResult.isOk() ? ideaResult.value : null;
  const decision = decisionResult.isOk() ? decisionResult.value : null;

  if (!idea || !decision) {
    return { title: "Field Report — PledgeOFF" };
  }

  const score = computeScore(decision);
  const ideaTitle = idea.text.split("\n\n")[0].slice(0, 60);
  const title = `${decision.verdict} · ${score}/100 — ${ideaTitle} — PledgeOFF`;
  const description = `PledgeOFF verdict: ${decision.verdict}. Score: ${score}/100. ${decision.reasoning.slice(0, 130)}`;
  const ogImageUrl = `https://pledgeoff.com/api/og?type=verdict&verdict=${encodeURIComponent(decision.verdict)}&score=${score}&text=${encodeURIComponent(idea.text.slice(0, 80))}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      url: `https://pledgeoff.com/v/${id}`,
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
    alternates: { canonical: `https://pledgeoff.com/v/${id}` },
    robots: { index: true, follow: true },
  };
}

export default async function PublicVerdictPage({ params }: Props) {
  const { id } = await params;

  const [ideaResult, decisionResult, signalsResult] = await Promise.all([
    container.ideaRepo.findById(id),
    container.decisionRepo.findByIdeaId(id),
    container.signalRepo.findByIdeaId(id),
  ]);

  const idea = ideaResult.isOk() ? ideaResult.value : null;
  const decision = decisionResult.isOk() ? decisionResult.value : null;

  if (!idea || !decision) notFound();

  const signals = signalsResult.isOk() ? signalsResult.value : [];

  const supabase = createSupabaseServiceClient();
  const { data: authorProfile } = await supabase
    .from("profiles")
    .select("username, first_name, last_name")
    .eq("id", idea.userId)
    .single();

  const authorUsername = authorProfile?.username ?? null;
  const authorHandle = authorUsername
    ? `@${authorUsername}`
    : authorProfile?.first_name ?? null;

  const score = computeScore(decision);
  const chars = verdictChars(decision.verdict);
  const colorClass = verdictColorClass(decision.verdict);
  const chipClass = verdictChipClass(decision.verdict);
  const hasDimensions = !!decision.dimensions?.length;
  const signalGroups = groupSignals(signals);
  const validatedDate = new Date(decision.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const TOOLS = [
    { name: "ICP Analysis",          stage: "Understand", lock: "Founder+", desc: "Customer segments, pain points ranked by signal frequency, and direct quotes from evidence." },
    { name: "Competitive Landscape", stage: "Understand", lock: "Founder+", desc: "Named competitors, positioning gaps, and market openings drawn from signal data." },
    { name: "Feature Analysis",      stage: "Intel",      lock: "Founder+", desc: "Feature-by-feature comparison matrix against every named competitor." },
    { name: "Battlecard",            stage: "Intel",      lock: "Team+",    desc: "Objection handling and talking points per competitor — advantages and weaknesses mapped." },
    { name: "Market Landscape",      stage: "Intel",      lock: "Founder+", desc: "Market segments, trends, and uncovered opportunities across the space." },
    { name: "Interview Guide",       stage: "Validate",   lock: "Founder+", desc: "Structured customer interview questions with hypotheses to test and red flags to watch." },
    { name: "Transcript Analyzer",   stage: "Validate",   lock: "Team+",    desc: "Paste an interview transcript — confirmed and rejected hypotheses, key quotes, signal strength." },
    { name: "Revenue Model",         stage: "Plan",       lock: "Founder+", desc: "TAM estimate with 3 revenue scenarios — conservative, moderate, optimistic — and break-even timeline." },
    { name: "Build Spec",            stage: "Plan",       lock: "Founder+", desc: "Stack recommendations with build / buy / OSS decisions, library options, and confidence tiers." },
    { name: "Page Brief",            stage: "Launch",     lock: "Founder+", desc: "Landing page headline, features list, and waitlist CTA copy — ready to paste into your builder." },
    { name: "GTM Brief",             stage: "Launch",     lock: "Team+",    desc: "Email sequence, A/B headline set, and pricing recommendation with anchoring rationale." },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <PublicNav />

      <div className="pub-pw" style={{ paddingTop: 44, paddingBottom: 80 }}>

        {/* Board card */}
        <div className="bc" style={{ marginBottom: 32 }}>
          <div className="bc-hd">
            <span>Field Report &middot; {id.slice(0, 8).toUpperCase()}</span>
            <span style={{ color: "rgba(243,239,226,0.35)" }}>PledgeOFF &middot; Bulletin</span>
          </div>
          <div className="bc-bd">
            <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
              {chars.map((ch, i) => (
                <div key={i} className={`fc fcl ${colorClass}`}>{ch}</div>
              ))}
            </div>
            <div className="bstats">
              <div className="bstat">
                <div className="bs-k">Score</div>
                <div className={`bs-v ${chipClass === "go" ? "go" : ""}`}>{score}</div>
              </div>
              <div className="bstat">
                <div className="bs-k">Confidence</div>
                <div className="bs-v">{Math.round(decision.confidence * 100)}%</div>
              </div>
              {signals.length > 0 && (
                <div className="bstat">
                  <div className="bs-k">Signals</div>
                  <div className="bs-v">{signals.length}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Idea */}
        <div style={{ marginBottom: 36 }}>
          <h1 style={{ fontFamily: "var(--font-bitter), serif", fontSize: "clamp(24px, 4vw, 38px)", fontWeight: 700, letterSpacing: "-0.025em", lineHeight: 1.15, color: "var(--ink)", marginBottom: 10 }}>
            {idea.text.split("\n\n")[0]}
          </h1>
          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "var(--font-chivo-mono), monospace", fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--faint)" }}>
              Validated {validatedDate}
            </span>
            {authorHandle && (
              <>
                <span style={{ width: 1, height: 10, background: "var(--line)", flexShrink: 0 }} />
                {authorUsername ? (
                  <Link
                    href={`/profile/${authorUsername}`}
                    style={{ fontFamily: "var(--font-chivo-mono), monospace", fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--dim)", textDecoration: "underline", textUnderlineOffset: 2 }}
                  >
                    {authorHandle}
                  </Link>
                ) : (
                  <span style={{ fontFamily: "var(--font-chivo-mono), monospace", fontSize: "10px", color: "var(--faint)" }}>
                    {authorHandle}
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Dimensions */}
        {hasDimensions && (
          <div className="sec" style={{ marginBottom: 20 }}>
            <div className="sec-hd">
              4 dimensions
              <span className="r">Weighted verdict</span>
            </div>
            <div className="sec-bd">
              {decision.dimensions!.map((d) => {
                const isWeak = d.score < 70;
                const isWeakest =
                  isWeak && d.score === Math.min(...decision.dimensions!.map((x) => x.score));
                return (
                  <div className="dim-r" key={d.name}>
                    <span className="dim-nm">
                      {d.name}
                      {isWeakest && (
                        <span style={{ color: "var(--pivot)", fontSize: 10, marginLeft: 4 }}>↓ weakest</span>
                      )}
                    </span>
                    <div className="dim-bar">
                      <div
                        className="dim-fill"
                        style={{
                          width: `${d.score}%`,
                          background: isWeak ? "var(--pivot)" : "var(--go)",
                        }}
                      />
                    </div>
                    <span className="dim-sc">{d.score}</span>
                    <span className="dim-wt">&times;{d.weight.toFixed(2)} = {(d.weight * d.score).toFixed(1)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Reasoning */}
        <div className="sec" style={{ marginBottom: 20 }}>
          <div className="sec-hd">
            Reasoning
            <span className="r">Cites signal sources</span>
          </div>
          <div className="sec-bd">
            <div style={{ borderTop: `2px solid var(--${chipClass === "go" ? "go" : chipClass === "kill" ? "kill" : "pivot"})`, paddingTop: 10, marginBottom: 14 }}>
              <span style={{ fontFamily: "var(--font-chivo-mono), monospace", fontSize: "9.5px", letterSpacing: "0.18em", textTransform: "uppercase", color: `var(--${chipClass === "go" ? "go" : chipClass === "kill" ? "kill" : "pivot"})`, fontWeight: 600 }}>
                {decision.verdict} &mdash; Score {score} &mdash; Confidence {Math.round(decision.confidence * 100)}%
              </span>
            </div>
            <p style={{ fontSize: "14.5px", color: "var(--dim)", lineHeight: 1.88 }}>
              {decision.reasoning}
            </p>
          </div>
        </div>

        {/* Evidence */}
        {signalGroups.length > 0 && (
          <div className="sec" style={{ marginBottom: 32 }}>
            <div className="sec-hd">
              Evidence
              <span className="r">{signals.length} signals &mdash; {signalGroups.map((g) => g.group).join(" · ")}</span>
            </div>
            <div className="sec-bd">
              {signalGroups.map(({ group, items }) => (
                <div className="sig-g" key={group}>
                  <div className="sig-g-hd">
                    <span>{group}</span>
                    <span className="sc">{items.length} signal{items.length !== 1 ? "s" : ""}</span>
                  </div>
                  {items.slice(0, 4).map((sig) => (
                    <div className="sig-itm" key={sig.id}>
                      <span className={`sig-sent ${sentimentClass(sig.sentiment)}`}>
                        {sentimentLabel(sig.sentiment)}
                      </span>
                      <div>
                        <div className="sig-ttl">
                          <a href={sig.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline", textUnderlineOffset: 3 }}>
                            {sig.title}
                          </a>
                        </div>
                        <div className="sig-meta">{extractDomain(sig.url)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Intelligence Tools */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: "var(--font-chivo-mono), monospace", fontSize: "10px", letterSpacing: "0.28em", textTransform: "uppercase", color: "var(--faint)", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{TOOLS.length} Intelligence Tools</span>
            <span style={{ color: "var(--go)" }}>Sign up to run these on your own ideas</span>
          </div>
          <div className="tools-grid">
            {TOOLS.map((tool) => (
              <div className="tc" key={tool.name}>
                <div className="tc-hd">
                  <span>{tool.name}</span>
                  <span className="stage">{tool.stage}</span>
                </div>
                <div className="tc-body">
                  <div className="tc-nm">{tool.name}</div>
                  <div className="tc-desc">{tool.desc}</div>
                  <div className="tc-skel">
                    <div className="sk" style={{ width: "80%" }} />
                    <div className="sk" style={{ width: "60%" }} />
                    <div className="sk" style={{ width: "72%" }} />
                  </div>
                </div>
                <div className="tc-foot">
                  <span className="tc-lock">{tool.lock}</span>
                  <Link href="/login?mode=signup" className="tc-cta">Sign up free &rarr;</Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Otto */}
        <div className="sec" style={{ marginBottom: 0 }}>
          <div className="sec-hd">
            Otto &middot; Decision co-pilot
            <span className="r">Proactive insight &mdash; always visible</span>
          </div>
          <div className="sec-bd">
            <div className="otto-insight">
              <div className="oi-label">Otto &middot; Field observation</div>
              <p className="oi-text">&ldquo;{ottoObservation(decision.reasoning)}&rdquo;</p>
            </div>
            <div className="otto-gate">
              <div className="og-left">
                <div className="og-prompt">Ask Otto anything about this idea&hellip;</div>
                <div className="og-dots">
                  <div className="og-dot" />
                  <div className="og-dot" />
                  <div className="og-dot" />
                </div>
              </div>
              <Link
                href="/login?mode=signup"
                style={{ fontFamily: "var(--font-chivo-mono), monospace", fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", padding: "9px 16px", background: "var(--ink)", color: "var(--bg)", display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", flexShrink: 0 }}
              >
                Sign up to ask Otto &rarr;
              </Link>
            </div>
          </div>
        </div>

      </div>

      {/* CTA band — full width */}
      <div className="cta-band">
        <div className="cta-inner">
          <span className="cta-eyebrow">PledgeOFF &middot; Decision intelligence for founders</span>
          <h2 className="cta-h">Validate your own idea.</h2>
          <p className="cta-sub">Real signals, traceable sources, a verdict in ~15 seconds. First validation free, no card required.</p>
          <div className="cta-btns">
            <Link href="/login?mode=signup&next=/ideas/new" className="btn-inv">Validate free &rarr;</Link>
            <Link href="/pricing" className="btn-inv-g">See what&rsquo;s included</Link>
          </div>
          <p className="cta-note">1 free validation per month &middot; No credit card &middot; No hype</p>
        </div>
      </div>
    </div>
  );
}
