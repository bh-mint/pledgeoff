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
  let category: string | null = null;

  // Last part may be "Category: X"
  const last = parts[parts.length - 1]?.trim() ?? "";
  if (last.startsWith("Category:")) {
    category = last.replace("Category:", "").trim();
  }

  const descParts = category ? parts.slice(1, parts.length - 1) : parts.slice(1);
  const description = descParts.join("\n\n").trim();

  return { title, description, category };
}

export default async function IdeaPage({ params }: Props) {
  const { id } = await params;
  const user = await requireUser();

  const ideaResult = await container._repos.ideaRepo.findById(id);
  if (ideaResult.isErr() || !ideaResult.value) notFound();

  const idea = ideaResult.value;
  if (idea.userId !== user.id) notFound();

  const [decisionResult, signalsResult, simulateResult, landingResult, customersResult, buildResult, competitorsResult] = await Promise.all([
    container._repos.decisionRepo.findByIdeaId(id),
    container._repos.signalRepo.findByIdeaId(id),
    container._repos.simulationRepo.findByIdeaId(id),
    container._repos.landingPageRepo.findByIdeaId(id),
    container._repos.customerAnalysisRepo.findByIdeaId(id),
    container._repos.buildAnalysisRepo.findByIdeaId(id),
    container._repos.competitorAnalysisRepo.findByIdeaId(id),
  ]);

  const decision = decisionResult.isOk() ? decisionResult.value : null;
  const signals = signalsResult.isOk() ? signalsResult.value : [];
  const toolStatus = {
    simulate: !!(simulateResult.isOk() && simulateResult.value),
    landing: !!(landingResult.isOk() && landingResult.value),
    customers: !!(customersResult.isOk() && customersResult.value),
    build: !!(buildResult.isOk() && buildResult.value),
    competitors: !!(competitorsResult.isOk() && competitorsResult.value),
  };

  const { title, description, category } = parseIdeaText(idea.text);

  return (
    <div className="min-h-screen bg-(--canvas)">
      <Nav loggedIn={true} />

      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-8 sm:py-12">
        {/* Back + Idea header — narrow */}
        <div className="max-w-180">
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
                  className="mono text-[9px] uppercase tracking-widest px-2 py-0.5 rounded"
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
          toolStatus={toolStatus}
        />
      </div>
      <FooterMicro />
    </div>
  );
}
