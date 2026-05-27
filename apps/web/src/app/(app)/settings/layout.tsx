import Link from "next/link";
import { requireUser } from "@/lib/auth-server";
import { getUserPlan } from "@/server/billing/getUserPlan";
import { createSupabaseServiceClient } from "@/lib/supabase-server";
import { container } from "@/lib/container";
import { SettingsNav } from "./SettingsNav";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const supabase = createSupabaseServiceClient();

  const [plan, ideasResult] = await Promise.all([
    getUserPlan(user.id),
    container.ideaRepo.findByUserId(user.id),
  ]);

  const ideas = ideasResult.isOk() ? ideasResult.value : [];
  const now = new Date();
  const ideasThisMonthList = ideas.filter((idea) => {
    const d = new Date(idea.createdAt);
    return (
      d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    );
  });
  const ideasThisMonth = ideasThisMonthList.length;

  let goVerdictsThisMonth = 0;
  let outcomesReported = 0;
  const [decisionsResult, outcomesCountResult] = await Promise.all([
    ideasThisMonthList.length > 0
      ? supabase
          .from("decisions")
          .select("verdict")
          .in(
            "idea_id",
            ideasThisMonthList.map((i) => i.id),
          )
      : Promise.resolve({ data: [] as { verdict: string }[] }),
    supabase
      .from("decision_outcomes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);
  goVerdictsThisMonth = (decisionsResult.data ?? []).filter(
    (d) => d.verdict === "GO",
  ).length;
  outcomesReported =
    (outcomesCountResult as { count: number | null }).count ?? 0;

  return (
    <div className="min-h-screen" style={{ background: "var(--canvas)" }}>
      <div className="max-w-275 mx-auto px-4 sm:px-10 py-8 sm:py-12">
        <Link
          href="/dashboard"
          className="mono text-[11px] text-(--t3) hover:text-(--t2) transition-colors uppercase tracking-[0.08em] mb-8 inline-block"
        >
          ← Back to Dashboard
        </Link>

        <div className="grid grid-cols-12 gap-10 mt-6">
          <SettingsNav plan={plan} />

          <main className="col-span-12 md:col-span-9 max-w-170">
            {/* Usage strip */}
            <div
              className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 rounded-md border mb-6 mono text-[11px]"
              style={{
                borderColor: "var(--border)",
                background: "var(--surface)",
              }}
            >
              <span style={{ color: "var(--t3)" }}>This month:</span>
              <span style={{ color: "var(--t1)" }}>
                <span style={{ color: "var(--accent)" }}>{ideasThisMonth}</span>{" "}
                validation{ideasThisMonth !== 1 ? "s" : ""}
              </span>
              <span style={{ color: "var(--border)" }}>·</span>
              <span style={{ color: "var(--t1)" }}>
                <span style={{ color: "var(--validated)" }}>
                  {goVerdictsThisMonth}
                </span>{" "}
                GO verdict{goVerdictsThisMonth !== 1 ? "s" : ""}
              </span>
              <span style={{ color: "var(--border)" }}>·</span>
              <span style={{ color: "var(--t1)" }}>
                <span style={{ color: "var(--t2)" }}>{outcomesReported}</span>{" "}
                outcome{outcomesReported !== 1 ? "s" : ""} reported
              </span>
            </div>

            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
