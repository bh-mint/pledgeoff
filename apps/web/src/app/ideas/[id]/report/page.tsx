import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth-server";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { container } from "@/lib/container";
import { PrintTrigger } from "./PrintTrigger";
import { ReportActions } from "./ReportActions";

export const metadata: Metadata = {
  title: "Validation Report — PledgeOFF",
  robots: { index: false, follow: false },
};

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ print?: string }>;
}

const VERDICT_COLOR: Record<string, string> = {
  GO: "#16a34a",
  PIVOT: "#d97706",
  KILL: "#dc2626",
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

export default async function ReportPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { print: autoPrint } = await searchParams;
  const user = await requireUser();

  const ideaResult = await container._repos.ideaRepo.findById(id);
  if (ideaResult.isErr() || !ideaResult.value) notFound();
  const idea = ideaResult.value;
  if (idea.userId !== user.id) notFound();

  const supabase = createServiceRoleClient();
  const [
    decisionResult,
    signalsResult,
    simulationResult,
    customersResult,
    buildResult,
    competitorsResult,
    profileResult,
  ] = await Promise.all([
    container._repos.decisionRepo.findByIdeaId(id),
    container._repos.signalRepo.findByIdeaId(id),
    container._repos.simulationRepo.findByIdeaId(id),
    container._repos.customerAnalysisRepo.findByIdeaId(id),
    container._repos.buildAnalysisRepo.findByIdeaId(id),
    container._repos.competitorAnalysisRepo.findByIdeaId(id),
    supabase.from("profiles").select("first_name, last_name, company_name").eq("id", user.id).single(),
  ]);

  const decision = decisionResult.isOk() ? decisionResult.value : null;
  const signals = signalsResult.isOk() ? signalsResult.value : [];
  const simulation = simulationResult.isOk() ? simulationResult.value : null;
  const customers = customersResult.isOk() ? customersResult.value : null;
  const build = buildResult.isOk() ? buildResult.value : null;
  const competitors = competitorsResult.isOk() ? competitorsResult.value : null;
  const profileData = profileResult.data as { first_name?: string | null; last_name?: string | null; company_name?: string | null } | null;
  const companyName = profileData?.company_name ?? null;

  const { title, description } = parseIdeaText(idea.text);
  const verdictColor = decision ? (VERDICT_COLOR[decision.verdict] ?? "#000") : "#000";
  const generatedAt = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  return (
    <>
      {autoPrint === "1" && <PrintTrigger />}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
        }
        @page { margin: 20mm 18mm; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #111; background: #fff; }
      `}</style>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 24px", background: "#fff", color: "#111" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32, paddingBottom: 20, borderBottom: "2px solid #e5e5e5" }}>
          <div>
            <div style={{ fontSize: 11, color: "#888", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>
              Validation Report
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em" }}>
              {companyName ?? "PledgeOFF"}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "#888" }}>Generated</div>
            <div style={{ fontSize: 13, color: "#555" }}>{generatedAt}</div>
            {companyName && (
              <div style={{ fontSize: 10, color: "#aaa", marginTop: 4 }}>Powered by PledgeOFF</div>
            )}
          </div>
        </div>

        {/* Idea */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, color: "#888", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
            Idea
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 8px" }}>{title}</h1>
          {description && (
            <p style={{ fontSize: 14, color: "#555", lineHeight: 1.6, margin: 0 }}>{description}</p>
          )}
        </div>

        {/* Verdict */}
        {decision && (
          <div style={{ marginBottom: 28, padding: "20px 24px", border: `2px solid ${verdictColor}`, borderRadius: 8, background: `${verdictColor}08` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
              <span style={{ fontSize: 28, fontWeight: 800, color: verdictColor, letterSpacing: "-0.03em" }}>
                {decision.verdict}
              </span>
              {decision.score !== undefined && (
                <span style={{ fontSize: 13, color: "#555" }}>
                  Score: <strong style={{ color: "#111" }}>{decision.score}/100</strong>
                </span>
              )}
              <span style={{ fontSize: 13, color: "#555" }}>
                Confidence: <strong style={{ color: "#111" }}>{Math.round(decision.confidence * 100)}%</strong>
              </span>
            </div>
            <p style={{ fontSize: 14, color: "#333", lineHeight: 1.65, margin: 0 }}>{decision.reasoning}</p>
          </div>
        )}

        {/* Dimensions */}
        {decision?.dimensions && decision.dimensions.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 11, color: "#888", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>
              Evaluation Dimensions
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {decision.dimensions.map((d) => (
                <div key={d.name} style={{ padding: "10px 14px", border: "1px solid #e5e5e5", borderRadius: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: "#333" }}>{d.name}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>{d.score}/100</span>
                  </div>
                  <div style={{ height: 4, background: "#eee", borderRadius: 2 }}>
                    <div style={{ height: 4, width: `${d.score}%`, background: d.score >= 60 ? "#16a34a" : d.score >= 40 ? "#d97706" : "#dc2626", borderRadius: 2 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Signals summary */}
        {signals.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 11, color: "#888", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>
              Market Signals · {signals.length}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              {(["reddit", "github", "hn", "devto", "brave"] as const).map((src) => {
                const count = signals.filter((s) => s.source === src).length;
                if (!count) return null;
                return (
                  <span key={src} style={{ fontSize: 11, padding: "3px 10px", border: "1px solid #e5e5e5", borderRadius: 4, color: "#555" }}>
                    {src} · {count}
                  </span>
                );
              })}
            </div>
            <div style={{ fontSize: 13, color: "#555" }}>
              Top signals:
            </div>
            <ul style={{ margin: "8px 0 0", padding: "0 0 0 18px" }}>
              {signals.slice(0, 5).map((s, i) => (
                <li key={i} style={{ fontSize: 13, color: "#333", lineHeight: 1.5, marginBottom: 4 }}>
                  {s.title ?? s.summary?.slice(0, 120)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Revenue simulation */}
        {simulation && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 11, color: "#888", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>
              Revenue Simulation
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "baseline", marginBottom: 12 }}>
              <span style={{ fontSize: 28, fontWeight: 700 }}>{formatCurrency(simulation.tamLow)}</span>
              <span style={{ color: "#888" }}>–</span>
              <span style={{ fontSize: 28, fontWeight: 700 }}>{formatCurrency(simulation.tamHigh)}</span>
              <span style={{ fontSize: 13, color: "#888" }}>TAM</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
              {simulation.scenarios.map((sc) => (
                <div key={sc.name} style={{ padding: "12px 14px", border: "1px solid #e5e5e5", borderRadius: 6 }}>
                  <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "#888", marginBottom: 6 }}>{sc.name}</div>
                  <div style={{ fontSize: 13, color: "#333", marginBottom: 4 }}>${sc.pricePerUser}/mo per user</div>
                  <div style={{ fontSize: 12, color: "#555" }}>12 mo: {formatCurrency(sc.mrr12)}/mo</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 13, color: "#555" }}>
              Break-even estimate: <strong style={{ color: "#111" }}>{simulation.breakEvenMonths} months</strong>
            </div>
          </div>
        )}

        {/* Customer segments */}
        {customers && customers.segments.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 11, color: "#888", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>
              Customer Segments
            </div>
            {customers.segments.map((seg, i) => (
              <div key={i} style={{ marginBottom: 8, padding: "10px 14px", border: "1px solid #e5e5e5", borderRadius: 6 }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{seg.name}</div>
                <div style={{ fontSize: 13, color: "#555" }}>{seg.description}</div>
              </div>
            ))}
            {customers.painPoints.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>Top pain points:</div>
                {customers.painPoints.slice(0, 3).map((p, i) => (
                  <div key={i} style={{ fontSize: 13, color: "#333", marginBottom: 4 }}>#{p.rank} — {p.text}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Competitors */}
        {competitors && competitors.competitors.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 11, color: "#888", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>
              Competitor Landscape
            </div>
            {competitors.competitors.map((c, i) => (
              <div key={i} style={{ marginBottom: 8, padding: "10px 14px", border: "1px solid #e5e5e5", borderRadius: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{c.name}</span>
                  {c.url && <span style={{ fontSize: 11, color: "#888" }}>{c.url.replace(/^https?:\/\//, "")}</span>}
                </div>
                <div style={{ fontSize: 13, color: "#555" }}>{c.positioning}</div>
              </div>
            ))}
          </div>
        )}

        {/* Engineering stack */}
        {build && build.stack.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 11, color: "#888", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>
              Recommended Tech Stack
            </div>
            {build.stack.map((comp, i) => (
              <div key={i} style={{ marginBottom: 8, padding: "10px 14px", border: "1px solid #e5e5e5", borderRadius: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{comp.name}</span>
                  <span style={{ fontSize: 11, textTransform: "uppercase", color: "#888" }}>{comp.decision}</span>
                </div>
                <div style={{ fontSize: 13, color: "#555" }}>{comp.rationale}</div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 40, paddingTop: 16, borderTop: "1px solid #e5e5e5", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#aaa" }}>
            {companyName ? `${companyName} · Powered by PledgeOFF` : "Generated by PledgeOFF · pledgeoff.com"}
          </span>
          <span style={{ fontSize: 11, color: "#aaa" }}>
            {idea.id.slice(0, 8)}
          </span>
        </div>

        <ReportActions />
      </div>
    </>
  );
}
