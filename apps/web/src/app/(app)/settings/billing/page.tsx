import type { Metadata } from "next";
import { requireUser } from "@/lib/auth-server";
import { getUserPlan } from "@/server/billing/getUserPlan";
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
  const [ideasResult, subResult] = await Promise.all([
    container.ideaRepo.findByUserId(user.id),
    container.subscriptionRepo.findByUserId(user.id),
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
  let currentVatId: string | null = null;
  if (sub?.stripeSubscriptionId && container.stripeAdapter) {
    const [liveResult, vatResult] = await Promise.all([
      container.stripeAdapter.getSubscription(sub.stripeSubscriptionId),
      stripeCustomerId ? container.stripeAdapter.getCustomerVatId(stripeCustomerId) : Promise.resolve(null),
    ]);
    if (liveResult.isOk()) {
      cancelAtPeriodEnd = liveResult.value.cancelAtPeriodEnd;
      billingInterval = liveResult.value.interval;
    }
    if (vatResult && vatResult.isOk()) {
      currentVatId = vatResult.value?.value ?? null;
    }
  }

  const availablePlans = [
    {
      id: "founder" as const,
      label: "Founder",
      monthlyEur: 49,
      annualEquivalentEur: 39,
      annualTotalEur: 468,
      monthlyPriceId: process.env.STRIPE_FOUNDER_MONTHLY_PRICE_ID ?? "",
      annualPriceId: process.env.STRIPE_FOUNDER_ANNUAL_PRICE_ID ?? "",
    },
    {
      id: "team" as const,
      label: "Team",
      monthlyEur: 99,
      annualEquivalentEur: 79,
      annualTotalEur: 948,
      monthlyPriceId: process.env.STRIPE_TEAM_MONTHLY_PRICE_ID ?? "",
      annualPriceId: process.env.STRIPE_TEAM_ANNUAL_PRICE_ID ?? "",
    },
    {
      id: "studio" as const,
      label: "Studio",
      monthlyEur: 349,
      annualEquivalentEur: 279,
      annualTotalEur: 3348,
      monthlyPriceId: process.env.STRIPE_STUDIO_MONTHLY_PRICE_ID ?? "",
      annualPriceId: process.env.STRIPE_STUDIO_ANNUAL_PRICE_ID ?? "",
    },
  ];

  const now = new Date();
  const ideasThisMonth = ideas.filter((idea) => {
    const d = new Date(idea.createdAt);
    return (
      d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    );
  }).length;

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
      currentVatId={currentVatId}
      ottoPurchased={sub?.ottoPurchased ?? 0}
      verificationsPurchased={sub?.verificationsPurchased ?? 0}
      ottoUsedThisMonth={sub?.ottoIncludedUsed ?? 0}
    />
  );
}
