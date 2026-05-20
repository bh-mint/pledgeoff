import type { Metadata } from "next";
import Link from "next/link";
import { effectivePlan } from "@pledgeoff/core";
import { requireUser } from "@/lib/auth-server";
import { createSupabaseServiceClient } from "@/lib/supabase-server";
import { container } from "@/lib/container";
import { Nav } from "@/components/Nav";
import { SettingsClient } from "./SettingsClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Settings — PledgeOFF" },
  robots: { index: false, follow: false },
};

export default async function SettingsPage() {
  const user = await requireUser();
  const supabase = createSupabaseServiceClient();

  const [profileResult, ideasResult, subResult] = await Promise.all([
    supabase.from("profiles").select("first_name, last_name, username, company_name").eq("id", user.id).single(),
    container._repos.ideaRepo.findByUserId(user.id),
    container._repos.subscriptionRepo.findByUserId(user.id),
  ]);

  const ideas = ideasResult.isOk() ? ideasResult.value : [];
  const sub = subResult.isOk() ? subResult.value : null;
  const plan = sub ? effectivePlan(sub) : "free";
  const subscriptionStatus = sub?.status ?? null;
  const renewsAt = sub?.currentPeriodEnd ?? null;
  const stripeCustomerId = sub?.stripeCustomerId ?? null;
  const extraSeats = sub?.extraSeats ?? 0;

  // Fetch live Stripe state for billing section (cancel_at_period_end, interval)
  let cancelAtPeriodEnd = false;
  let billingInterval: 'monthly' | 'annual' = 'monthly';
  if (sub?.stripeSubscriptionId && container.stripeAdapter) {
    const liveResult = await container.stripeAdapter.getSubscription(sub.stripeSubscriptionId);
    if (liveResult.isOk()) {
      cancelAtPeriodEnd = liveResult.value.cancelAtPeriodEnd;
      billingInterval = liveResult.value.interval;
    }
  }

  const availablePlans = [
    {
      id: 'pro' as const,
      label: 'Pro',
      monthlyEur: 149,
      annualEquivalentEur: 119,
      annualTotalEur: 1428,
      monthlyPriceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID ?? '',
      annualPriceId: process.env.STRIPE_PRO_ANNUAL_PRICE_ID ?? '',
    },
    {
      id: 'pro_plus' as const,
      label: 'Pro+',
      monthlyEur: 249,
      annualEquivalentEur: 199,
      annualTotalEur: 2388,
      monthlyPriceId: process.env.STRIPE_PRO_PLUS_MONTHLY_PRICE_ID ?? '',
      annualPriceId: process.env.STRIPE_PRO_PLUS_ANNUAL_PRICE_ID ?? '',
    },
    {
      id: 'agency' as const,
      label: 'Agency',
      monthlyEur: 499,
      annualEquivalentEur: 399,
      annualTotalEur: 4788,
      monthlyPriceId: process.env.STRIPE_AGENCY_MONTHLY_PRICE_ID ?? '',
      annualPriceId: process.env.STRIPE_AGENCY_ANNUAL_PRICE_ID ?? '',
    },
  ];

  // Fetch audit log for Agency plan (service role bypasses RLS)
  type AuditRow = {
    id: string;
    action: string;
    resource_type: string;
    resource_id: string | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
  };
  let auditEntries: AuditRow[] = [];
  if (plan === 'agency') {
    const { data } = await supabase
      .from('audit_log')
      .select('id, action, resource_type, resource_id, metadata, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    auditEntries = (data ?? []) as AuditRow[];
  }

  const now = new Date();
  const ideasThisMonth = ideas.filter((idea) => {
    const d = new Date(idea.createdAt);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;

  return (
    <div className="min-h-screen" style={{ background: "var(--canvas)" }}>
      <Nav loggedIn={true} />

      <div className="max-w-[1100px] mx-auto px-4 sm:px-10 py-8 sm:py-12">
        <Link
          href="/dashboard"
          className="mono text-[11px] text-(--t3) hover:text-(--t2) transition-colors uppercase tracking-[0.08em] mb-8 inline-block"
        >
          ← Back to Dashboard
        </Link>

        <SettingsClient
          email={user.email ?? ""}
          firstName={(profileResult.data as { first_name?: string | null } | null)?.first_name ?? null}
          lastName={(profileResult.data as { last_name?: string | null } | null)?.last_name ?? null}
          username={(profileResult.data as { username?: string | null } | null)?.username ?? null}
          companyName={(profileResult.data as { company_name?: string | null } | null)?.company_name ?? null}
          plan={plan}
          subscriptionStatus={subscriptionStatus}
          ideasThisMonth={ideasThisMonth}
          renewsAt={renewsAt}
          stripeCustomerId={stripeCustomerId}
          extraSeats={extraSeats}
          cancelAtPeriodEnd={cancelAtPeriodEnd}
          billingInterval={billingInterval}
          availablePlans={availablePlans}
          auditEntries={auditEntries}
        />
      </div>
    </div>
  );
}
