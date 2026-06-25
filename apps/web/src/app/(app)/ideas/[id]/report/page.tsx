import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth-server";
import { createSupabaseServiceClient } from "@/lib/supabase-server";
import { container } from "@/lib/container";
import { getUserPlan } from "@/server/billing/getUserPlan";
import { logger } from "@pledgeoff/observability";
import { PrintTrigger } from "./PrintTrigger";
import { ReportActions } from "./ReportActions";

export const metadata: Metadata = {
  title: { absolute: "Field Report — PledgeOFF" },
  robots: { index: false, follow: false },
};

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ print?: string }>;
}

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  founder: "Founder",
  team: "Team",
  studio: "Studio",
  enterprise: "Enterprise",
};

const SOURCE_LABEL: Record<string, string> = {
  hn: "HN",
  reddit: "Reddit",
  github: "GitHub",
  devto: "Dev.to",
  brave: "Web",
  google: "Web",
  producthunt: "Product Hunt",
};

function formatCurrency(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

function parseIdeaText(text: string): { title: string; description: string } {
  const parts = text.split("\n\n");
  const title = parts[0]?.trim() ?? text;
  const last = parts[parts.length - 1]?.trim() ?? "";
  const descParts = last.startsWith("Category:") ? parts.slice(1, -1) : parts.slice(1);
  return { title, description: descParts.join("\n\n").trim() };
}

function dimFlag(score: number): { label: string; cls: "go" | "watch" | "kill" } {
  if (score >= 75) return { label: `STRONG · +${score - 75} above threshold`, cls: "go" };
  if (score >= 60) return { label: `OPEN · +${score - 60} above threshold`, cls: "go" };
  if (score >= 50) return { label: `WATCH · ${score - 75} below threshold`, cls: "watch" };
  return { label: `WEAK · ${score - 75} below threshold`, cls: "kill" };
}

function dimScoreClass(score: number): "go" | "watch" | "kill" {
  return score >= 60 ? "go" : score >= 45 ? "watch" : "kill";
}

function toolStatus(
  hasData: boolean,
  planAllows: boolean,
): { dot: "run" | "idle" | "lock"; tag: "run" | "idle" | "lock"; label: string } {
  if (!planAllows) return { dot: "lock", tag: "lock", label: "Plan locked" };
  if (hasData) return { dot: "run", tag: "run", label: "Complete" };
  return { dot: "idle", tag: "idle", label: "Idle" };
}

export default async function ReportPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { print: autoPrint } = await searchParams;
  const user = await requireUser();

  const ideaResult = await container.ideaRepo.findById(id);
  if (ideaResult.isErr()) {
    logger.error(
      { traceId: "report", ideaId: id, error: String(ideaResult.error), outcome: "error" as const },
      "report: ideaRepo.findById failed",
    );
    throw new Error("Failed to load idea");
  }
  if (!ideaResult.value) notFound();
  const idea = ideaResult.value;
  if (idea.userId !== user.id) notFound();

  const supabase = createSupabaseServiceClient();

  const [
    decisionResult,
    signalsResult,
    simulationResult,
    customersResult,
    buildResult,
    competitorsResult,
    landingResult,
    launchKitResult,
    featuresResult,
    battlecardResult,
    marketLandscapeResult,
    profileResult,
    plan,
  ] = await Promise.all([
    container.decisionRepo.findByIdeaId(id),
    container.signalRepo.findByIdeaId(id),
    container.simulationRepo.findByIdeaId(id),
    container.customerAnalysisRepo.findByIdeaId(id),
    container.buildAnalysisRepo.findByIdeaId(id),
    container.competitorAnalysisRepo.findByIdeaId(id),
    container.landingPageRepo.findByIdeaId(id),
    container.launchKitRepo.findByIdeaId(id),
    container.featureAnalysisRepo.findByIdeaId(id),
    container.battlecardRepo.findByIdeaId(id),
    container.marketLandscapeRepo.findByIdeaId(id),
    supabase
      .from("profiles")
      .select("first_name, last_name, company_name")
      .eq("id", user.id)
      .single(),
    getUserPlan(user.id),
  ]);

  const decision = decisionResult.isOk() ? decisionResult.value : null;
  const signals = signalsResult.isOk() ? signalsResult.value : [];
  const simulation = simulationResult.isOk() ? simulationResult.value : null;
  const customers = customersResult.isOk() ? customersResult.value : null;
  const build = buildResult.isOk() ? buildResult.value : null;
  const competitors = competitorsResult.isOk() ? competitorsResult.value : null;
  const landing = landingResult.isOk() ? landingResult.value : null;
  const launchKit = launchKitResult.isOk() ? launchKitResult.value : null;
  const features = featuresResult.isOk() ? featuresResult.value : null;
  const battlecard = battlecardResult.isOk() ? battlecardResult.value : null;
  const marketLandscape = marketLandscapeResult.isOk() ? marketLandscapeResult.value : null;
  const profileData = profileResult.data as {
    first_name?: string | null;
    last_name?: string | null;
    company_name?: string | null;
  } | null;
  const companyName = profileData?.company_name ?? null;

  const { title, description } = parseIdeaText(idea.text);
  const ideaCategory = (() => {
    const parts = idea.text.split("\n\n");
    const last = parts[parts.length - 1]?.trim() ?? "";
    return last.startsWith("Category:") ? last.replace("Category:", "").trim() : null;
  })();

  const canExport = plan !== "free";
  const isWhiteLabel =
    (plan === "studio" || plan === "enterprise") && !!companyName;
  const showLock = !canExport;

  const caseRef = idea.id.slice(0, 8).toUpperCase();
  const generatedAt = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const planLabel = PLAN_LABELS[plan] ?? plan;

  const verdictV = decision?.verdict ?? "GO";
  const verdictCls = verdictV === "GO" ? "go" : verdictV === "PIVOT" ? "pivot" : "kill";
  const score = decision?.score ?? Math.round((decision?.confidence ?? 0) * 100);
  const confidence = Math.round((decision?.confidence ?? 0) * 100);

  // Tools section
  const founderPlus = plan !== "free";
  const teamPlus = plan === "team" || plan === "studio" || plan === "enterprise";

  type ToolEntry = {
    name: string;
    dot: "run" | "idle" | "lock";
    tag: "run" | "idle" | "lock";
    label: string;
    result: string;
  };

  const tools: ToolEntry[] = [
    (() => {
      const s = toolStatus(!!customers, true);
      return {
        name: "ICP Analysis",
        ...s,
        result: customers
          ? `${customers.segments.length} segments identified`
          : "Not yet run",
      };
    })(),
    (() => {
      const s = toolStatus(!!competitors, founderPlus);
      return {
        name: "Competitive",
        ...s,
        result:
          !founderPlus
            ? "Founder+ plan required to run this instrument"
            : competitors
              ? `${competitors.competitors.length} competitors mapped`
              : "Not yet run — competitive landscape analysis",
      };
    })(),
    (() => {
      const s = toolStatus(!!simulation, founderPlus);
      return {
        name: "Revenue Model",
        ...s,
        result:
          !founderPlus
            ? "Founder+ plan required to run this instrument"
            : simulation
              ? `TAM ${formatCurrency(simulation.tamLow)}–${formatCurrency(simulation.tamHigh)} · ${simulation.breakEvenMonths}mo break-even`
              : "Not yet run — TAM, pricing scenarios, break-even",
      };
    })(),
    (() => {
      const s = toolStatus(!!build, founderPlus);
      return {
        name: "Build Spec",
        ...s,
        result:
          !founderPlus
            ? "Founder+ plan required to run this instrument"
            : build
              ? `${build.stack.length} stack components · MVP scope defined`
              : "Not yet run — stack, MVP scope, delivery estimate",
      };
    })(),
    (() => {
      const s = toolStatus(!!landing, founderPlus);
      return {
        name: "Page Brief",
        ...s,
        result:
          !founderPlus
            ? "Founder+ plan required to run this instrument"
            : landing
              ? "Page brief generated — headline, value prop, CTA"
              : "Not yet run — headline, value prop, CTA from sightings",
      };
    })(),
    (() => {
      const s = toolStatus(!!launchKit, teamPlus);
      return {
        name: "GTM Brief",
        ...s,
        result:
          !teamPlus
            ? "Team+ plan required to run this instrument"
            : launchKit
              ? "GTM strategy generated — channels, messaging, launch sequence"
              : "Not yet run — GTM strategy, launch sequence",
      };
    })(),
    (() => {
      const s = toolStatus(!!features, founderPlus);
      return {
        name: "Feature Analysis",
        ...s,
        result:
          !founderPlus
            ? "Founder+ plan required to run this instrument"
            : features
              ? `${features.features.length} features mapped across competitors`
              : "Not yet run — feature coverage matrix vs competitors",
      };
    })(),
    (() => {
      const s = toolStatus(!!battlecard, teamPlus);
      return {
        name: "Battlecard",
        ...s,
        result:
          !teamPlus
            ? "Team+ plan required to run this instrument"
            : battlecard
              ? `${battlecard.entries.length} competitor battlecards generated`
              : "Not yet run — objection handling per competitor",
      };
    })(),
    (() => {
      const s = toolStatus(!!marketLandscape, founderPlus);
      return {
        name: "Market Landscape",
        ...s,
        result:
          !founderPlus
            ? "Founder+ plan required to run this instrument"
            : marketLandscape
              ? `${marketLandscape.segments.length} segments · ${marketLandscape.uncoveredOpportunities.length} uncovered opportunities`
              : "Not yet run — segments, trends, uncovered opportunities",
      };
    })(),
  ];

  // Signals: sort positive first, then neutral, then negative; cap at 6
  const sortedSignals = [...signals].sort((a, b) => {
    const order = { positive: 0, neutral: 1, negative: 2 };
    return (order[a.sentiment] ?? 1) - (order[b.sentiment] ?? 1);
  });
  const topSignals = sortedSignals.slice(0, 6);

  return (
    <>
      {autoPrint === "1" && <PrintTrigger />}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .rpt-stage { background: white !important; padding: 0 !important; }
          .rpt-bar { display: none !important; }
          .rpt-doc { padding: 0 !important; max-width: 100% !important; }
          .rpt-doc-inner { border: none !important; box-shadow: none !important; }
          .doc-lock-overlay { display: none !important; }
          body { background: white !important; }
        }
        @page { margin: 16mm 14mm; }
      `}</style>

      <div className="rpt-stage">
        {/* Action bar */}
        <div className="rpt-bar no-print">
          <div>
            <span className="rpt-bar-eye">Intelligence Report · In-app preview</span>
            <span className="rpt-bar-title">{title.slice(0, 60)}</span>
          </div>
          <div className="rpt-bar-right">
            <span className={`rpt-plan-badge${canExport ? " active" : ""}`}>{planLabel} plan</span>
            <ReportActions canExport={canExport} />
          </div>
        </div>

        {/* Back link */}
        <div className="rpt-bar no-print" style={{ paddingTop: 0, marginTop: -8, marginBottom: 8 }}>
          <Link
            href={`/ideas/${idea.id}`}
            style={{
              fontFamily: "var(--font-chivo-mono), monospace",
              fontSize: 9,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--faint)",
              textDecoration: "none",
            }}
          >
            ← Back to verdict
          </Link>
        </div>

        {/* Document */}
        <div className="rpt-doc">
          <div className="rpt-doc-inner">
            {/* Document header */}
            <div className="doc-hd">
              <div className="dh-logo">
                {isWhiteLabel ? (
                  <>
                    <div className="dh-wl-box">
                      <span className="dh-wl-lbl">Team logo</span>
                    </div>
                    <div className="dh-wl-name">{companyName}</div>
                  </>
                ) : (
                  <>
                    <div className="dh-brand">
                      Pledge<em>OFF</em>
                    </div>
                    <div className="dh-tagline">Bulletin · Intelligence Platform</div>
                  </>
                )}
              </div>
              <div className="dh-right">
                <div className="dh-case">Field Report {caseRef}</div>
                <div className="dh-meta">
                  {ideaCategory ?? "Idea"} · Validated {generatedAt}
                </div>
                <div className="dh-conf">
                  CONFIDENTIAL{isWhiteLabel && companyName ? ` · ${companyName.toUpperCase()}` : ""}
                </div>
              </div>
            </div>

            {/* Verdict section */}
            {decision && (
              <div className="doc-verdict">
                <div className="dv-left">
                  <span className="dv-eye">Overall verdict</span>
                  <div className={`dv-score ${verdictCls}`}>
                    {score} <span>/ 100</span>
                  </div>
                  <div className={`dv-chip ${verdictCls}`}>● {verdictV}</div>
                </div>
                <div className="dv-right">
                  <div className="dv-idea-title">{title}</div>
                  <div className="dv-idea-meta">
                    {caseRef} · {ideaCategory ?? "Idea"} · {planLabel} plan
                  </div>
                  {description && (
                    <div className="dv-idea-desc">{description.slice(0, 300)}</div>
                  )}
                  <div className="dv-metas">
                    <div>
                      <span className="dv-mk">Verdict</span>
                      <span className={`dv-mv ${verdictCls}`}>{verdictV}</span>
                    </div>
                    <div>
                      <span className="dv-mk">Score</span>
                      <span className="dv-mv">{score} / 100</span>
                    </div>
                    <div>
                      <span className="dv-mk">Confidence</span>
                      <span className="dv-mv">{confidence}%</span>
                    </div>
                    <div>
                      <span className="dv-mk">Sightings</span>
                      <span className="dv-mv">{signals.length}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Lockable section */}
            <div className="doc-lockable">
              {/* Dimensions */}
              {decision?.dimensions && decision.dimensions.length > 0 && (
                <div className="doc-dims">
                  <span className="doc-sec-lbl">
                    Dimension analysis · Weighted verdict breakdown
                  </span>
                  <div className="rdims-grid">
                    {decision.dimensions.map((d) => {
                      const flag = dimFlag(d.score);
                      const sCls = dimScoreClass(d.score);
                      const isWatch = d.score < 60 && d.score >= 45;
                      return (
                        <div key={d.name} className={`rdim${isWatch ? " watch" : ""}`}>
                          <div className="rdim-h">
                            <span className={`rdim-n${isWatch ? " watch" : ""}`}>{d.name}</span>
                            <span className="rdim-wt">Wt {Math.round(d.weight * 100)}%</span>
                          </div>
                          <div className={`rdim-sc ${sCls === "go" ? "go" : isWatch ? "watch" : "kill"}`}>
                            {d.score}
                          </div>
                          <div className="rdim-bar">
                            <div
                              className={`rdim-fill ${sCls === "go" ? "go" : isWatch ? "watch" : "kill"}`}
                              style={{ width: `${d.score}%` }}
                            />
                            <div className="rdim-gl" />
                          </div>
                          <div className={`rdim-flag ${flag.cls}`}>{flag.label}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Reasoning */}
              {decision?.reasoning && (
                <div className="doc-reasoning">
                  <span className="doc-sec-lbl">Analyst reasoning · Otto, Chief Analyst</span>
                  <div className="doc-reasoning-text">
                    {decision.reasoning.split("\n\n").map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Evidence */}
              {topSignals.length > 0 && (
                <div className="doc-evidence">
                  <span className="doc-sec-lbl">
                    Key signals · {signals.length} sightings reviewed ·{" "}
                    {new Set(signals.map((s) => SOURCE_LABEL[s.source] ?? s.source)).size} sources
                  </span>
                  {topSignals.map((s, i) => (
                    <div key={i} className="ev-item">
                      <span
                        className={`ev-fl ${s.sentiment === "positive" ? "p" : s.sentiment === "negative" ? "n" : "u"}`}
                      >
                        {s.sentiment === "positive" ? "+" : s.sentiment === "negative" ? "–" : "·"}
                      </span>
                      <div>
                        <div className="ev-title">{s.title}</div>
                        {s.summary && <div className="ev-sum">{s.summary.slice(0, 120)}</div>}
                      </div>
                      <span className="ev-src">
                        {SOURCE_LABEL[s.source] ?? s.source}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Tools summary */}
              <div className="doc-tools">
                <span className="doc-sec-lbl">Intelligence instruments · Run status</span>
                {tools.map((t) => (
                  <div key={t.name} className="tool-sum-row">
                    <div className={`tsr-dot ${t.dot}`} />
                    <span className="tsr-name">{t.name}</span>
                    <span className="tsr-result">{t.result}</span>
                    <span className={`tsr-tag ${t.tag}`}>{t.label}</span>
                  </div>
                ))}
              </div>

              {/* Lock overlay (Free plan) */}
              {showLock && (
                <div className="doc-lock-overlay show">
                  <div className="lock-card">
                    <span className="lock-eye">Report export</span>
                    <div className="lock-title">Export requires Founder+</div>
                    <p className="lock-desc">
                      The full report — dimensions, reasoning, evidence, and tool results — is
                      visible in preview on all plans. Export to PDF requires Founder+ or above.
                    </p>
                    <div className="lock-hr" />
                    <div className="lock-plan">Founder+</div>
                    <div className="lock-sub">€49 / month · All instruments</div>
                    <Link className="lock-cta" href="/settings/billing">
                      Upgrade to Founder+ →
                    </Link>
                    <p className="lock-note">Cancel any time</p>
                  </div>
                </div>
              )}
            </div>

            {/* Document footer */}
            <div className="doc-footer">
              <span className="df-left">
                {isWhiteLabel && companyName
                  ? `Confidential · ${companyName} Intelligence Report · ${generatedAt}`
                  : `Generated by PledgeOFF Bulletin · ${planLabel} plan · ${generatedAt}`}
              </span>
              <span className="df-right">
                {caseRef} · pledgeoff.com
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
