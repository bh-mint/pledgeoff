import { requireUser } from "@/lib/auth-server";
import { AppNav } from "@/components/AppNav";
import { getUserPlan } from "@/server/billing/getUserPlan";
import { container } from "@/lib/container";
import { PLAN_LIMITS } from "@pledgeoff/core";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const initials = (user.email ?? "?")
    .split("@")[0]
    .slice(0, 2)
    .toUpperCase();

  const [plan, ideasResult] = await Promise.all([
    getUserPlan(user.id),
    container.ideaRepo.findByUserId(user.id),
  ]);

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
        planLimitRemaining={planLimitRemaining}
      />
      {children}
    </>
  );
}
