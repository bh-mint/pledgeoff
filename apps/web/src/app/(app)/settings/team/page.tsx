import type { Metadata } from "next";
import { requireUser } from "@/lib/auth-server";
import { getUserPlan } from "@/server/billing/getUserPlan";
import { container } from "@/lib/container";
import { effectivePlan } from "@pledgeoff/core";
import { TeamSection } from "../TeamSection";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Team — PledgeOFF" },
  robots: { index: false, follow: false },
};

export default async function TeamPage() {
  const user = await requireUser();
  const subResult = await container._unsafeRepos.subscriptionRepo.findByUserId(
    user.id,
  );
  const sub = subResult.isOk() ? subResult.value : null;
  const plan = sub ? effectivePlan(sub) : await getUserPlan(user.id);
  const subscriptionStatus = sub?.status ?? null;

  return (
    <div>
      <h1 className="display text-[28px] font-semibold tracking-tight text-(--t1) mb-1">
        Team
      </h1>
      <p className="text-[13px] mb-8" style={{ color: "var(--t2)" }}>
        Invite colleagues to validate ideas together.
        {plan === "free" &&
          " Upgrade to Founder for solo use, Team for 3 seats, Studio for 8."}
      </p>
      <TeamSection plan={plan} subscriptionStatus={subscriptionStatus} />
    </div>
  );
}
