import type { Metadata } from "next";
import { requireUser } from "@/lib/auth-server";
import { container } from "@/lib/container";
import { PLAN_LIMITS, allowedSourcesForPlan } from "@pledgeoff/core";
import { getUserPlan } from "@/server/billing/getUserPlan";
import { NewIdeaClient } from "./NewIdeaClient";

export const metadata: Metadata = {
  title: { absolute: "Validate a new idea — PledgeOFF" },
  robots: { index: false, follow: false },
};

export default async function NewIdeaPage() {
  const user = await requireUser();

  const [ideasResult, plan, teamResult] = await Promise.all([
    container.ideaRepo.findByUserId(user.id),
    getUserPlan(user.id),
    container.teamRepo.findByMemberId(user.id),
  ]);

  const limit = PLAN_LIMITS[plan].verificationsPerMonth;

  const ideas = ideasResult.isOk() ? ideasResult.value : [];
  const now = new Date();
  const ideasThisMonth = ideas.filter((idea) => {
    const d = new Date(idea.createdAt);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;

  const validationsLeft = isFinite(limit) ? Math.max(0, limit - ideasThisMonth) : 999;

  const isPaidPlan = plan !== "free";
  const team = teamResult.isOk() ? teamResult.value : null;
  const teamId = isPaidPlan && team ? team.id : null;
  const teamName = isPaidPlan && team ? team.name : null;

  const allowed = allowedSourcesForPlan(plan);

  return (
    <NewIdeaClient
      validationsLeft={validationsLeft}
      teamId={teamId}
      teamName={teamName}
      allowedSources={allowed ? [...allowed] : null}
    />
  );
}
