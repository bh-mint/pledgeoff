import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Changelog — PledgeOFF",
  description: "What's new in PledgeOFF — every release, every fix, every improvement.",
  robots: { index: true, follow: true },
};

const RELEASES = [
  {
    version: "0.9",
    date: "May 2026",
    tag: "UI",
    items: [
      "Redesign complet nav — toate acțiunile vizibil uniforme",
      "Footer cu iconuri social (X, TikTok, Instagram)",
      "Header sticky pe toate paginile",
      "Ierarhie tipografică consistentă pe întregul site",
    ],
  },
  {
    version: "0.8",
    date: "May 2026",
    tag: "DESIGN",
    items: [
      "Dashboard redesign cu sparklines și pipeline vizual",
      "Loading screen animat cu 3 paneluri de progres",
      "Evidence wall cu score animat count-up + glow",
      "Dimensiuni scor (Market Demand, Competition, Feasibility, Timing)",
    ],
  },
  {
    version: "0.7",
    date: "May 2026",
    tag: "CONTENT",
    items: [
      "Blog index + pagini articole cu ToC și progress bar",
      "Privacy Policy completă (GDPR, sub-procesori, drepturi Art. 15–21)",
      "Terms of Service (billing, trial, refund policy, governing law EU)",
      "Cookie banner cu consent management",
    ],
  },
  {
    version: "0.6",
    date: "May 2026",
    tag: "INTELLIGENCE",
    items: [
      "Verdict AI generat de Groq cu schema validată Zod",
      "Prompt versioned (decision-prompt.v1) cu 4 dimensiuni ponderate",
      "Score calculat din weighted average (Market Demand ×0.4, etc.)",
      "Idempotency completă — fiecare event procesat o singură dată",
    ],
  },
  {
    version: "0.5",
    date: "May 2026",
    tag: "SIGNALS",
    items: [
      "Reddit adapter — scrape live via Reddit public JSON API",
      "GitHub adapter — issues taguite cu sentiment din reactions",
      "Postgres event bus cu outbox pattern + cron retry",
      "Graceful degradation când o sursă e down",
    ],
  },
  {
    version: "0.1",
    date: "Apr 2026",
    tag: "LAUNCH",
    items: [
      "First deploy pe pledgeoff.com",
      "Auth email + Google OAuth via Supabase",
      "POST /api/v1/ideas → decizie în timp real",
      "RLS activat pe toate tabelele din zi 1",
    ],
  },
];

const TAG_COLORS: Record<string, string> = {
  UI:          "var(--accent)",
  DESIGN:      "var(--validated)",
  CONTENT:     "var(--caution)",
  INTELLIGENCE:"var(--accent)",
  SIGNALS:     "var(--validated)",
  LAUNCH:      "var(--accent)",
};

export default function ChangelogPage() {
  return (
    <div style={{ background: "var(--canvas)", color: "var(--t1)" }}>
      {/* Nav */}
      <header className="border-b sticky top-0 z-50" style={{ borderColor: "var(--border)", background: "var(--canvas)" }}>
        <div className="max-w-[1100px] mx-auto px-8 h-12 flex items-center justify-between">
          <Link href="/" className="display text-[15px] font-semibold">
            Pledge<span style={{ color: "var(--accent)" }}>OFF</span>
          </Link>
          <nav className="flex items-center gap-2 mono text-[11px]">
            {[
              { href: "/pricing", label: "Pricing" },
              { href: "/blog",    label: "Blog" },
              { href: "/login",   label: "Log in" },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="h-7 px-3 rounded-md font-semibold flex items-center hover:opacity-90 transition-opacity"
                style={{ background: "var(--accent)", color: "#000" }}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* Heading */}
      <section className="border-b" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-[1100px] mx-auto px-8 py-12">
          <div className="mono text-[10px] uppercase tracking-wider mb-3" style={{ color: "var(--t3)" }}>
            CHANGELOG · RELEASES
          </div>
          <h1
            className="display font-semibold"
            style={{ fontSize: "32px", letterSpacing: "-0.04em", color: "var(--t1)" }}
          >
            What&apos;s shipped.
          </h1>
          <p className="mt-3 text-[13px] max-w-[480px]" style={{ color: "var(--t2)" }}>
            Every meaningful change — features, fixes, and improvements — in reverse chronological order.
          </p>
        </div>
      </section>

      {/* Releases */}
      <div className="max-w-[1100px] mx-auto px-8 py-12 space-y-0">
        {RELEASES.map((r, i) => (
          <div
            key={r.version}
            className="grid grid-cols-12 gap-8 py-8"
            style={{ borderBottom: i < RELEASES.length - 1 ? "1px solid var(--border)" : "none" }}
          >
            {/* Left — version + date */}
            <div className="col-span-3">
              <div className="mono text-[11px] font-semibold" style={{ color: "var(--t1)" }}>
                v{r.version}
              </div>
              <div className="mono text-[10px] mt-1" style={{ color: "var(--t3)" }}>
                {r.date}
              </div>
              <span
                className="inline-block mt-3 mono text-[9px] uppercase tracking-[0.1em] px-2 py-0.5 rounded"
                style={{
                  color: TAG_COLORS[r.tag] ?? "var(--t3)",
                  background: `color-mix(in srgb, ${TAG_COLORS[r.tag] ?? "var(--t3)"} 12%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${TAG_COLORS[r.tag] ?? "var(--t3)"} 30%, transparent)`,
                }}
              >
                {r.tag}
              </span>
            </div>

            {/* Right — items */}
            <ul className="col-span-9 space-y-2">
              {r.items.map((item) => (
                <li key={item} className="flex items-start gap-3 text-[13px]" style={{ color: "var(--t2)" }}>
                  <span className="mt-[5px] w-1 h-1 rounded-full flex-shrink-0" style={{ background: "var(--t3)" }} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
