import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Pricing — PledgeOFF",
  description: "Free until you're sure. Then €19.99/mo. Validate unlimited ideas, access all signal sources, and stop wasting months on bad bets.",
  openGraph: {
    title: "Pricing — PledgeOFF",
    description: "Free until you're sure. Then €19.99/mo.",
  },
};

const FREE_FEATURES = ["3 validations / month", "Reddit + Trends signals"];
const FREE_MISSING = ["Competitor matrix", "Revenue simulator", "AI co-founder"];

const PRO_FEATURES = [
  "Unlimited validations",
  "All 5 signal sources",
  "Competitor matrix + trends",
  "Revenue simulator",
  "Niche goldmine feed",
  "AI co-founder mode",
];

const AGENCY_FEATURES = [
  "Everything in Pro",
  "5 seats included",
  "White-label PDF reports",
  "API access",
  "Priority scraping queue",
];

const FAQ = [
  {
    q: "Can I cancel anytime?",
    a: "Yes. No contracts, no lock-in. Cancel from your dashboard and you keep access until the end of the billing period.",
  },
  {
    q: "What counts as a validation?",
    a: "One idea submitted = one validation. Resubmitting the same idea with different wording counts as a new validation.",
  },
  {
    q: "What signal sources do you scan?",
    a: "Reddit communities, GitHub issues and discussions, Google Trends, competitor product pages, and App Store reviews. Pro unlocks all five.",
  },
  {
    q: "Is there a free trial for Pro?",
    a: "Yes — 7 days free when you sign up. No credit card required to start.",
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[var(--canvas)]">
      <Nav />

      <main className="max-w-[1320px] mx-auto px-8 pt-20 pb-24">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="mono text-[10px] text-[var(--t3)] uppercase tracking-[0.12em] mb-4">
            Pricing
          </p>
          <h1 className="display text-[48px] md:text-[64px] font-black leading-[1] text-[var(--t1)] mb-4">
            Free until you&apos;re sure.
            <br />
            Then <span className="text-[var(--accent)]">€19.99</span>.
          </h1>
          <p className="text-[17px] text-[var(--t2)] max-w-[480px] mx-auto">
            Start free. No credit card. Get your first verdict in 15 seconds.
          </p>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-20">
          {/* Free */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-md p-6">
            <p className="text-[13px] font-semibold text-[var(--t1)] mb-1">Free</p>
            <p className="mono text-[11px] text-[var(--t3)] mb-4">Kick the tires</p>
            <p className="display text-[36px] font-black text-[var(--t1)] tnum mb-1">€0</p>
            <p className="mono text-[11px] text-[var(--t3)] mb-6">forever</p>
            <Link
              href="/login"
              className="block w-full h-9 flex items-center justify-center rounded-md border border-[var(--border)] text-[13px] text-[var(--t1)] hover:border-[var(--t3)] transition-colors mb-5"
            >
              Start free
            </Link>
            <ul className="space-y-2 text-[13px]">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 text-[var(--t2)]">
                  <span className="text-[var(--validated)]">✓</span> {f}
                </li>
              ))}
              {FREE_MISSING.map((f) => (
                <li key={f} className="flex items-center gap-2 text-[var(--t3)]">
                  <span>—</span> {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Pro */}
          <div className="bg-[var(--surface)] border border-[var(--accent)]/40 rounded-md p-6 relative">
            <span className="absolute top-4 right-4 mono text-[9px] text-[var(--accent)] uppercase tracking-[0.12em] bg-[var(--accent)]/10 px-2 py-0.5 rounded">
              ● RECOMMENDED
            </span>
            <p className="text-[13px] font-semibold text-[var(--t1)] mb-1">Pro</p>
            <p className="mono text-[11px] text-[var(--t3)] mb-4">For serious founders</p>
            <p className="display text-[36px] font-black text-[var(--t1)] tnum mb-1">€19.99</p>
            <p className="mono text-[11px] text-[var(--t3)] mb-6">/mo · cancel anytime</p>
            <Link
              href="/login"
              className="display block w-full h-9 flex items-center justify-center rounded-md bg-[var(--accent)] text-black text-[13px] font-semibold hover:opacity-90 transition-opacity mb-5"
            >
              Start Pro trial
            </Link>
            <ul className="space-y-2 text-[13px]">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 text-[var(--t2)]">
                  <span className="text-[var(--validated)]">✓</span> {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Agency */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-md p-6">
            <p className="text-[13px] font-semibold text-[var(--t1)] mb-1">Agency</p>
            <p className="mono text-[11px] text-[var(--t3)] mb-4">Vet client briefs</p>
            <p className="display text-[36px] font-black text-[var(--t1)] tnum mb-1">€99</p>
            <p className="mono text-[11px] text-[var(--t3)] mb-6">/mo · 5 seats</p>
            <a
              href="mailto:hello@pledgeoff.com"
              className="block w-full h-9 flex items-center justify-center rounded-md border border-[var(--border)] text-[13px] text-[var(--t1)] hover:border-[var(--t3)] transition-colors mb-5"
            >
              Talk to us
            </a>
            <ul className="space-y-2 text-[13px]">
              {AGENCY_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 text-[var(--t2)]">
                  <span className="text-[var(--validated)]">✓</span> {f}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-[720px] mx-auto">
          <p className="mono text-[10px] text-[var(--t3)] uppercase tracking-[0.12em] mb-8 text-center">
            FAQ
          </p>
          <div className="space-y-0 border border-[var(--border)] rounded-md overflow-hidden">
            {FAQ.map((item, i) => (
              <div
                key={i}
                className={`p-6 ${i < FAQ.length - 1 ? "border-b border-[var(--border)]" : ""}`}
              >
                <p className="text-[14px] font-semibold text-[var(--t1)] mb-2">{item.q}</p>
                <p className="text-[13px] text-[var(--t2)] leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
