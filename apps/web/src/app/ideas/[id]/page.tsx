import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth-server";
import { container } from "@/lib/container";
import { Nav } from "@/components/Nav";
import { IdeaPageClient } from "./IdeaPageClient";
import { FooterMicro } from "@/components/FooterMicro";
import { formatDate } from "@/lib/mdx-utils";
import { ExportButtons } from "./ExportButtons";
import OttoChat from "@/components/OttoChat";
import { getUserPlan } from "@/server/billing/getUserPlan";
import { OutcomeButton } from "@/components/OutcomeButton";
import { ShareVerdictButton } from "@/components/ShareVerdictButton";
import { OutcomeBanner } from "@/components/OutcomeBanner";

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

  const [decisionResult, signalsResult, simulateResult, landingResult, customersResult, buildResult, competitorsResult, launchKitResult, outcomeResult, plan] = await Promise.all([
    container._repos.decisionRepo.findByIdeaId(id),
    container._repos.signalRepo.findByIdeaId(id),
    container._repos.simulationRepo.findByIdeaId(id),
    container._repos.landingPageRepo.findByIdeaId(id),
    container._repos.customerAnalysisRepo.findByIdeaId(id),
    container._repos.buildAnalysisRepo.findByIdeaId(id),
    container._repos.competitorAnalysisRepo.findByIdeaId(id),
    container._repos.launchKitRepo.findByIdeaId(id),
    container._repos.decisionOutcomeRepo.findByIdea(id),
    getUserPlan(user.id),
  ]);

  const decision = decisionResult.isOk() ? decisionResult.value : null;
  const signals = signalsResult.isOk() ? signalsResult.value : [];
  const initialSimulation = simulateResult.isOk() ? simulateResult.value : null;
  const initialLanding = landingResult.isOk() ? landingResult.value : null;
  const initialCustomers = customersResult.isOk() ? customersResult.value : null;
  const initialBuild = buildResult.isOk() ? buildResult.value : null;
  const initialCompetitors = competitorsResult.isOk() ? competitorsResult.value : null;
  const initialLaunchKit = launchKitResult.isOk() ? launchKitResult.value : null;
  const existingOutcome = outcomeResult.isOk() ? outcomeResult.value : null;

  const now = new Date();
  const daysOld = Math.floor((now.getTime() - new Date(idea.createdAt).getTime()) / (1000 * 60 * 60 * 24));
  const isOlderThan30Days = daysOld >= 30;
  const showOutcomeBanner = isOlderThan30Days && !existingOutcome;

  const { title, description, category } = parseIdeaText(idea.text);

  return (
    <div className="min-h-screen bg-(--canvas)">
      <Nav loggedIn={true} />
      {showOutcomeBanner && <OutcomeBanner ideaId={id} daysOld={daysOld} />}

      <div className="max-w-360 mx-auto px-4 sm:px-8 py-8 sm:py-12">
        {/* Back + Idea header — narrow */}
        <div className="max-w-180">
          <Link
            href="/dashboard"
            className="mono text-[11px] text-(--t3) hover:text-(--t2) transition-colors uppercase tracking-[0.08em] mb-8 inline-block"
          >
            ← Back to Dashboard
          </Link>

          <div className="mb-10 pb-10 border-b border-(--border)">
            <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <p className="mono text-[10px] text-(--t3) uppercase tracking-[0.12em]">
                Idea · {formatDate(idea.createdAt)}
              </p>
              {category && (
                <span
                  className="mono text-[9px] uppercase tracking-widest px-2 py-0.5 rounded"
                  style={{
                    color: "var(--accent)",
                    background: "color-mix(in srgb, var(--accent) 8%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)",
                  }}
                >
                  {category}
                </span>
              )}
            </div>
              <div className="flex items-center gap-2 flex-wrap">
                {decision && <ShareVerdictButton ideaId={id} />}
                {isOlderThan30Days && (
                  <OutcomeButton ideaId={id} initialOutcome={existingOutcome?.outcomeType ?? null} />
                )}
                <ExportButtons ideaId={id} plan={plan} />
              </div>
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
          initialSimulation={initialSimulation}
          initialLanding={initialLanding}
          initialCustomers={initialCustomers}
          initialBuild={initialBuild}
          initialCompetitors={initialCompetitors}
          initialLaunchKit={initialLaunchKit}
          plan={plan}
        />

        {decision && (
          <OttoChat
            userId={user.id}
            ideaId={idea.id}
            ideaText={idea.text}
            verdict={decision.verdict}
            reasoning={decision.reasoning}
            score={decision.score ?? 0}
          />
        )}
      </div>
      <FooterMicro />
    </div>
  );
}
