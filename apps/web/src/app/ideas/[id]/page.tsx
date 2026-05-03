import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth-server";
import { container } from "@/lib/container";
import { Nav } from "@/components/Nav";
import { IdeaPageClient } from "./IdeaPageClient";
import { formatDate } from "@/lib/mdx-utils";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const result = await container._repos.ideaRepo.findById(id);
  const idea = result.isOk() ? result.value : null;
  if (!idea) return { title: "Idea not found" };

  return {
    title: `Verdict: ${idea.text.slice(0, 60)}…`,
    robots: { index: false, follow: false },
  };
}

export default async function IdeaPage({ params }: Props) {
  const { id } = await params;
  const user = await requireUser();

  const ideaResult = await container._repos.ideaRepo.findById(id);
  if (ideaResult.isErr() || !ideaResult.value) notFound();

  const idea = ideaResult.value;
  if (idea.userId !== user.id) notFound();

  const [decisionResult, signalsResult] = await Promise.all([
    container._repos.decisionRepo.findByIdeaId(id),
    container._repos.signalRepo.findByIdeaId(id),
  ]);

  const decision = decisionResult.isOk() ? decisionResult.value : null;
  const signals = signalsResult.isOk() ? signalsResult.value : [];

  return (
    <div className="min-h-screen bg-[var(--canvas)]">
      <Nav />

      <div className="max-w-[720px] mx-auto px-8 py-12">
        {/* Back */}
        <Link
          href="/dashboard"
          className="mono text-[11px] text-[var(--t3)] hover:text-[var(--t2)] transition-colors uppercase tracking-[0.08em] mb-8 inline-block"
        >
          ← Dashboard
        </Link>

        {/* Idea */}
        <div className="mb-10 pb-10 border-b border-[var(--border)]">
          <p className="mono text-[10px] text-[var(--t3)] uppercase tracking-[0.12em] mb-3">
            Idea · {formatDate(idea.createdAt)}
          </p>
          <p className="text-[18px] text-[var(--t1)] leading-relaxed">
            {idea.text}
          </p>
        </div>

        {/* Decision + Signals (client, polls if pending) */}
        <IdeaPageClient
          idea={idea}
          initialDecision={decision}
          initialSignals={signals}
        />
      </div>
    </div>
  );
}
