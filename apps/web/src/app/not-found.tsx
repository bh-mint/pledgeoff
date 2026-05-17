import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "404 — Page not found · PledgeOFF",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--canvas)", color: "var(--t1)" }}>
      <div className="grid-bg" />
      <div className="ambient-kill" />
      {/* Secondary ambient */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 90%, color-mix(in srgb, var(--accent) 4%, transparent) 0%, transparent 50%)" }}
      />

      {/* Wordmark only */}
      <div className="relative z-10 px-8 h-14 flex items-center reveal" style={{ animationDelay: "50ms" }}>
        <Link href="/" className="display text-[13px] font-semibold">
          Pledge<span style={{ color: "var(--accent)" }}>OFF</span>
        </Link>
      </div>

      {/* Center */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-6">
        <div className="text-center max-w-[640px]">

          {/* Status row */}
          <div
            className="reveal flex items-center justify-center gap-2 mb-10"
            style={{ animationDelay: "120ms" }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--kill)" }} />
            <span className="mono text-[10px] tracking-wider uppercase" style={{ color: "var(--kill)" }}>
              request killed
            </span>
            <span className="mono text-[10px]" style={{ color: "var(--t3)" }}>·</span>
            <span className="mono text-[10px]" style={{ color: "var(--t3)" }}>no signal</span>
          </div>

          {/* Massive 404 */}
          <div
            className="reveal mono leading-none tnum"
            style={{
              fontSize: "clamp(96px, 18vw, 180px)",
              color: "var(--t3)",
              animationDelay: "200ms",
              letterSpacing: "-0.05em",
            }}
          >
            4<span style={{ color: "var(--kill)", opacity: 0.85 }}>0</span>4
          </div>

          {/* Verdict */}
          <h1
            className="reveal display font-bold mt-8"
            style={{ fontSize: "34px", color: "var(--t1)", animationDelay: "400ms" }}
          >
            Page not found.
          </h1>
          <p
            className="reveal text-[14px] mt-3 max-w-md mx-auto leading-relaxed"
            style={{ color: "var(--t2)", animationDelay: "520ms" }}
          >
            The URL you followed doesn&apos;t match a route in our app. It may have been moved, archived, or never
            existed in the first place.
          </p>

          {/* ID line */}
          <div
            className="reveal mt-8 inline-flex items-center gap-3 rounded-md border px-3 py-2 mono text-[11px]"
            style={{
              borderColor: "var(--border)",
              background: "var(--surface)",
              animationDelay: "640ms",
              color: "var(--t3)",
            }}
          >
            <span style={{ color: "var(--kill)" }}>val_404</span>
            <span style={{ color: "var(--border)" }}>|</span>
            <span>
              this idea doesn&apos;t exist<span className="blink">_</span>
            </span>
          </div>

          {/* CTAs */}
          <div
            className="reveal mt-10 flex items-center justify-center gap-2 flex-wrap"
            style={{ animationDelay: "760ms" }}
          >
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 h-11 px-5 rounded-md display text-[13px] font-semibold transition-opacity hover:opacity-90"
              style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
            >
              <span aria-hidden="true">←</span> Back to dashboard
            </Link>
            <Link
              href="/ideas/new"
              className="inline-flex items-center gap-2 h-11 px-5 rounded-md border display text-[13px] transition-colors hover:bg-white/5"
              style={{ borderColor: "var(--border)", color: "var(--t1)" }}
            >
              Validate a new idea
            </Link>
          </div>

          {/* Quick links */}
          <div
            className="mt-12 max-w-md mx-auto"
            style={{ opacity: 0, animation: "fadeUp 600ms cubic-bezier(0.16,1,0.3,1) 920ms forwards" }}
          >
            <div className="mono text-[10px] mb-2 text-left" style={{ color: "var(--t3)" }}>OR LOOK ELSEWHERE</div>
            <div
              className="rounded-md border divide-y"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            >
              {[
                { label: "Browse your validations", path: "/dashboard", slug: "/dashboard →" },
                { label: "Read the briefing", path: "/blog", slug: "/blog →" },
                { label: "Pricing & plans", path: "/pricing", slug: "/pricing →" },
              ].map(({ label, path, slug }) => (
                <Link
                  key={path}
                  href={path}
                  className="flex items-center justify-between px-4 h-11 text-[13px] transition-colors hover:bg-white/5"
                  style={{ borderColor: "var(--border)" }}
                >
                  <span style={{ color: "var(--t1)" }}>{label}</span>
                  <span className="mono text-[10px]" style={{ color: "var(--t3)" }}>{slug}</span>
                </Link>
              ))}
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <div
        className="relative z-10 px-8 py-6 flex items-center justify-between"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <span className="mono text-[10px]" style={{ color: "var(--t3)" }}>© 2026 PledgeOFF</span>
        <span className="mono text-[10px]" style={{ color: "var(--t3)" }}>err_404 · no signal found</span>
      </div>
    </div>
  );
}
