import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth-server";
import { container } from "@/lib/container";
import { Nav } from "@/components/Nav";
import { IdeaPageClient } from "./IdeaPageClient";
import { FooterMicro } from "@/components/FooterMicro";
import { formatDate } from "@/lib/mdx-utils";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const result = await container._repos.ideaRepo.findById(id);
  const idea = result.isOk() ? result.value : null;
  if (!idea) return { title: "Idea not found" };

  return {
    title: `Verdict: ${idea.text.slice(0, 60)}…`,
    robots: { index: false, follow: false },
  };
}

function parseIdeaText(text: string): { title: string; description: string; category: string | null } {
  const parts = text.split("\n\n");
  const title = parts[0]?.trim() ?? text;
  let description = parts[1]?.trim() ?? "";
  let category: string | null = null;

  // Last part may be "Category: X"
  const last = parts[parts.length - 1]?.trim() ?? "";
  if (last.startsWith("Category:")) {
    category = last.replace("Category:", "").trim();
    description = parts.slice(1, parts.length - 1).join("\n\n").trim();
  }

  return { title, description, category };
}

export default async function IdeaPage({ params }: Props) {
  const { id } = await params;
  const user = await requireUser();

  const ideaResult = await container._repos.ideaRepo.findById(id);
  if (ideaResult.isErr() || !ideaResult.value) notFound();

  const idea = ideaResult.value;
  if (idea.userId !== user.id) notFound();

  const [decisionResult, signalsResult, simulateResult, landingResult, customersResult, buildResult] = await Promise.all([
    container._repos.decisionRepo.findByIdeaId(id),
    container._repos.signalRepo.findByIdeaId(id),
    container._repos.simulationRepo.findByIdeaId(id),
    container._repos.landingPageRepo.findByIdeaId(id),
    container._repos.customerAnalysisRepo.findByIdeaId(id),
    container._repos.buildAnalysisRepo.findByIdeaId(id),
  ]);

  const decision = decisionResult.isOk() ? decisionResult.value : null;
  const signals = signalsResult.isOk() ? signalsResult.value : [];
  const toolStatus = {
    simulate: !!(simulateResult.isOk() && simulateResult.value),
    landing: !!(landingResult.isOk() && landingResult.value),
    customers: !!(customersResult.isOk() && customersResult.value),
    build: !!(buildResult.isOk() && buildResult.value),
  };

  const { title, description, category } = parseIdeaText(idea.text);

  return (
    <div className="min-h-screen bg-(--canvas)">
      <Nav loggedIn={true} />

      <div className="max-w-[1140px] mx-auto px-4 sm:px-8 py-8 sm:py-12">
        {/* Back + Idea header — narrow */}
        <div className="max-w-[720px]">
          <Link
            href="/dashboard"
            className="mono text-[11px] text-(--t3) hover:text-(--t2) transition-colors uppercase tracking-[0.08em] mb-8 inline-block"
          >
            ← Back to Dashboard
          </Link>

          <div className="mb-10 pb-10 border-b border-(--border)">
            <div className="flex items-center gap-3 mb-3">
              <p className="mono text-[10px] text-(--t3) uppercase tracking-[0.12em]">
                Idea · {formatDate(idea.createdAt)}
              </p>
              {category && (
                <span
                  className="mono text-[9px] uppercase tracking-[0.1em] px-2 py-0.5 rounded"
                  style={{
                    color: "var(--accent)",
                    background: "rgba(214,255,61,0.08)",
                    border: "1px solid rgba(214,255,61,0.2)",
                  }}
                >
                  {category}
                </span>
              )}
            </div>
            <h1 className="display text-[22px] font-semibold tracking-tight text-(--t1) leading-snug mb-3">
              {title}
            </h1>
            {description && (
              <p className="text-[14px] text-(--t2) leading-relaxed">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Decision + Signals — two-column */}
        <IdeaPageClient
          idea={idea}
          initialDecision={decision}
          initialSignals={signals}
        />

        {/* Intelligence Tools hub — narrow */}
        {decision && (
          <div className="max-w-[720px] mt-12 pt-10 border-t border-(--border)">
            <p className="mono text-[10px] text-(--t3) uppercase tracking-[0.12em] mb-5">
              Intelligence tools
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  num: "02",
                  label: "Simulate Revenue",
                  desc: "TAM estimate, 3 pricing scenarios, break-even point",
                  href: `/ideas/${id}/simulate`,
                  done: toolStatus.simulate,
                  available: decision.verdict === "GO",
                },
                {
                  num: "03",
                  label: "Landing Page",
                  desc: "AI-generated headline, features, and CTA copy",
                  href: `/ideas/${id}/landing`,
                  done: toolStatus.landing,
                  available: decision.verdict === "GO",
                },
                {
                  num: "04",
                  label: "Customer Intelligence",
                  desc: "Segments, pain points, sentiment, and real quotes",
                  href: `/ideas/${id}/customers`,
                  done: toolStatus.customers,
                  available: true,
                },
                {
                  num: "05",
                  label: "Engineering Stack",
                  desc: "Tech stack, libraries, and technical gaps from GitHub",
                  href: `/ideas/${id}/build`,
                  done: toolStatus.build,
                  available: decision.verdict === "GO",
                },
              ].map((tool) => (
                <div
                  key={tool.num}
                  className="rounded-md border p-4 flex items-start gap-4"
                  style={{ borderColor: "var(--border)", background: "var(--surface)" }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="mono text-[10px]" style={{ color: "var(--t3)" }}>
                        {tool.num}
                      </span>
                      <span
                        className="mono text-[9px] px-1.5 py-0.5 rounded"
                        style={{
                          background: tool.done ? "rgba(125,214,107,0.12)" : "rgba(255,255,255,0.04)",
                          color: tool.done ? "var(--validated)" : "var(--t3)",
                          border: `1px solid ${tool.done ? "rgba(125,214,107,0.3)" : "var(--border)"}`,
                        }}
                      >
                        {tool.done ? "✓ done" : "○ pending"}
                      </span>
                    </div>
                    <div className="text-[13px] font-medium mb-0.5" style={{ color: "var(--t1)" }}>
                      {tool.label}
                    </div>
                    <div className="text-[12px]" style={{ color: "var(--t2)" }}>
                      {tool.desc}
                    </div>
                  </div>
                  {tool.available ? (
                    <Link
                      href={tool.href}
                      className="mono text-[10px] px-3 py-1.5 rounded border shrink-0 transition-colors hover:border-(--accent) hover:text-(--accent)"
                      style={{ borderColor: "var(--border)", color: "var(--t2)" }}
                    >
                      {tool.done ? "View →" : "Run →"}
                    </Link>
                  ) : (
                    <span
                      className="mono text-[10px] px-3 py-1.5 rounded border shrink-0 opacity-40 cursor-not-allowed"
                      style={{ borderColor: "var(--border)", color: "var(--t3)" }}
                      title="Available for GO verdicts only"
                    >
                      GO only
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <FooterMicro />
    </div>
  );
}
