import type { Metadata } from "next";
import Link from "next/link";
import { PublicNav } from "@/components/PublicNav";
import { Footer } from "@/components/Footer";
import { EnterpriseContactForm } from "./EnterpriseContactForm";
import { PRICING } from "@/lib/pricing.config";

export const metadata: Metadata = {
  title: { absolute: "Enterprise — PledgeOFF" },
  description:
    "PledgeOFF Enterprise: custom signal sources, SSO, dedicated SLA, invoice billing, and a contract that works for your legal team. Built for agencies and product studios.",
  alternates: { canonical: "https://pledgeoff.com/enterprise" },
  openGraph: {
    title: "Enterprise — PledgeOFF",
    description:
      "Custom signal sources, SSO, dedicated SLA, invoice billing, and a contract that works for your legal team.",
    url: "https://pledgeoff.com/enterprise",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Enterprise — PledgeOFF",
  description:
    "PledgeOFF Enterprise for agencies and product studios. Custom signal sources, SSO, dedicated SLA, invoice billing, and DPA-ready contracts.",
  url: "https://pledgeoff.com/enterprise",
};

const FEATURES = [
  {
    label: "Custom signal sources",
    desc: "Connect proprietary data — CRM exports, customer feedback tools, internal surveys — alongside our standard Reddit, GitHub, and HN feeds.",
  },
  {
    label: "SSO / SAML (Okta, Azure AD)",
    desc: "Enforce your identity provider. No separate credentials, no shadow IT.",
  },
  {
    label: "Custom DPA & contract",
    desc: "We sign your DPA. If you need custom data processing terms, a BAA, or jurisdiction-specific clauses, we handle it.",
  },
  {
    label: "Dedicated onboarding",
    desc: "A technical session to configure your workspace, source integrations, and team structure. Not a help article — a person.",
  },
  {
    label: "4h dedicated SLA",
    desc: "Named contact, direct Slack channel, and a response commitment that holds.",
  },
  {
    label: "Invoice billing (NET30/60)",
    desc: "No credit card required. We invoice your AP team on your billing cycle.",
  },
  {
    label: "White-label reports",
    desc: "PDF decision reports branded with your agency logo. Send them to clients as your own deliverable.",
  },
  {
    label: "Volume pricing",
    desc: "Custom seat pricing for large deployments. Negotiated annually — no per-seat surprises.",
  },
];

export default function EnterprisePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen" style={{ background: "var(--canvas)" }}>
        <PublicNav />

        {/* Hero */}
        <div className="border-b" style={{ borderColor: "var(--border)" }}>
          <div className="max-w-360 mx-auto px-4 sm:px-10 py-10 sm:py-20">
            <div className="mono text-[10px] uppercase tracking-[0.14em] mb-4" style={{ color: "var(--t3)" }}>
              enterprise
            </div>
            <h1 className="display text-[36px] sm:text-[64px] font-semibold tracking-tight leading-[0.95] max-w-200" style={{ color: "var(--t1)" }}>
              Decision intelligence<br />at organizational scale.
            </h1>
            <p className="mt-6 max-w-140 text-[14px] sm:text-[16px] leading-[1.65]" style={{ color: "var(--t2)" }}>
              For teams that make dozens of product decisions a month and can&apos;t afford to get them wrong.
              Enterprise adds the contracts, compliance, and integrations your legal and IT teams require.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#contact"
                className="display text-[14px] font-semibold px-6 h-11 rounded-md inline-flex items-center transition-opacity hover:opacity-90"
                style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
              >
                Talk to us →
              </a>
              <Link
                href="/pricing"
                className="mono text-[12px] px-6 h-11 rounded-md border inline-flex items-center transition-colors"
                style={{ borderColor: "var(--border)", color: "var(--t2)" }}
              >
                See all plans
              </Link>
            </div>
          </div>
        </div>

        <div className="max-w-360 mx-auto px-4 sm:px-10 py-12 sm:py-20">

          {/* What's included */}
          <div className="mb-16 sm:mb-24">
            <h2 className="display text-[24px] sm:text-[32px] font-semibold tracking-tight mb-2" style={{ color: "var(--t1)" }}>
              What Enterprise includes.
            </h2>
            <p className="text-[13px] mb-10" style={{ color: "var(--t2)" }}>
              Everything in Studio, plus the infrastructure your organisation demands.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-px border rounded-md overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--border)" }}>
              {FEATURES.map((f) => (
                <div key={f.label} className="p-6" style={{ background: "var(--surface)" }}>
                  <div className="flex items-start gap-3 mb-2">
                    <span className="mono text-[11px] mt-0.5 shrink-0" style={{ color: "var(--accent)" }}>✓</span>
                    <span className="display text-[15px] font-semibold" style={{ color: "var(--t1)" }}>{f.label}</span>
                  </div>
                  <p className="text-[13px] leading-[1.6] pl-5" style={{ color: "var(--t2)" }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Who it's for */}
          <div className="mb-16 sm:mb-24 grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                title: "Digital agencies",
                desc: "Vet client briefs before pitching. Kill bad projects before they start. Show clients data instead of opinions.",
              },
              {
                title: "Product studios",
                desc: "Run validation in parallel across multiple client projects. White-label output. Invoice clients directly.",
              },
              {
                title: "In-house product teams",
                desc: "Gate the roadmap with evidence. Shared workspace for product, design, and engineering. SSO enforced.",
              },
            ].map((item) => (
              <div key={item.title} className="border rounded-md p-6" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                <div className="display text-[16px] font-semibold mb-2" style={{ color: "var(--t1)" }}>{item.title}</div>
                <p className="text-[13px] leading-[1.6]" style={{ color: "var(--t2)" }}>{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Pricing note */}
          <div className="mb-16 border rounded-md p-8 sm:p-10" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 items-center">
              <div>
                <div className="mono text-[10px] uppercase tracking-[0.14em] mb-3" style={{ color: "var(--t3)" }}>pricing</div>
                <div className="display text-[28px] sm:text-[36px] font-semibold tracking-tight leading-[1.05]" style={{ color: "var(--t1)" }}>
                  From €{PRICING.enterprise.monthly.eur}/mo.<br />
                  <span style={{ color: "var(--t3)" }}>Negotiated annually, flat fee.</span>
                </div>
                <p className="mt-4 text-[13px] leading-[1.65]" style={{ color: "var(--t2)" }}>
                  No per-seat multiplication that blows up as you grow.
                  We agree on a flat annual fee based on seats, usage, and integrations.
                  Invoice billing, NET30 or NET60.
                </p>
              </div>
              <div className="flex flex-col gap-4">
                <div className="border rounded-md p-4" style={{ borderColor: "var(--border)" }}>
                  <div className="mono text-[10px] uppercase tracking-[0.1em] mb-1" style={{ color: "var(--t3)" }}>starts at</div>
                  <div className="display text-[28px] font-semibold" style={{ color: "var(--t1)" }}>€{PRICING.studio.monthly.eur}<span className="text-[14px] font-normal" style={{ color: "var(--t3)" }}>/mo</span></div>
                  <div className="mono text-[11px] mt-1" style={{ color: "var(--t3)" }}>Studio plan · self-serve · up to 10 seats</div>
                </div>
                <div
                  className="border rounded-md p-4"
                  style={{ borderColor: "color-mix(in srgb, var(--accent) 30%, transparent)", background: "color-mix(in srgb, var(--accent) 5%, transparent)" }}
                >
                  <div className="mono text-[10px] uppercase tracking-[0.1em] mb-1" style={{ color: "var(--accent)" }}>enterprise</div>
                  <div className="display text-[28px] font-semibold" style={{ color: "var(--t1)" }}>Custom</div>
                  <div className="mono text-[11px] mt-1" style={{ color: "var(--t3)" }}>10+ seats · custom integrations · DPA · SSO</div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact form */}
          <div className="max-w-lg">
            <EnterpriseContactForm />
          </div>
        </div>

        <Footer />
      </div>
    </>
  );
}
