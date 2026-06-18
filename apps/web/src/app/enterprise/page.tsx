import type { Metadata } from "next";
import Link from "next/link";
import { PublicNav } from "@/components/PublicNav";
import { Footer } from "@/components/Footer";
import { EnterpriseContactForm } from "./EnterpriseContactForm";

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

export default function EnterprisePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div style={{ background: "var(--bg)", color: "var(--ink)" }}>
        <PublicNav />

        <div className="w-page-sm" style={{ paddingTop: "52px", paddingBottom: "60px" }}>
          <span className="eye">Enterprise</span>
          <h1 className="mkt-h2" style={{ marginBottom: "10px" }}>
            Built for teams that validate at scale.
          </h1>
          <p className="mkt-lead" style={{ marginBottom: "40px", maxWidth: "56ch" }}>
            Custom limits, audit-grade logging, NET30 invoicing, and a direct line to the team. No self-serve friction.
          </p>

          <div className="sec-grid" style={{ marginBottom: "32px" }}>
            {[
              { nm: "Unlimited everything",         desc: "No monthly caps on validations, Otto, or intelligence tools. Run as many as your team needs without watching a counter." },
              { nm: "Audit log",                    desc: "A tamper-evident record of every action — who ran what, when, and from which IP. Exportable as a signed PDF." },
              { nm: "SSO / SAML (coming Q4 2026)", desc: "Log in with your existing identity provider. Okta, Google Workspace, Microsoft Entra. Enterprise provisioning supported." },
              { nm: "Domain allowlist",             desc: "Anyone with a verified email from your domain joins automatically. No invite link management required." },
              { nm: "NET30 invoicing",              desc: "Pay invoices 30 days after issue. No credit card on file required. Invoices delivered by email and accessible in the billing portal." },
              { nm: "Dedicated support",            desc: "A named account manager, Slack or email access, and response SLAs written into your contract." },
            ].map((f) => (
              <div key={f.nm} className="secc">
                <div className="secc-nm">{f.nm}</div>
                <div className="secc-desc">{f.desc}</div>
              </div>
            ))}
          </div>

          <div className="sec">
            <div className="sec-hd">Contact sales</div>
            <div className="sec-bd">
              <EnterpriseContactForm />
            </div>
          </div>

          <div style={{ marginTop: "24px" }}>
            <Link href="/pricing" className="mono" style={{ fontSize: "10px", color: "var(--dim)", textDecoration: "underline", textUnderlineOffset: "3px" }}>
              ← See all plans &amp; pricing
            </Link>
          </div>
        </div>

        <Footer />
      </div>
    </>
  );
}
