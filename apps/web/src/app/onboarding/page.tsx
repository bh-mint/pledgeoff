import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth-server";
import { Logo } from "@/components/brand/Logo";

export const metadata: Metadata = {
  title: { absolute: "Welcome to PledgeOFF" },
  robots: { index: false, follow: false },
};

const STEPS = [
  {
    num: "01",
    title: "Write your idea",
    desc: "One sentence. Who it's for, what it does. Be specific — vague briefs score poorly.",
    icon: "✍️",
  },
  {
    num: "02",
    title: "We fetch real signals",
    desc: "Reddit threads, GitHub repos, and community discussions — scraped in real time for your idea.",
    icon: "📡",
  },
  {
    num: "03",
    title: "You get a verdict",
    desc: "GO · KILL · PIVOT — with a score, reasoning, and traceable sources. In under 60 seconds.",
    icon: "⚡",
  },
  {
    num: "04",
    title: "Go deeper",
    desc: "Revenue simulation, landing page, customer segments, and engineering stack — all from the same signals.",
    icon: "🔬",
  },
];

export default async function OnboardingPage() {
  await requireUser();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--canvas)" }}>
      {/* Top bar */}
      <div className="px-4 sm:px-10 py-5 flex items-center justify-between border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2" style={{ color: "var(--t1)" }}>
          <Logo size={22} />
          <span className="display text-[15px] font-semibold tracking-tight">
            Pledge<span style={{ color: "var(--accent)" }}>OFF</span>
          </span>
        </div>
        <Link
          href="/dashboard"
          className="mono text-[11px] transition-colors"
          style={{ color: "var(--t3)" }}
        >
          Skip →
        </Link>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-150 w-full">
          {/* Welcome */}
          <div className="mb-12 text-center">
            <div className="mono text-[10px] uppercase tracking-[0.14em] mb-3" style={{ color: "var(--accent)" }}>
              Welcome to PledgeOFF
            </div>
            <h1
              className="display text-[32px] sm:text-[44px] font-bold tracking-tight leading-[1.05] mb-4"
              style={{ color: "var(--t1)", letterSpacing: "-0.03em" }}
            >
              Validate before you build.
            </h1>
            <p className="text-[15px] leading-relaxed" style={{ color: "var(--t2)" }}>
              Stop wasting months on ideas nobody wants. Get a data-driven verdict in under 60 seconds.
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-3 mb-10">
            {STEPS.map((step, i) => (
              <div
                key={step.num}
                className="flex items-start gap-4 rounded-md border p-4"
                style={{ borderColor: "var(--border)", background: "var(--surface)" }}
              >
                <div
                  className="mono text-[10px] pt-0.5 shrink-0 w-6 text-right"
                  style={{ color: "var(--t3)" }}
                >
                  {step.num}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[15px]">{step.icon}</span>
                    <span className="text-[14px] font-semibold" style={{ color: "var(--t1)" }}>
                      {step.title}
                    </span>
                  </div>
                  <p className="text-[13px] leading-relaxed" style={{ color: "var(--t2)" }}>
                    {step.desc}
                  </p>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="mono text-[10px] pt-0.5 shrink-0" style={{ color: "var(--t3)" }}>
                    →
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Link
              href="/ideas/new"
              className="display text-[15px] font-semibold px-6 h-12 rounded-md flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
              style={{ background: "var(--accent)", color: "#000" }}
            >
              Validate your first idea →
            </Link>
            <Link
              href="/dashboard"
              className="mono text-[11px] h-12 flex items-center justify-center px-4 rounded-md border transition-colors hover:border-(--t2)"
              style={{ borderColor: "var(--border)", color: "var(--t3)" }}
            >
              Go to Dashboard
            </Link>
          </div>

          <p className="mt-6 text-center mono text-[10px]" style={{ color: "var(--t3)" }}>
            1 free validation per month. No credit card required.
          </p>
        </div>
      </div>
    </div>
  );
}
