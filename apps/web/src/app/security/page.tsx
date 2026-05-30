import type { Metadata } from "next";
import Link from "next/link";
import { PublicNav } from "@/components/PublicNav";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: { absolute: "Security — PledgeOFF" },
  description:
    "How PledgeOFF protects your data. Encryption at rest and in transit, responsible disclosure policy, and our SOC 2 roadmap.",
  alternates: { canonical: "https://pledgeoff.com/security" },
  openGraph: {
    title: "Security — PledgeOFF",
    description:
      "How PledgeOFF protects your data. Encryption at rest and in transit, responsible disclosure policy, and our SOC 2 roadmap.",
    url: "https://pledgeoff.com/security",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Security — PledgeOFF",
  description: "PledgeOFF security practices, encryption, and responsible disclosure policy.",
  url: "https://pledgeoff.com/security",
};

const PRACTICES = [
  {
    label: "Encryption in transit",
    desc: "All data is transmitted over TLS 1.2+. Every API call, every webhook, every browser session — encrypted end-to-end. We do not support non-HTTPS access.",
  },
  {
    label: "Encryption at rest",
    desc: "Your data is stored in Supabase (Postgres on AWS), which encrypts all data at rest using AES-256. GitHub OAuth tokens are additionally encrypted with AES-256-GCM at the application layer before being stored.",
  },
  {
    label: "Authentication",
    desc: "We support email/password, Google OAuth, and GitHub OAuth via Supabase Auth. All sessions use short-lived JWTs. TOTP two-factor authentication is available for all accounts.",
  },
  {
    label: "Row-level security",
    desc: "Every database table has Postgres RLS policies enforced at the database layer. Users can only access their own data — regardless of what the application code does.",
  },
  {
    label: "API key security",
    desc: "API keys are hashed with SHA-256 before storage. The plaintext key is shown once at creation and never stored. Compromised keys can be revoked instantly.",
  },
  {
    label: "Secret scanning",
    desc: "Our GitHub repository has secret scanning enabled. Dependabot runs weekly. We track CVEs in all dependencies and patch critical vulnerabilities within 24 hours.",
  },
  {
    label: "Access control",
    desc: "Production database access requires multi-factor authentication and is restricted to named individuals. No shared credentials. Access is reviewed quarterly.",
  },
  {
    label: "Data residency",
    desc: "All data is processed and stored in the EU (AWS eu-central-1). We do not transfer personal data outside the EEA without appropriate safeguards as defined in our Privacy Policy.",
  },
];

const SOC2_ROADMAP = [
  { label: "Structured audit logging", status: "live" },
  { label: "Uptime monitoring (BetterStack + Sentry)", status: "live" },
  { label: "Row-level security on all tables", status: "live" },
  { label: "Dependency scanning (Dependabot)", status: "live" },
  { label: "Encryption at rest + application-layer token encryption", status: "live" },
  { label: "Incident runbook", status: "live" },
  { label: "Formal security policy documentation", status: "planned" },
  { label: "Penetration test (third party)", status: "planned" },
  { label: "SOC 2 Type I audit", status: "planned" },
  { label: "SOC 2 Type II certification", status: "planned" },
];

export default function SecurityPage() {
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
              Security
            </div>

            <h1
              className="display font-bold leading-[1.05]"
              style={{ fontSize: "40px", letterSpacing: "-0.04em", color: "var(--t1)" }}
            >
              Your data is yours.
            </h1>

            <p className="mt-6 text-[16px] leading-relaxed" style={{ color: "var(--t2)" }}>
              We handle ideas that haven&apos;t shipped yet. That data is sensitive by definition.
              Here&apos;s exactly how we protect it.
            </p>

            {/* Divider */}
            <div className="my-12 h-px" style={{ background: "var(--border)" }} />

            {/* Security practices */}
            <h2
              className="display font-semibold mb-6"
              style={{ fontSize: "22px", color: "var(--t1)" }}
            >
              How we protect your data
            </h2>

            <div className="space-y-6">
              {PRACTICES.map(({ label, desc }) => (
                <div key={label}>
                  <div className="display text-[14px] font-semibold mb-1" style={{ color: "var(--t1)" }}>
                    {label}
                  </div>
                  <div className="text-[13px] leading-relaxed" style={{ color: "var(--t2)" }}>
                    {desc}
                  </div>
                </div>
              ))}
            </div>

            {/* Divider */}
            <div className="my-12 h-px" style={{ background: "var(--border)" }} />

            {/* SOC 2 Roadmap */}
            <h2
              className="display font-semibold mb-2"
              style={{ fontSize: "22px", color: "var(--t1)" }}
            >
              SOC 2 roadmap
            </h2>
            <p className="text-[13px] mb-6 leading-relaxed" style={{ color: "var(--t2)" }}>
              We are working toward SOC 2 Type II certification. Here&apos;s where we are today.
            </p>

            <div className="space-y-3">
              {SOC2_ROADMAP.map(({ label, status }) => (
                <div key={label} className="flex items-center gap-3">
                  <span
                    className="mono text-[10px] uppercase tracking-wider shrink-0 w-14"
                    style={{ color: status === "live" ? "var(--validated)" : "var(--t3)" }}
                  >
                    {status === "live" ? "Live" : "Planned"}
                  </span>
                  <span className="text-[13px]" style={{ color: status === "live" ? "var(--t1)" : "var(--t2)" }}>
                    {label}
                  </span>
                </div>
              ))}
            </div>

            {/* Divider */}
            <div className="my-12 h-px" style={{ background: "var(--border)" }} />

            {/* Responsible disclosure */}
            <h2
              className="display font-semibold mb-4"
              style={{ fontSize: "22px", color: "var(--t1)" }}
            >
              Responsible disclosure
            </h2>

            <p className="text-[13px] leading-relaxed mb-4" style={{ color: "var(--t2)" }}>
              If you discover a security vulnerability in PledgeOFF, please report it to us privately.
              We will acknowledge your report within 48 hours and aim to resolve confirmed vulnerabilities
              within 14 days.
            </p>

            <p className="text-[13px] leading-relaxed mb-6" style={{ color: "var(--t2)" }}>
              Please do not publicly disclose vulnerabilities until we&apos;ve had a chance to address them.
              We appreciate responsible disclosure and will credit researchers who report valid issues.
            </p>

            <a
              href="mailto:security@pledgeoff.com"
              className="inline-flex items-center gap-2 h-9 px-4 rounded-md display text-[13px] font-medium transition-opacity hover:opacity-80 border"
              style={{
                borderColor: "var(--border)",
                background: "var(--surface)",
                color: "var(--t1)",
              }}
            >
              security@pledgeoff.com →
            </a>

            {/* Divider */}
            <div className="my-12 h-px" style={{ background: "var(--border)" }} />

            {/* Sub-processors */}
            <h2
              className="display font-semibold mb-4"
              style={{ fontSize: "22px", color: "var(--t1)" }}
            >
              Sub-processors
            </h2>

            <p className="text-[13px] leading-relaxed mb-6" style={{ color: "var(--t2)" }}>
              The following third-party services process data on our behalf.
              A full list is available in our{" "}
              <Link href="/privacy#s5" className="underline underline-offset-2 hover:opacity-70" style={{ color: "var(--t1)" }}>
                Privacy Policy §5
              </Link>
              .
            </p>

            <div className="space-y-3">
              {[
                { name: "Supabase", purpose: "Database, authentication, storage", location: "EU (AWS eu-central-1)" },
                { name: "Vercel", purpose: "Hosting, edge network", location: "Global CDN · primary EU" },
                { name: "Anthropic", purpose: "AI model inference (Otto assistant)", location: "US" },
                { name: "Groq", purpose: "AI model inference (signal analysis)", location: "US" },
                { name: "Stripe", purpose: "Payment processing", location: "US / EU" },
                { name: "Resend", purpose: "Transactional email", location: "US" },
                { name: "Sentry", purpose: "Error monitoring", location: "US" },
              ].map(({ name, purpose, location }) => (
                <div key={name} className="flex gap-4 text-[13px]">
                  <span className="display font-semibold shrink-0 w-24" style={{ color: "var(--t1)" }}>{name}</span>
                  <span className="flex-1" style={{ color: "var(--t2)" }}>{purpose}</span>
                  <span className="mono text-[11px] shrink-0" style={{ color: "var(--t3)" }}>{location}</span>
                </div>
              ))}
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
