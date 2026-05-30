import type { Metadata } from "next";
import Link from "next/link";
import { PublicNav } from "@/components/PublicNav";
import { Footer } from "@/components/Footer";
import { PRICING } from "@/lib/pricing.config";

const COMMISSION_RATE = 0.3;
const PLANS = [
  { plan: "Founder", monthly: PRICING.founder.monthly.eur },
  { plan: "Team", monthly: PRICING.team.monthly.eur },
  { plan: "Studio", monthly: PRICING.studio.monthly.eur },
] as const;

export const metadata: Metadata = {
  title: { absolute: "Affiliate Program — PledgeOFF" },
  description:
    "Earn 30% recurring commission for every paid user you refer to PledgeOFF. No cap, no expiry. Built for founders, bloggers, and communities.",
  alternates: { canonical: "https://pledgeoff.com/affiliate" },
  openGraph: {
    title: "Affiliate Program — PledgeOFF",
    description:
      "Earn 30% recurring commission for every paid user you refer to PledgeOFF. No cap, no expiry.",
    url: "https://pledgeoff.com/affiliate",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Affiliate Program — PledgeOFF",
  description: "Earn 30% recurring commission for every paid PledgeOFF user you refer.",
  url: "https://pledgeoff.com/affiliate",
};

const STEPS = [
  {
    step: "01",
    label: "Apply",
    desc: "Email us at partnerships@pledgeoff.com. No minimum audience required — we work with newsletters, blogs, YouTube channels, communities, and founders with an email list.",
  },
  {
    step: "02",
    label: "Get your link",
    desc: "We generate a unique referral link for you. Share it in your content, emails, or community.",
  },
  {
    step: "03",
    label: "Earn",
    desc: "You earn 30% of every payment made by users who signed up through your link. Monthly and annual plans both count. As long as they stay subscribed, you keep earning.",
  },
  {
    step: "04",
    label: "Get paid",
    desc: "Payouts processed monthly via Stripe. Minimum threshold: €50. No setup fees, no hidden cuts.",
  },
];

const FAQ = [
  {
    q: "Is there a minimum audience size?",
    a: "No. We work with anyone who has a relevant audience — whether that's 100 email subscribers or 100,000 Twitter followers.",
  },
  {
    q: "How long does the referral cookie last?",
    a: "90 days. If someone clicks your link and subscribes within 90 days, the commission is yours.",
  },
  {
    q: "Does the commission apply to all plans?",
    a: `Yes — Founder (€${PRICING.founder.monthly.eur}/mo), Team (€${PRICING.team.monthly.eur}/mo), and Studio (€${PRICING.studio.monthly.eur}/mo). Annual plans are also included. Enterprise deals are handled separately.`,
  },
  {
    q: "What if a referred user upgrades their plan?",
    a: "Your commission scales with the plan. If they upgrade from Founder to Team, you earn 30% of the higher amount from the next billing cycle.",
  },
  {
    q: "Can I use PledgeOFF myself and still affiliate?",
    a: "Yes. Many of our best affiliates are active users who recommend it because they use it.",
  },
];

export default function AffiliatePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div style={{ background: "var(--canvas)", color: "var(--t1)" }}>
        <PublicNav />

        <main className="max-w-360 mx-auto px-4 sm:px-10 pt-20 pb-32">
          <div className="max-w-3xl">
            {/* Label */}
            <div className="mono text-[10px] uppercase tracking-wider mb-4" style={{ color: "var(--t3)" }}>
              Affiliate program
            </div>

            <h1
              className="display font-bold leading-[1.05]"
              style={{ fontSize: "40px", letterSpacing: "-0.04em", color: "var(--t1)" }}
            >
              Earn 30% recurring commission.
            </h1>

            <p className="mt-6 text-[16px] leading-relaxed" style={{ color: "var(--t2)" }}>
              Refer founders, PMs, and agencies to PledgeOFF.
              Every paid user you bring in earns you 30% of their subscription — for as long as they stay.
              No cap. No expiry.
            </p>

            {/* Commission cards */}
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {PLANS.map(({ plan, monthly }) => (
                <div
                  key={plan}
                  className="rounded-md border p-4"
                  style={{ borderColor: "var(--border)", background: "var(--surface)" }}
                >
                  <div className="display font-semibold text-[14px] mb-1" style={{ color: "var(--t1)" }}>
                    {plan}
                  </div>
                  <div className="mono text-[11px] mb-3" style={{ color: "var(--t3)" }}>
                    €{monthly}/mo
                  </div>
                  <div className="text-[13px] font-semibold" style={{ color: "var(--validated)" }}>
                    €{(monthly * COMMISSION_RATE).toFixed(2)}/mo per user
                  </div>
                </div>
              ))}
            </div>

            {/* Divider */}
            <div className="my-12 h-px" style={{ background: "var(--border)" }} />

            {/* How it works */}
            <h2
              className="display font-semibold mb-6"
              style={{ fontSize: "22px", color: "var(--t1)" }}
            >
              How it works
            </h2>

            <div className="space-y-6">
              {STEPS.map(({ step, label, desc }) => (
                <div key={step} className="flex gap-5">
                  <div className="mono text-[11px] pt-0.5 shrink-0" style={{ color: "var(--t3)" }}>
                    {step}
                  </div>
                  <div>
                    <div className="display text-[15px] font-semibold mb-1" style={{ color: "var(--t1)" }}>
                      {label}
                    </div>
                    <div className="text-[13px] leading-relaxed" style={{ color: "var(--t2)" }}>
                      {desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="mt-10">
              <a
                href="mailto:partnerships@pledgeoff.com"
                className="inline-flex items-center gap-2 h-10 px-5 rounded-md display text-[13px] font-semibold transition-opacity hover:opacity-90"
                style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
              >
                Apply to join →
              </a>
            </div>

            {/* Divider */}
            <div className="my-12 h-px" style={{ background: "var(--border)" }} />

            {/* Who it's for */}
            <h2
              className="display font-semibold mb-6"
              style={{ fontSize: "22px", color: "var(--t1)" }}
            >
              Who it&apos;s for
            </h2>

            <div className="space-y-4">
              {[
                { label: "Founder newsletters", desc: "IndieHackers, Substack, Beehiiv writers with an audience of builders." },
                { label: "Product blogs & YouTube", desc: "Content about product strategy, validation, building SaaS, or founder life." },
                { label: "Developer communities", desc: "Discord servers, Slack groups, forums where PMs and founders hang out." },
                { label: "Accelerators & incubators", desc: "You introduce us to your cohort. Every founder they refer earns both of you." },
                { label: "Consultants & coaches", desc: "If you advise founders on product decisions, PledgeOFF is a natural recommendation." },
              ].map(({ label, desc }) => (
                <div key={label} className="flex gap-4">
                  <div className="text-[13px] shrink-0 pt-0.5" style={{ color: "var(--t3)" }}>—</div>
                  <div>
                    <span className="display text-[13px] font-semibold" style={{ color: "var(--t1)" }}>
                      {label}
                      {" "}
                    </span>
                    <span className="text-[13px]" style={{ color: "var(--t2)" }}>{desc}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Divider */}
            <div className="my-12 h-px" style={{ background: "var(--border)" }} />

            {/* FAQ */}
            <h2
              className="display font-semibold mb-6"
              style={{ fontSize: "22px", color: "var(--t1)" }}
            >
              Frequently asked
            </h2>

            <div className="space-y-6">
              {FAQ.map(({ q, a }) => (
                <div key={q}>
                  <div className="display text-[14px] font-semibold mb-1" style={{ color: "var(--t1)" }}>
                    {q}
                  </div>
                  <div className="text-[13px] leading-relaxed" style={{ color: "var(--t2)" }}>
                    {a}
                  </div>
                </div>
              ))}
            </div>

            {/* Divider */}
            <div className="my-12 h-px" style={{ background: "var(--border)" }} />

            {/* Bottom CTA */}
            <div
              className="rounded-md border p-6"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            >
              <div className="display font-semibold leading-tight" style={{ fontSize: "20px", color: "var(--t1)" }}>
                Ready to earn?
              </div>
              <p className="text-[13px] mt-2 leading-relaxed" style={{ color: "var(--t2)" }}>
                Email{" "}
                <a
                  href="mailto:partnerships@pledgeoff.com"
                  className="underline underline-offset-2 hover:opacity-70"
                  style={{ color: "var(--t1)" }}
                >
                  partnerships@pledgeoff.com
                </a>{" "}
                with a short description of your audience.
                We review every application and respond within 2 business days.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <a
                  href="mailto:partnerships@pledgeoff.com"
                  className="inline-flex items-center gap-2 h-10 px-5 rounded-md display text-[13px] font-semibold transition-opacity hover:opacity-90"
                  style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
                >
                  Apply now →
                </a>
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-md display text-[13px] font-medium transition-opacity hover:opacity-80 border"
                  style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--t1)" }}
                >
                  See pricing
                </Link>
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
