import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth-server";
import { container } from "@/lib/container";
import { PLAN_LIMITS } from "@pledgeoff/core";
import { VerdictPageClient } from "./VerdictPageClient";
import { ExportButtons } from "./ExportButtons";
import { getUserPlan } from "@/server/billing/getUserPlan";
import { OutcomeButton } from "@/components/OutcomeButton";
import { ShareVerdictButton } from "@/components/ShareVerdictButton";
import { OutcomeBanner } from "@/components/OutcomeBanner";
import { RevalidateButton } from "@/components/RevalidateButton";
import { createSupabaseServiceClient } from "@/lib/supabase-server";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const result = await container.ideaRepo.findById(id);
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

  // Parallel: idea + plan + team (plan needed for access check + gating; team for workspace access)
  const [ideaResult, plan, teamResult, allIdeasResult] = await Promise.all([
    container.ideaRepo.findById(id),
    getUserPlan(user.id),
    container.teamRepo.findByMemberId(user.id),
    container.ideaRepo.findByUserId(user.id),
  ]);

  if (ideaResult.isErr() || !ideaResult.value) notFound();
  const idea = ideaResult.value;
  const isOwn = idea.userId === user.id;

  if (!isOwn) {
    // Allow team members on Team+ plans to view workspace ideas
    const isWorkspacePlan = plan === "team" || plan === "studio" || plan === "enterprise";
    const userTeam = teamResult.isOk() ? teamResult.value : null;
    if (!isWorkspacePlan || !userTeam) notFound();

    const membershipsResult = await container.teamRepo.findMembershipsByTeamId(userTeam.id);
    const memberships = membershipsResult.isOk() ? membershipsResult.value : [];
    const isSameTeam =
      idea.userId === userTeam.ownerId ||
      memberships.some((m) => m.userId === idea.userId && m.status === "active");
    if (!isSameTeam) notFound();
  }

  const [decisionResult, signalsResult, simulateResult, landingResult, customersResult, buildResult, competitorsResult, launchKitResult, outcomeResult] = await Promise.all([
    container.decisionRepo.findByIdeaId(id),
    container.signalRepo.findByIdeaId(id),
    container.simulationRepo.findByIdeaId(id),
    container.landingPageRepo.findByIdeaId(id),
    container.customerAnalysisRepo.findByIdeaId(id),
    container.buildAnalysisRepo.findByIdeaId(id),
    container.competitorAnalysisRepo.findByIdeaId(id),
    container.launchKitRepo.findByIdeaId(id),
    container.decisionOutcomeRepo.findByIdea(id),
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
  const showOutcomeBanner = isOwn && isOlderThan30Days && !existingOutcome;

  // Signal age: oldest fetchedAt among current signals
  const oldestSignalFetchedAt = signals.length > 0
    ? signals.reduce((oldest, s) => s.fetchedAt < oldest ? s.fetchedAt : oldest, signals[0].fetchedAt)
    : null;
  const signalAgeDays = oldestSignalFetchedAt
    ? Math.floor((now.getTime() - new Date(oldestSignalFetchedAt).getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const showRevalidate = isOwn && decision && signalAgeDays !== null && signalAgeDays >= 7;

  const { title, category } = parseIdeaText(idea.text);

  // Validations left this month (for revalidation confirm modal)
  const allIdeas = allIdeasResult.isOk() ? allIdeasResult.value : [];
  const ideasThisMonth = allIdeas.filter((i) => {
    const d = new Date(i.createdAt);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;
  const validationLimit = PLAN_LIMITS[plan].verificationsPerMonth;
  const validationsLeft = isFinite(validationLimit) ? Math.max(0, validationLimit - ideasThisMonth) : 999;

  // Category average score — query other decisions platform-wide for same category
  let categoryAvg: number | null = null;
  if (category && decision?.score !== null && decision?.score !== undefined) {
    const svc = createSupabaseServiceClient();
    const { data } = await svc.rpc('avg_score_by_category', { category_name: category, exclude_idea_id: id })
      .maybeSingle<{ avg_score: number | null; count: number }>();
    if (data && data.count >= 3) {
      categoryAvg = data.avg_score !== null ? Math.round(data.avg_score) : null;
    }
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {showOutcomeBanner && <OutcomeBanner ideaId={id} daysOld={daysOld} />}

      {/* Page-level header bar: back + title + actions */}
      <div style={{ borderBottom: "1px solid var(--line)", background: "var(--surface)" }}>
        <div style={{ maxWidth: 1600, margin: "0 auto", padding: "10px 28px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <Link
            href="/dashboard"
            className="mono"
            style={{ fontSize: 10, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--faint)", textDecoration: "none", flexShrink: 0 }}
          >
            ← Dashboard
          </Link>
          <span style={{ color: "var(--line)" }}>|</span>
          <h1
            className="display"
            style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}
          >
            {title}
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
            {decision && <ShareVerdictButton ideaId={id} />}
            {showRevalidate && (
              <RevalidateButton
                ideaId={id}
                signalAgedays={signalAgeDays!}
                validationsLeft={validationsLeft}
                currentScore={decision?.score ?? null}
                currentVerdict={decision?.verdict ?? null}
              />
            )}
            {isOwn && isOlderThan30Days && (
              <OutcomeButton ideaId={id} initialOutcome={existingOutcome?.outcomeType ?? null} />
            )}
            <ExportButtons ideaId={id} plan={plan} />
          </div>
        </div>
      </div>

      <VerdictPageClient
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
        categoryAvg={categoryAvg}
        ideaTitle={title}
        ideaCategory={category}
        existingOutcome={existingOutcome}
        canReportOutcome={isOwn && !!decision}
      />

    </div>
  );
}
