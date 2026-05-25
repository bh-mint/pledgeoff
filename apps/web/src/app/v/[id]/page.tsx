import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { container } from "@/lib/container";
import { Logo } from "@/components/brand/Logo";
import { VerdictMark } from "@/components/brand/VerdictMark";
import { FooterMicro } from "@/components/FooterMicro";
import type { Decision } from "@pledgeoff/core";

interface Props {
  params: Promise<{ id: string }>;
}

const VERDICT_CONFIG = {
  GO:    { label: "GO",    color: "var(--validated)", desc: "Strong signal. Build it." },
  KILL:  { label: "KILL",  color: "var(--kill)",      desc: "Weak signal. Don't build it." },
  PIVOT: { label: "PIVOT", color: "var(--caution)",   desc: "Mixed signal. Change direction." },
} as const;

function computeScore(decision: Decision): number {
  if (decision.dimensions && decision.dimensions.length > 0) {
    return Math.round(decision.dimensions.reduce((s, d) => s + d.weight * d.score, 0));
  }
  return Math.round(decision.confidence * 100);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const [ideaResult, decisionResult] = await Promise.all([
    container._repos.ideaRepo.findById(id),
    container._repos.decisionRepo.findByIdeaId(id),
  ]);
  const idea = ideaResult.isOk() ? ideaResult.value : null;
  const decision = decisionResult.isOk() ? decisionResult.value : null;

  if (!idea || !decision) {
    return { title: "Validation — PledgeOFF" };
  }

  const score = computeScore(decision);
  const title = `${decision.verdict} · ${score}/100 — ${idea.text.slice(0, 60)}`;
  const description = `PledgeOFF verdict: ${decision.verdict}. Score: ${score}/100. ${decision.reasoning.slice(0, 120)}`;
  const ogImageUrl = `https://pledgeoff.com/api/og?type=verdict&verdict=${encodeURIComponent(decision.verdict)}&score=${score}&text=${encodeURIComponent(idea.text.slice(0, 80))}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      url: `https://pledgeoff.com/v/${id}`,
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
    alternates: { canonical: `https://pledgeoff.com/v/${id}` },
  };
}

export default async function SharePage({ params }: Props) {
  const { id } = await params;

  const [ideaResult, decisionResult] = await Promise.all([
    container._repos.ideaRepo.findById(id),
    container._repos.decisionRepo.findByIdeaId(id),
  ]);

  const idea = ideaResult.isOk() ? ideaResult.value : null;
  const decision = decisionResult.isOk() ? decisionResult.value : null;

  if (!idea || !decision) notFound();

  const cfg = VERDICT_CONFIG[decision.verdict];
  const score = computeScore(decision);
  const hasDimensions = decision.dimensions && decision.dimensions.length > 0;
  const valId = `val_${id.slice(0, 8)}`;

  const verdictDaysAgo = Math.floor(
    (new Date().getTime() - new Date(decision.createdAt).getTime()) / (1000 * 60 * 60 * 24),
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--canvas)" }}>
      {/* Top bar */}
      <div className="border-b px-4 sm:px-10 h-14 flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
        <Link href="/" className="flex items-center gap-2" style={{ color: "var(--t1)" }}>
          <Logo size={20} />
          <span className="display text-[14px] font-semibold tracking-tight">
            Pledge<span style={{ color: "var(--accent)" }}>OFF</span>
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="mono text-[10px]" style={{ color: "var(--t3)" }}>
            signal verdict · {valId}
          </span>
          <Link
            href="/login"
            className="mono text-[11px] px-3 h-10 rounded border flex items-center transition-colors hover:border-(--accent) hover:text-(--accent)"
            style={{ borderColor: "var(--border)", color: "var(--t2)" }}
          >
            Validate your idea →
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-[680px] mx-auto w-full px-4 sm:px-8 py-10 sm:py-16">
        {/* Idea */}
        <div className="mb-8 pb-8 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="mono text-[10px] uppercase tracking-[0.12em] mb-2" style={{ color: "var(--t3)" }}>
            Idea validated
          </div>
          <p className="text-[17px] font-medium leading-snug" style={{ color: "var(--t1)" }}>
            {idea.text.split("\n\n")[0]}
          </p>
        </div>

        {/* Verdict card */}
        <div
          className="rounded-md border overflow-hidden relative"
          style={{ borderColor: `${cfg.color}30`, background: "var(--surface)" }}
        >
          {/* Ambient glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse 60% 40% at 20% 50%, ${cfg.color}18 0%, transparent 70%)`,
            }}
          />

          <div className="relative p-8">
            {/* Score + verdict */}
            <div className="flex items-end gap-8 mb-8">
              <div
                className="display tnum font-semibold"
                style={{ fontSize: "clamp(80px, 12vw, 160px)", lineHeight: 0.85, color: cfg.color }}
                aria-label={`Score: ${score} out of 100`}
              >
                {score}
              </div>
              <div className="pb-2">
                <div className="flex items-center gap-3 mb-2">
                  <VerdictMark verdict={decision.verdict} size={36} />
                  <div className="display text-[26px] font-semibold" style={{ color: cfg.color }}>
                    {cfg.label}
                  </div>
                </div>
                <div className="text-[13px]" style={{ color: "var(--t3)" }}>{cfg.desc}</div>
                <div className="mono text-[10px] mt-2 uppercase tracking-[0.1em]" style={{ color: "var(--t3)" }}>
                  {hasDimensions ? `${decision.dimensions!.length} dimensions` : "confidence"} · {Math.round(decision.confidence * 100)}%
                </div>
                {decision.verdict === "GO" && (
                  <Link
                    href="/login?mode=signup"
                    className="mt-3 mono text-[11px] px-3 h-8 rounded border inline-flex items-center transition-colors hover:border-(--accent) hover:text-(--accent)"
                    style={{ borderColor: "var(--border)", color: "var(--t2)" }}
                  >
                    Validate your idea in 60s →
                  </Link>
                )}
              </div>
            </div>

            {/* Score bars */}
            {hasDimensions && (
              <div className="mb-6">
                <p className="mono text-[10px] uppercase tracking-[0.1em] mb-3" style={{ color: "var(--t3)" }}>
                  Score breakdown
                </p>
                <div>
                  {decision.dimensions!.map((d) => {
                    const dimColor = d.score >= 75 ? "var(--validated)" : d.score >= 50 ? "var(--caution)" : "var(--kill)";
                    return (
                      <div
                        key={d.name}
                        className="py-2 border-b"
                        style={{ borderColor: "var(--border)" }}
                        role="meter"
                        aria-valuenow={d.score}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={d.name}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="text-[12px]" style={{ color: "var(--t1)" }}>{d.name}</div>
                          <div className="flex items-center gap-2">
                            <span className="mono text-[9px]" style={{ color: "var(--t3)" }}>{Math.round(d.weight * 100)}%</span>
                            <span className="mono tnum text-[11px]" style={{ color: dimColor }}>{d.score}</span>
                          </div>
                        </div>
                        <div className="h-[3px] rounded-full" style={{ background: "var(--border)" }}>
                          <div className="h-[3px] rounded-full" style={{ width: `${d.score}%`, background: dimColor }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Reasoning */}
            <div>
              <p className="mono text-[10px] uppercase tracking-[0.1em] mb-3" style={{ color: "var(--t3)" }}>
                Reasoning
              </p>
              <p className="text-[14px] leading-relaxed" style={{ color: "var(--t2)" }}>
                {decision.reasoning}
              </p>
            </div>

            {verdictDaysAgo >= 7 && (
              <div
                className="mt-6 pt-5 border-t mono text-[11px]"
                style={{ borderColor: "var(--border)", color: "var(--t3)" }}
              >
                This verdict was generated {verdictDaysAgo} day{verdictDaysAgo !== 1 ? "s" : ""} ago. Signals may have changed.
              </div>
            )}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-10 pt-8 border-t text-center" style={{ borderColor: "var(--border)" }}>
          <p className="text-[14px] mb-4" style={{ color: "var(--t2)" }}>
            Validate your own startup idea — GO, KILL, or PIVOT in under 60 seconds.
          </p>
          <Link
            href="/login"
            className="display text-[14px] font-semibold px-6 h-11 rounded-md inline-flex items-center gap-2 transition-opacity hover:opacity-90"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
          >
            Start free →
          </Link>
          <p className="mt-3 mono text-[10px]" style={{ color: "var(--t3)" }}>
            Free · No credit card · 1 free validation / month
          </p>
        </div>
      </div>

      {/* Branding strip */}
      <div className="border-t py-4 flex items-center justify-center" style={{ borderColor: "var(--border)" }}>
        <Link
          href="/"
          className="mono text-[10px] transition-opacity hover:opacity-70"
          style={{ color: "var(--t3)" }}
        >
          Validated with PledgeOFF →
        </Link>
      </div>

      <FooterMicro />
    </div>
  );
}
