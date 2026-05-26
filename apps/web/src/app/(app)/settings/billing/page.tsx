import type { Metadata } from "next";
import { requireUser } from "@/lib/auth-server";
import { getUserPlan } from "@/server/billing/getUserPlan";
import { createSupabaseServiceClient } from "@/lib/supabase-server";
import { container } from "@/lib/container";
import { effectivePlan } from "@pledgeoff/core";
import { BillingClient } from "./BillingClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Billing — PledgeOFF" },
  robots: { index: false, follow: false },
};

export default async function BillingPage() {
  const user = await requireUser();
  const supabase = createSupabaseServiceClient();

  const [ideasResult, subResult] = await Promise.all([
    container._repos.ideaRepo.findByUserId(user.id),
    container._repos.subscriptionRepo.findByUserId(user.id),
  ]);

  const ideas = ideasResult.isOk() ? ideasResult.value : [];
  const sub = subResult.isOk() ? subResult.value : null;
  const plan = sub ? effectivePlan(sub) : await getUserPlan(user.id);
  const subscriptionStatus = sub?.status ?? null;
  const renewsAt = sub?.currentPeriodEnd ?? null;
  const stripeCustomerId = sub?.stripeCustomerId ?? null;
  const extraSeats = sub?.extraSeats ?? 0;

  let cancelAtPeriodEnd = false;
  let billingInterval: "monthly" | "annual" = "monthly";
  if (sub?.stripeSubscriptionId && container.stripeAdapter) {
    const liveResult = await container.stripeAdapter.getSubscription(
      sub.stripeSubscriptionId,
    );
    if (liveResult.isOk()) {
      cancelAtPeriodEnd = liveResult.value.cancelAtPeriodEnd;
      billingInterval = liveResult.value.interval;
    }
  }

  const availablePlans = [
    {
      id: "founder" as const,
      label: "Founder",
      monthlyEur: 49,
      annualEquivalentEur: 39,
      annualTotalEur: 468,
      monthlyPriceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID ?? "",
      annualPriceId: process.env.STRIPE_PRO_ANNUAL_PRICE_ID ?? "",
    },
    {
      id: "team" as const,
      label: "Team",
      monthlyEur: 99,
      annualEquivalentEur: 79,
      annualTotalEur: 948,
      monthlyPriceId: process.env.STRIPE_PRO_PLUS_MONTHLY_PRICE_ID ?? "",
      annualPriceId: process.env.STRIPE_PRO_PLUS_ANNUAL_PRICE_ID ?? "",
    },
    {
      id: "studio" as const,
      label: "Studio",
      monthlyEur: 349,
      annualEquivalentEur: 279,
      annualTotalEur: 3348,
      monthlyPriceId: process.env.STRIPE_AGENCY_MONTHLY_PRICE_ID ?? "",
      annualPriceId: process.env.STRIPE_AGENCY_ANNUAL_PRICE_ID ?? "",
    },
  ];

  const now = new Date();
  const ideasThisMonth = ideas.filter((idea) => {
    const d = new Date(idea.createdAt);
    return (
      d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    );
  }).length;

  void stripeCustomerId;

  return (
    <BillingClient
      plan={plan}
      subscriptionStatus={subscriptionStatus}
      ideasThisMonth={ideasThisMonth}
      renewsAt={renewsAt}
      extraSeats={extraSeats}
      cancelAtPeriodEnd={cancelAtPeriodEnd}
      billingInterval={billingInterval}
      availablePlans={availablePlans}
    />
  );
}
