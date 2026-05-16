import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth-server";
import { createServiceClient } from "@/lib/supabase/server";
import { container } from "@/lib/container";
import { effectivePlan } from "@pledgeoff/core";
import { Nav } from "@/components/Nav";
import { SettingsClient } from "./SettingsClient";

export const metadata: Metadata = {
  title: "Settings — PledgeOFF",
  robots: { index: false, follow: false },
};

export default async function SettingsPage() {
  const user = await requireUser();
  const supabase = createServiceClient();

  const [profileResult, ideasResult, subResult] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
    container._repos.ideaRepo.findByUserId(user.id),
    container._repos.subscriptionRepo.findByUserId(user.id),
  ]);

  const ideas = ideasResult.isOk() ? ideasResult.value : [];
  const sub = subResult.isOk() ? subResult.value : null;
  const plan = sub ? effectivePlan(sub) : "free";
  const renewsAt = sub?.currentPeriodEnd ?? null;
  const stripeCustomerId = sub?.stripeCustomerId ?? null;

  const now = new Date();
  const ideasThisMonth = ideas.filter((idea) => {
    const d = new Date(idea.createdAt);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;

  return (
    <div className="min-h-screen" style={{ background: "var(--canvas)" }}>
      <Nav />

      <div className="max-w-180 mx-auto px-4 sm:px-8 py-8 sm:py-12">
        <Link
          href="/dashboard"
          className="mono text-[11px] text-(--t3) hover:text-(--t2) transition-colors uppercase tracking-[0.08em] mb-8 inline-block"
        >
          ← Back to Dashboard
        </Link>

        <div className="mb-8">
          <div className="mono text-[10px] uppercase tracking-[0.14em] text-(--t3) mb-2">
            Account settings
          </div>
          <h1 className="display text-[28px] font-semibold tracking-tight text-(--t1)">
            Settings
          </h1>
        </div>

        <SettingsClient
          email={user.email ?? ""}
          fullName={profileResult.data?.full_name ?? null}
          plan={plan}
          ideasThisMonth={ideasThisMonth}
          renewsAt={renewsAt}
          stripeCustomerId={stripeCustomerId}
        />
      </div>
    </div>
  );
}
