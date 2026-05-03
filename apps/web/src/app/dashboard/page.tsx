import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth-server";
import { container } from "@/lib/container";
import { Nav } from "@/components/Nav";
import { formatDate } from "@/lib/mdx-utils";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

const VERDICT_COLORS = {
  GO:    "text-[var(--validated)] border-[var(--validated)]/30 bg-[var(--validated)]/10",
  KILL:  "text-[var(--kill)] border-[var(--kill)]/30 bg-[var(--kill)]/10",
  PIVOT: "text-[#F5A623] border-[#F5A623]/30 bg-[#F5A623]/10",
} as const;

export default async function DashboardPage() {
  const user = await requireUser();

  const ideasResult = await container._repos.ideaRepo.findByUserId(user.id);
  const ideas = ideasResult.isOk() ? ideasResult.value : [];

  const decisions = await Promise.all(
    ideas.map((idea) => container._repos.decisionRepo.findByIdeaId(idea.id))
  );

  const rows = ideas
    .map((idea, i) => ({
      idea,
      decision: decisions[i].isOk() ? decisions[i].value : null,
    }))
    .sort(
      (a, b) =>
        new Date(b.idea.createdAt).getTime() - new Date(a.idea.createdAt).getTime()
    );

  return (
    <div className="min-h-screen bg-[var(--canvas)]">
      <Nav />

      <div className="max-w-[860px] mx-auto px-8 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <p className="mono text-[10px] text-[var(--t3)] uppercase tracking-[0.12em] mb-1">
              Dashboard
            </p>
            <h1 className="display text-[28px] font-bold text-[var(--t1)]">
              Your ideas
            </h1>
          </div>
          <Link
            href="/ideas/new"
            className="display h-9 px-5 rounded-md bg-[var(--accent)] text-black text-[13px] font-semibold hover:opacity-90 transition-opacity leading-[36px]"
          >
            New idea →
          </Link>
        </div>

        {/* Empty state */}
        {rows.length === 0 && (
          <div className="border border-dashed border-[var(--border)] rounded-md p-16 flex flex-col items-center justify-center gap-4">
            <p className="text-[14px] text-[var(--t3)] text-center max-w-xs leading-relaxed">
              No ideas yet. Validate your first idea — it takes 15 seconds.
            </p>
            <Link
              href="/ideas/new"
              className="display h-9 px-5 rounded-md bg-[var(--accent)] text-black text-[13px] font-semibold hover:opacity-90 transition-opacity leading-[36px]"
            >
              Validate an idea →
            </Link>
          </div>
        )}

        {/* Ideas list */}
        {rows.length > 0 && (
          <div className="space-y-3">
            {rows.map(({ idea, decision }) => {
              const verdictCfg =
                decision ? VERDICT_COLORS[decision.verdict] : null;

              return (
                <Link
                  key={idea.id}
                  href={`/ideas/${idea.id}`}
                  className="group flex items-center justify-between gap-4 bg-[var(--surface)] border border-[var(--border)] rounded-md px-6 py-4 hover:border-[var(--t3)] transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] text-[var(--t1)] leading-snug truncate group-hover:text-[var(--accent)] transition-colors">
                      {idea.text}
                    </p>
                    <p className="mono text-[11px] text-[var(--t3)] mt-1 uppercase tracking-[0.06em]">
                      {formatDate(idea.createdAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    {decision ? (
                      <span
                        className={`mono text-[10px] font-semibold uppercase tracking-[0.1em] px-2.5 py-1 rounded border ${verdictCfg}`}
                      >
                        {decision.verdict}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 mono text-[10px] text-[var(--t3)] uppercase tracking-[0.1em]">
                        <span className="pulse-dot w-1.5 h-1.5 rounded-full bg-[var(--accent)] inline-block" />
                        Pending
                      </span>
                    )}
                    <span className="text-[var(--t3)] group-hover:text-[var(--accent)] transition-colors text-[13px]">
                      →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
