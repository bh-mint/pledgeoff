"use client";

import { useState } from "react";
import Link from "next/link";
import { PreLoginNav } from "@/components/PreLoginNav";
import { Footer } from "@/components/Footer";

const FEATURES = [
  {
    group: "Validation",
    rows: [
      { k: "Validations / month",     f: "3",              p: "Unlimited",         a: "Unlimited" },
      { k: "Sources scraped per run", f: "Reddit + Trends", p: "All sources",       a: "All + custom" },
      { k: "Evidence wall",           f: "6 posts",        p: "Unlimited",         a: "Unlimited" },
      { k: "Competitor matrix",       f: "—",              p: "Up to 14",          a: "Up to 50" },
    ],
  },
  {
    group: "Simulation",
    rows: [
      { k: "Revenue simulator",       f: "—",              p: "24mo · 3 scenarios", a: "60mo · 5 scenarios" },
      { k: "TAM / SAM / SOM",         f: "—",              p: "✓",                  a: "✓ · methodology export" },
      { k: "Editable assumptions",    f: "—",              p: "✓",                  a: "✓" },
    ],
  },
  {
    group: "Discovery",
    rows: [
      { k: "Daily niche goldmine",    f: "3 niches",       p: "Full 12",           a: "Full 12 + saved searches" },
      { k: "Email digest",            f: "—",              p: "Daily 09:00 UTC",   a: "Daily + per-seat" },
    ],
  },
  {
    group: "Co-Founder",
    rows: [
      { k: "AI Co-Founder · Otto",    f: "Read-only",      p: "Full",              a: "Full · per-seat memory" },
      { k: "Conversation memory",     f: "7 days",         p: "Unlimited",         a: "Unlimited · shared" },
    ],
  },
  {
    group: "Publishing",
    rows: [
      { k: "Auto-build landing page", f: "—",              p: "✓",                 a: "✓ · white-label" },
      { k: "PDF report export",       f: "Watermarked",    p: "Clean",             a: "White-label" },
    ],
  },
  {
    group: "Support",
    rows: [
      { k: "Response SLA",            f: "Best effort",    p: "24h",               a: "4h" },
      { k: "API access",              f: "—",              p: "—",                 a: "✓" },
      { k: "Seats included",          f: "1",              p: "1",                 a: "5" },
    ],
  },
];

const FAQ = [
  {
    q: "Where does the data actually come from?",
    a: "Reddit (via the official API), Google Trends, Indie Hackers, Product Hunt, App Store reviews, and more. Every score has a source trail. Nothing is generated — every number was scraped within the last hour.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes — one click in Settings → Billing. You keep access until the end of the period. No retention emails, no \"are you sure\" gauntlet.",
  },
  {
    q: "Do you offer refunds?",
    a: "30-day full refund, no questions. After 30 days we'll prorate the remaining time on request.",
  },
  {
    q: "Can I export my validation data?",
    a: "Always. JSON, PDF, or shareable link. Your data is yours — including on Free.",
  },
  {
    q: "What's the catch on Free?",
    a: "3 validations a month is enough to seriously evaluate the product. If it's not for you, stay on Free forever. We mean it.",
  },
];

function renderCell(val: string, emphasize = false) {
  if (val === "—")
    return <span style={{ color: "var(--t3)" }}>—</span>;
  if (val === "✓")
    return <span style={{ color: "var(--validated)" }}>✓</span>;
  return (
    <span
      className={emphasize ? "display tnum text-[13px] font-semibold" : "text-[13px]"}
      style={{ color: emphasize ? "var(--t1)" : "var(--t2)" }}
    >
      {val}
    </span>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b" style={{ borderColor: "var(--border)" }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left py-5 flex items-center justify-between gap-4"
      >
        <span
          className="display text-[16px] font-semibold tracking-tight"
          style={{ color: "var(--t1)" }}
        >
          {q}
        </span>
        <span
          className="mono text-[14px] flex-shrink-0"
          style={{ color: "var(--t3)" }}
        >
          {open ? "−" : "+"}
        </span>
      </button>
      <div
        style={{
          maxHeight: open ? 400 : 0,
          overflow: "hidden",
          transition: "max-height 400ms cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <p
          className="text-[14px] leading-[1.65] pb-5 max-w-[680px]"
          style={{ color: "var(--t2)" }}
        >
          {a}
        </p>
      </div>
    </div>
  );
}

export function PricingClient() {
  const [billing, setBilling] = useState<"month" | "year">("month");
  const proPrice = billing === "month" ? "19.99" : "16";
  const proSub =
    billing === "month" ? "/mo" : "/mo · billed annually · €192/yr";

  return (
    <div className="min-h-screen" style={{ background: "var(--canvas)" }}>
      <PreLoginNav />

      {/* Hero */}
      <div className="border-b" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-[1200px] mx-auto px-8 py-16 grid grid-cols-12 gap-8 items-end">
          <div className="col-span-7">
            <div
              className="mono text-[10px] uppercase tracking-[0.14em] mb-4"
              style={{ color: "var(--t3)" }}
            >
              upgrade
            </div>
            <h1
              className="display text-[56px] font-semibold tracking-tight leading-[0.95]"
              style={{ color: "var(--t1)" }}
            >
              Free until you&apos;re sure.
              <br />
              <span style={{ color: "var(--t3)" }}>
                The next 5 ideas are the ones that matter.
              </span>
            </h1>
            <p
              className="mt-6 max-w-[520px] text-[15px] leading-[1.6]"
              style={{ color: "var(--t2)" }}
            >
              Validate unlimited ideas, open the simulator, and turn Otto into
              a real co-founder with full memory.{" "}
              <span style={{ color: "var(--t3)" }}>Cancel anytime — really.</span>
            </p>
          </div>
          {/* Billing toggle */}
          <div className="col-span-5 flex justify-end items-center gap-3">
            <span
              className="mono text-[11px]"
              style={{ color: billing === "month" ? "var(--t1)" : "var(--t3)" }}
            >
              monthly
            </span>
            <button
              onClick={() =>
                setBilling(billing === "month" ? "year" : "month")
              }
              className="w-10 h-5 rounded-full border relative"
              style={{
                borderColor: "var(--border)",
                background: "var(--surface)",
              }}
            >
              <span
                className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
                style={{
                  left:
                    billing === "year" ? "calc(100% - 18px)" : "2px",
                  background: "var(--accent)",
                }}
              />
            </button>
            <span
              className="mono text-[11px]"
              style={{ color: billing === "year" ? "var(--t1)" : "var(--t3)" }}
            >
              annual
            </span>
            <span
              className="mono text-[10px] tnum"
              style={{ color: "var(--accent)" }}
            >
              save €48
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-8 py-12">
        {/* Plans — joined grid */}
        <div
          className="grid grid-cols-3 border rounded-md overflow-hidden"
          style={{ borderColor: "var(--border)" }}
        >
          {/* Free */}
          <div
            className="p-8 border-r"
            style={{
              borderColor: "var(--border)",
              background: "var(--surface)",
            }}
          >
            <div
              className="display text-[18px] font-semibold mb-1"
              style={{ color: "var(--t1)" }}
            >
              Free
            </div>
            <div
              className="text-[12px] mb-8"
              style={{ color: "var(--t3)" }}
            >
              kick the tires
            </div>
            <div
              className="display text-[56px] tnum font-semibold mb-1 leading-none"
              style={{ color: "var(--t1)" }}
            >
              €0
            </div>
            <div
              className="mono text-[11px] mb-8"
              style={{ color: "var(--t3)" }}
            >
              forever
            </div>
            <Link
              href="/login"
              className="block w-full h-10 flex items-center justify-center rounded-md border text-[13px] transition-colors"
              style={{ borderColor: "var(--border)", color: "var(--t1)" }}
            >
              Current plan
            </Link>
            <div
              className="mt-6 mono text-[10px] leading-[1.6]"
              style={{ color: "var(--t3)" }}
            >
              3 validations / mo · Reddit + Trends · 7-day memory
            </div>
          </div>

          {/* Pro */}
          <div
            className="p-8 border-r relative"
            style={{ borderColor: "var(--border)", background: "var(--canvas)" }}
          >
            {/* Accent top bar */}
            <div
              className="absolute top-0 left-0 right-0 h-[2px]"
              style={{ background: "var(--accent)" }}
            />
            <div className="flex items-baseline justify-between mb-1">
              <div
                className="display text-[18px] font-semibold"
                style={{ color: "var(--t1)" }}
              >
                Pro
              </div>
              <span
                className="mono text-[10px]"
                style={{ color: "var(--accent)" }}
              >
                ● recommended
              </span>
            </div>
            <div
              className="text-[12px] mb-8"
              style={{ color: "var(--t3)" }}
            >
              for serious founders
            </div>
            <div className="flex items-baseline gap-1">
              <span
                className="display text-[56px] tnum font-semibold leading-none"
                style={{ color: "var(--t1)" }}
              >
                €{proPrice}
              </span>
            </div>
            <div
              className="mono text-[11px] mb-8"
              style={{ color: "var(--t3)" }}
            >
              {proSub}
            </div>
            <Link
              href="/login"
              className="display block w-full h-10 flex items-center justify-center rounded-md text-[13px] font-semibold hover:opacity-90 transition-opacity"
              style={{ background: "var(--accent)", color: "#000" }}
            >
              Upgrade to Pro
            </Link>
            <div
              className="mt-6 mono text-[10px] leading-[1.6]"
              style={{ color: "var(--t3)" }}
            >
              cancel anytime · 30-day refund
            </div>
          </div>

          {/* Agency */}
          <div
            className="p-8"
            style={{ background: "var(--surface)" }}
          >
            <div
              className="display text-[18px] font-semibold mb-1"
              style={{ color: "var(--t1)" }}
            >
              Agency
            </div>
            <div
              className="text-[12px] mb-8"
              style={{ color: "var(--t3)" }}
            >
              vet client briefs
            </div>
            <div
              className="display text-[56px] tnum font-semibold mb-1 leading-none"
              style={{ color: "var(--t1)" }}
            >
              €99
            </div>
            <div
              className="mono text-[11px] mb-8"
              style={{ color: "var(--t3)" }}
            >
              /mo · 5 seats included
            </div>
            <a
              href="mailto:hello@pledgeoff.com"
              className="block w-full h-10 flex items-center justify-center rounded-md border text-[13px] transition-colors"
              style={{ borderColor: "var(--border)", color: "var(--t1)" }}
            >
              Talk to us
            </a>
            <div
              className="mt-6 mono text-[10px] leading-[1.6]"
              style={{ color: "var(--t3)" }}
            >
              everything in Pro · API · white-label · priority queue
            </div>
          </div>
        </div>

        {/* Feature comparison table */}
        <div className="mt-16">
          <h2
            className="display text-[28px] font-semibold tracking-tight mb-2"
            style={{ color: "var(--t1)" }}
          >
            What&apos;s actually included.
          </h2>
          <p className="text-[13px] mb-8" style={{ color: "var(--t2)" }}>
            Specific numbers, not &ldquo;Limited&rdquo; vs &ldquo;Full access&rdquo;.
          </p>
          <div
            className="border rounded-md overflow-hidden"
            style={{ borderColor: "var(--border)" }}
          >
            {/* Column headers */}
            <div
              className="grid grid-cols-12 gap-3 px-6 py-3 mono text-[10px] uppercase tracking-[0.14em] border-b"
              style={{
                borderColor: "var(--border)",
                background: "var(--surface)",
                color: "var(--t3)",
              }}
            >
              <div className="col-span-6">Feature</div>
              <div className="col-span-2">Free</div>
              <div className="col-span-2" style={{ color: "var(--accent)" }}>
                Pro
              </div>
              <div className="col-span-2">Agency</div>
            </div>
            {FEATURES.map((g) => (
              <div key={g.group}>
                {/* Group header */}
                <div
                  className="px-6 py-2.5 mono text-[10px] uppercase tracking-[0.14em] border-b"
                  style={{
                    borderColor: "var(--border)",
                    color: "var(--t2)",
                    background: "var(--surface)",
                  }}
                >
                  {g.group}
                </div>
                {g.rows.map((r) => (
                  <div
                    key={r.k}
                    className="grid grid-cols-12 gap-3 px-6 py-3 border-b items-center"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <div
                      className="col-span-6 text-[13px]"
                      style={{ color: "var(--t1)" }}
                    >
                      {r.k}
                    </div>
                    <div className="col-span-2">{renderCell(r.f)}</div>
                    <div className="col-span-2">{renderCell(r.p, true)}</div>
                    <div className="col-span-2">{renderCell(r.a)}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Social proof */}
        <div className="mt-16">
          <h2
            className="display text-[28px] font-semibold tracking-tight mb-8"
            style={{ color: "var(--t1)" }}
          >
            What changes when you go Pro.
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                k: "You stop second-guessing.",
                q: "I run every client brief through this before quoting. Saves me from 3-month bad fits.",
                n: "Priya R.",
                h: "@priya.r",
              },
              {
                k: "Otto remembers everything.",
                q: "Otto reminded me I'd already killed an idea I was about to revisit. Saved a week.",
                n: "Marcus C.",
                h: "@marcus.codes",
              },
              {
                k: "Your simulator becomes math.",
                q: "Score went from 71 to 89 after I narrowed the audience. Would have shipped to the wrong people.",
                n: "Yuki T.",
                h: "@yukibuilds",
              },
            ].map((o) => (
              <div
                key={o.k}
                className="border rounded-md p-6"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--surface)",
                }}
              >
                <div
                  className="display text-[18px] font-semibold tracking-tight mb-3"
                  style={{ color: "var(--t1)" }}
                >
                  {o.k}
                </div>
                <p
                  className="text-[13px] leading-[1.55] mb-4 mono"
                  style={{ color: "var(--t2)" }}
                >
                  &ldquo;{o.q}&rdquo;
                </p>
                <div
                  className="mono text-[10px]"
                  style={{ color: "var(--t3)" }}
                >
                  — {o.n} · {o.h}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16">
          <h2
            className="display text-[28px] font-semibold tracking-tight mb-2"
            style={{ color: "var(--t1)" }}
          >
            Real questions.
          </h2>
          <p className="text-[13px] mb-6" style={{ color: "var(--t2)" }}>
            If something&apos;s missing, email us. No bots, no tickets.
          </p>
          <div>
            {FAQ.map((f) => (
              <FAQItem key={f.q} {...f} />
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <div
          className="mt-20 mb-10 flex items-center justify-between border-t pt-10"
          style={{ borderColor: "var(--border)" }}
        >
          <div>
            <div
              className="display text-[28px] font-semibold tracking-tight"
              style={{ color: "var(--t1)" }}
            >
              Ready when you are.
            </div>
            <div
              className="mono text-[11px] mt-2"
              style={{ color: "var(--t3)" }}
            >
              still on Free?{" "}
              <Link
                href="/dashboard"
                className="transition-colors"
                style={{ color: "var(--t1)" }}
              >
                back to dashboard →
              </Link>
            </div>
          </div>
          <Link
            href="/login"
            className="display text-[14px] font-semibold px-6 h-12 rounded-md flex items-center gap-2 hover:opacity-90 transition-opacity"
            style={{ background: "var(--accent)", color: "#000" }}
          >
            Upgrade to Pro · €{proPrice}/mo →
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
}
