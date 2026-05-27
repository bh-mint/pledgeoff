import { requireUser } from "@/lib/auth-server";
import { AppNav } from "@/components/AppNav";
import { getUserPlan } from "@/server/billing/getUserPlan";
import { container } from "@/lib/container";
import { PLAN_LIMITS } from "@pledgeoff/core";
import { createSupabaseServiceClient } from "@/lib/supabase-server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  const supabase = createSupabaseServiceClient();
  const [plan, ideasResult, profileResult] = await Promise.all([
    getUserPlan(user.id),
    container.ideaRepo.findByUserId(user.id),
    supabase
      .from("profiles")
      .select("first_name, last_name, avatar_url")
      .eq("id", user.id)
      .single(),
  ]);

  const profile = profileResult.data as {
    first_name?: string | null;
    last_name?: string | null;
    avatar_url?: string | null;
  } | null;

  const fullName = [profile?.first_name, profile?.last_name]
    .filter(Boolean)
    .join(" ");
  const initials = (fullName || (user.email ?? "?"))
    .split(/[\s@]/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");

  const limit = PLAN_LIMITS[plan].verificationsPerMonth;
  let planLimitRemaining: number | null = null;

  if (limit !== Infinity && ideasResult.isOk()) {
    const now = new Date();
    const ideasThisMonth = ideasResult.value.filter((idea) => {
      const d = new Date(idea.createdAt);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;
    const remaining = limit - ideasThisMonth;
    const threshold = limit <= 1 ? 0 : 3;
    if (remaining <= threshold) planLimitRemaining = Math.max(0, remaining);
  }

  return (
    <>
      <AppNav
        email={user.email ?? ""}
        initials={initials}
        avatarUrl={profile?.avatar_url ?? null}
        planLimitRemaining={planLimitRemaining}
      />
      {children}
    </>
  );
}
