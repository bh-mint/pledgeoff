import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth-server";
import { container } from "@/lib/container";
import { Nav } from "@/components/Nav";
import { FooterMicro } from "@/components/FooterMicro";
import { CompetitorsClient } from "./CompetitorsClient";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const result = await container._repos.ideaRepo.findById(id);
  const idea = result.isOk() ? result.value : null;
  return {
    title: idea ? `Competitor Intelligence · ${idea.text.slice(0, 50)}` : "Competitor Intelligence",
    robots: { index: false, follow: false },
  };
}

export default async function CompetitorsPage({ params }: Props) {
  const { id } = await params;
  const user = await requireUser();

  const ideaResult = await container._repos.ideaRepo.findById(id);
  if (ideaResult.isErr() || !ideaResult.value) notFound();

  const idea = ideaResult.value;
  if (idea.userId !== user.id) notFound();

  const [decisionResult, analysisResult] = await Promise.all([
    container._repos.decisionRepo.findByIdeaId(id),
    container._repos.competitorAnalysisRepo.findByIdeaId(id),
  ]);

  const decision = decisionResult.isOk() ? decisionResult.value : null;
  const analysis = analysisResult.isOk() ? analysisResult.value : null;

  return (
    <div className="min-h-screen bg-(--canvas)">
      <Nav loggedIn={true} />
      <div className="max-w-[720px] mx-auto px-4 sm:px-8 py-8 sm:py-12">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mono text-[11px] mb-8" style={{ color: "var(--t3)" }}>
          <Link href="/dashboard" className="hover:text-(--t2) transition-colors">Dashboard</Link>
          <span>→</span>
          <Link href={`/ideas/${id}`} className="hover:text-(--t2) transition-colors">
            {idea.text.slice(0, 40)}{idea.text.length > 40 ? "…" : ""}
          </Link>
          <span>→</span>
          <span style={{ color: "var(--t2)" }}>Competitors</span>
        </div>

        {/* Header */}
        <div className="mb-10 pb-8 border-b border-(--border)">
          <div className="mono text-[10px] uppercase tracking-[0.1em] mb-2" style={{ color: "var(--accent)" }}>
            06 · Competitors
          </div>
          <h1 className="display text-[28px] font-bold tracking-tight mb-3" style={{ color: "var(--t1)", letterSpacing: "-0.03em" }}>
            Competitor Intelligence
          </h1>
          <p className="text-[14px] leading-relaxed" style={{ color: "var(--t2)" }}>
            Who already exists in this space, how they position themselves, and where the gaps are — extracted from your market signals.
          </p>
          {decision && (
            <div className="mt-4 flex items-center gap-3">
              <span
                className="mono text-[10px] uppercase tracking-[0.08em] px-2 py-1 rounded"
                style={{
                  color: decision.verdict === "GO" ? "var(--validated)" : decision.verdict === "KILL" ? "var(--caution)" : "var(--accent)",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid var(--border)",
                }}
              >
                Verdict: {decision.verdict}
              </span>
              <span className="mono text-[10px]" style={{ color: "var(--t3)" }}>
                Confidence {Math.round(decision.confidence * 100)}%
              </span>
            </div>
          )}
        </div>

        <CompetitorsClient ideaId={id} initialAnalysis={analysis} />
      </div>
      <FooterMicro />
    </div>
  );
}
