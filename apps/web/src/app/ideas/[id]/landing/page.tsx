import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth-server";
import { container } from "@/lib/container";
import { Nav } from "@/components/Nav";
import { FooterMicro } from "@/components/FooterMicro";
import { LandingClient } from "./LandingClient";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const result = await container._repos.ideaRepo.findById(id);
  const idea = result.isOk() ? result.value : null;
  return {
    title: idea ? `Landing Page Copy · ${idea.text.slice(0, 50)}` : "Landing Page Generator",
    robots: { index: false, follow: false },
  };
}

export default async function LandingPage({ params }: Props) {
  const { id } = await params;
  const user = await requireUser();

  const ideaResult = await container._repos.ideaRepo.findById(id);
  if (ideaResult.isErr() || !ideaResult.value) notFound();

  const idea = ideaResult.value;
  if (idea.userId !== user.id) notFound();

  const [decisionResult, landingResult] = await Promise.all([
    container._repos.decisionRepo.findByIdeaId(id),
    container._repos.landingPageRepo.findByIdeaId(id),
  ]);

  const decision = decisionResult.isOk() ? decisionResult.value : null;
  const landing = landingResult.isOk() ? landingResult.value : null;

  if (!decision || decision.verdict !== "GO") {
    return (
      <div className="min-h-screen bg-(--canvas)">
        <Nav loggedIn={true} />
        <div className="max-w-[720px] mx-auto px-4 sm:px-8 py-12">
          <Link href={`/ideas/${id}`} className="mono text-[11px] text-(--t3) hover:text-(--t2) transition-colors uppercase tracking-[0.08em] mb-8 inline-block">
            ← Back to idea
          </Link>
          <div className="rounded-md border p-8 text-center" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <div className="mono text-[11px] mb-2" style={{ color: "var(--t3)" }}>Landing page unavailable</div>
            <p className="text-[14px]" style={{ color: "var(--t2)" }}>
              {!decision
                ? "Your idea needs a verdict before you can generate landing page copy."
                : "Landing page generation is only available for GO verdicts."}
            </p>
          </div>
        </div>
        <FooterMicro />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-(--canvas)">
      <Nav loggedIn={true} />
      <div className="max-w-[720px] mx-auto px-4 sm:px-8 py-8 sm:py-12">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mono text-[11px] mb-8" style={{ color: "var(--t3)" }}>
          <Link href="/dashboard" className="hover:text-(--t2) transition-colors">Dashboard</Link>
          <span>→</span>
          <Link href={`/ideas/${id}`} className="hover:text-(--t2) transition-colors">
            {idea.text.slice(0, 40)}{idea.text.length > 40 ? "…" : ""}
          </Link>
          <span>→</span>
          <span style={{ color: "var(--t2)" }}>Landing Page</span>
        </div>

        {/* Header */}
        <div className="mb-10 pb-8 border-b border-(--border)">
          <div className="mono text-[10px] uppercase tracking-[0.1em] mb-2" style={{ color: "var(--accent)" }}>
            03 · Landing
          </div>
          <h1 className="display text-[28px] font-bold tracking-tight mb-3" style={{ color: "var(--t1)", letterSpacing: "-0.03em" }}>
            Landing Page Copy
          </h1>
          <p className="text-[14px] leading-relaxed" style={{ color: "var(--t2)" }}>
            Conversion-optimized headline, features, and CTA copy generated from your validated idea.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <span
              className="mono text-[10px] uppercase tracking-[0.08em] px-2 py-1 rounded"
              style={{
                color: "var(--validated)",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid var(--border)",
              }}
            >
              Verdict: GO
            </span>
            <span className="mono text-[10px]" style={{ color: "var(--t3)" }}>
              Confidence {Math.round(decision.confidence * 100)}%
            </span>
          </div>
        </div>

        <LandingClient ideaId={id} initialLanding={landing} />
      </div>
      <FooterMicro />
    </div>
  );
}
