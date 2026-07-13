import type { Metadata } from "next";
import Link from "next/link";
import { PublicNav } from "@/components/PublicNav";
import { Footer } from "@/components/Footer";
import { Reveal } from "@/components/motion/Reveal";
import { PRICING } from "@/lib/pricing.config";

const COMMISSION_RATE = 0.3;
const PLANS = [
  { plan: "Founder", monthly: PRICING.founder.monthly.eur },
  { plan: "Team",    monthly: PRICING.team.monthly.eur },
  { plan: "Studio",  monthly: PRICING.studio.monthly.eur },
] as const;

export const metadata: Metadata = {
  title: { absolute: "Affiliate Program — PledgeOFF" },
  description:
    "Earn 30% recurring commission for every paid user you refer to PledgeOFF. No cap, no expiry. Built for founders, bloggers, and communities.",
  alternates: { canonical: "https://pledgeoff.com/affiliate" },
  openGraph: {
    title: "Affiliate Program — PledgeOFF",
    description: "Earn 30% recurring commission for every paid user you refer to PledgeOFF. No cap, no expiry.",
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
  { step: "01", label: "Apply",          desc: "Email us at partnerships@pledgeoff.com. No minimum audience required — we work with newsletters, blogs, YouTube, communities, and founders with an email list." },
  { step: "02", label: "Get your link",  desc: "We generate a unique referral link for you. Share it in your content, emails, or community." },
  { step: "03", label: "Earn",           desc: "You earn 30% of every payment made by users who signed up through your link. Monthly and annual plans both count. As long as they stay subscribed, you keep earning." },
  { step: "04", label: "Get paid",       desc: "Payouts processed monthly via Stripe. Minimum threshold: €50. No setup fees, no hidden cuts." },
];

const FAQ = [
  { q: "Is there a minimum audience size?",           a: "No. We work with anyone who has a relevant audience — whether that's 100 email subscribers or 100,000 Twitter followers." },
  { q: "How long does the referral cookie last?",     a: "90 days. If someone clicks your link and subscribes within 90 days, the commission is yours." },
  { q: "Does the commission apply to all plans?",     a: `Yes — Founder (€${PRICING.founder.monthly.eur}/mo), Team (€${PRICING.team.monthly.eur}/mo), and Studio (€${PRICING.studio.monthly.eur}/mo). Annual plans included. Enterprise handled separately.` },
  { q: "What if a referred user upgrades?",           a: "Your commission scales with the plan. If they upgrade from Founder to Team, you earn 30% of the higher amount from the next billing cycle." },
  { q: "Can I use PledgeOFF and still affiliate?",   a: "Yes. Many of our best affiliates are active users who recommend it because they use it." },
];

export default function AffiliatePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div style={{ background: "var(--bg)", color: "var(--ink)" }}>
        <PublicNav />

        <div className="w-bleed" style={{ paddingTop: "52px", paddingBottom: "60px" }}>
          <span className="eye">Affiliate program</span>
          <h1 className="mkt-h2" style={{ marginBottom: "10px" }}>Earn 30% recurring commission.</h1>
          <p className="mkt-lead" style={{ marginBottom: "32px" }}>
            Refer founders, PMs, and agencies. Every paid user you bring in earns you 30% of their subscription — for as long as they stay. No cap. No expiry.
          </p>

          {/* Commission cards */}
          <Reveal>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px", marginBottom: "32px" }}>
              {PLANS.map(({ plan, monthly }) => (
                <div key={plan} className="bc">
                  <div className="bc-hd">{plan} <span className="r">€{monthly}/mo</span></div>
                  <div className="bc-bd">
                    <div className="display" style={{ fontSize: "22px", fontWeight: 700, color: "var(--go)", lineHeight: 1 }}>
                      €{(monthly * COMMISSION_RATE).toFixed(2)}
                    </div>
                    <div className="mono" style={{ fontSize: "8px", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--faint)", marginTop: "4px" }}>
                      per user · per month
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>

          {/* How it works */}
          <Reveal delayMs={80}>
            <div className="sec" style={{ marginBottom: "28px" }}>
              <div className="sec-hd">How it works</div>
              <div className="sec-bd" style={{ padding: 0 }}>
                {STEPS.map(({ step, label, desc }) => (
                  <div key={step} className="aff-step" style={{ padding: "16px 22px" }}>
                    <div className="aff-no">{step}</div>
                    <div>
                      <div className="aff-nm">{label}</div>
                      <div className="aff-desc">{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          {/* Who it's for */}
          <Reveal delayMs={160}>
            <div className="sec" style={{ marginBottom: "28px" }}>
              <div className="sec-hd">Who it&apos;s for</div>
              <div className="sec-bd" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {[
                  { label: "Founder newsletters",   desc: "IndieHackers, Substack, Beehiiv writers with an audience of builders." },
                  { label: "Product blogs & YouTube", desc: "Content about product strategy, validation, building SaaS, or founder life." },
                  { label: "Developer communities",  desc: "Discord servers, Slack groups, forums where PMs and founders hang out." },
                  { label: "Accelerators",            desc: "Introduce us to your cohort. Every founder they refer earns both of you." },
                  { label: "Consultants & coaches",  desc: "If you advise founders on product decisions, PledgeOFF is a natural recommendation." },
                ].map(({ label, desc }) => (
                  <div key={label} style={{ display: "flex", gap: "12px" }}>
                    <span className="mono" style={{ fontSize: "11px", color: "var(--faint)", flexShrink: 0, paddingTop: "2px" }}>—</span>
                    <span style={{ fontSize: "13.5px", color: "var(--dim)" }}>
                      <strong style={{ color: "var(--ink)" }}>{label}</strong>{" "}{desc}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          {/* FAQ */}
          <div className="sec" style={{ marginBottom: "32px" }}>
            <div className="sec-hd">Frequently asked</div>
            <div className="sec-bd" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {FAQ.map(({ q, a }) => (
                <div key={q}>
                  <div className="display" style={{ fontSize: "14px", fontWeight: 700, color: "var(--ink)", marginBottom: "4px" }}>{q}</div>
                  <div style={{ fontSize: "13px", color: "var(--dim)", lineHeight: 1.75 }}>{a}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="bc">
            <div className="bc-hd">Ready to earn? <span className="r">partnerships@pledgeoff.com</span></div>
            <div className="bc-bd">
              <p style={{ fontSize: "13.5px", color: "var(--dim)", lineHeight: 1.75, marginBottom: "16px" }}>
                Email us with a short description of your audience. We review every application and respond within 2 business days.
              </p>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <a href="mailto:partnerships@pledgeoff.com" className="btn-p">Apply now →</a>
                <Link href="/pricing" className="btn-g">See pricing</Link>
              </div>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </>
  );
}
