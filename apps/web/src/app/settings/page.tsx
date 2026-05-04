import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth-server";
import { createServiceClient } from "@/lib/supabase/server";
import { container } from "@/lib/container";
import { Nav } from "@/components/Nav";
import { SettingsClient } from "./SettingsClient";

export const metadata: Metadata = {
  title: "Settings — PledgeOFF",
  robots: { index: false, follow: false },
};

export default async function SettingsPage() {
  const user = await requireUser();
  const supabase = createServiceClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const ideasResult = await container._repos.ideaRepo.findByUserId(user.id);
  const ideas = ideasResult.isOk() ? ideasResult.value : [];

  const now = new Date();
  const ideasThisMonth = ideas.filter((idea) => {
    const d = new Date(idea.createdAt);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;

  return (
    <div className="min-h-screen" style={{ background: "var(--canvas)" }}>
      <Nav />

      <div className="max-w-[720px] mx-auto px-8 py-12">
        <Link
          href="/dashboard"
          className="mono text-[11px] text-[var(--t3)] hover:text-[var(--t2)] transition-colors uppercase tracking-[0.08em] mb-8 inline-block"
        >
          ← Back to Dashboard
        </Link>

        <div className="mb-8">
          <div className="mono text-[10px] uppercase tracking-[0.14em] text-[var(--t3)] mb-2">
            Account settings
          </div>
          <h1 className="display text-[28px] font-semibold tracking-tight text-[var(--t1)]">
            Settings
          </h1>
        </div>

        <SettingsClient
          email={user.email ?? ""}
          fullName={profile?.full_name ?? null}
          plan="free"
          ideasThisMonth={ideasThisMonth}
          ideasLimit={3}
        />
      </div>
    </div>
  );
}
