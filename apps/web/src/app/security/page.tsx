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
    description: "How PledgeOFF protects your data. Encryption, RLS, responsible disclosure.",
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
  { label: "Encryption in transit",     desc: "All data is transmitted over TLS 1.2+. Every API call, every webhook, every browser session — encrypted end-to-end." },
  { label: "Encryption at rest",        desc: "Data stored in Supabase (Postgres on AWS) encrypted at rest with AES-256. GitHub OAuth tokens additionally encrypted at application layer with AES-256-GCM." },
  { label: "Authentication",            desc: "Email/password, Google OAuth, and GitHub OAuth via Supabase Auth. Short-lived JWTs. TOTP two-factor authentication available for all accounts." },
  { label: "Row-level security",        desc: "Every database table has Postgres RLS policies enforced at the database layer. Users can only access their own data — regardless of application code." },
  { label: "API key security",          desc: "API keys are hashed with SHA-256 before storage. Plaintext shown once at creation, never stored. Compromised keys revoked instantly." },
  { label: "Secret scanning",           desc: "GitHub repository has secret scanning enabled. Dependabot runs weekly. Critical CVEs patched within 24 hours." },
  { label: "Access control",            desc: "Production database access requires MFA and is restricted to named individuals. No shared credentials. Access reviewed quarterly." },
  { label: "Data residency",            desc: "All data processed and stored in the EU (AWS eu-central-1). No transfer outside EEA without appropriate safeguards." },
];

const SOC2_ROADMAP = [
  { label: "Structured audit logging",                     status: "live" },
  { label: "Uptime monitoring (BetterStack + Sentry)",     status: "live" },
  { label: "Row-level security on all tables",             status: "live" },
  { label: "Dependency scanning (Dependabot)",             status: "live" },
  { label: "Encryption at rest + application-layer token encryption", status: "live" },
  { label: "Incident runbook",                             status: "live" },
  { label: "Formal security policy documentation",         status: "planned" },
  { label: "Penetration test (third party)",               status: "planned" },
  { label: "SOC 2 Type I audit",                           status: "planned" },
  { label: "SOC 2 Type II certification",                  status: "planned" },
];

const SUB_PROCESSORS = [
  { name: "Supabase",    purpose: "Database, authentication, storage",     location: "EU (AWS eu-central-1)" },
  { name: "Vercel",      purpose: "Hosting, edge network",                 location: "Global CDN · primary EU" },
  { name: "Anthropic",   purpose: "AI model inference (Otto assistant)",   location: "US" },
  { name: "Groq",        purpose: "AI model inference (signal analysis)",  location: "US" },
  { name: "Stripe",      purpose: "Payment processing",                    location: "US / EU" },
  { name: "Resend",      purpose: "Transactional email",                   location: "US" },
  { name: "Sentry",      purpose: "Error monitoring",                      location: "US" },
];

export default function SecurityPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div style={{ background: "var(--bg)", color: "var(--ink)" }}>
        <PublicNav />

        <div className="w-page-sm" style={{ paddingTop: "52px", paddingBottom: "60px" }}>
          <span className="eye">Security</span>
          <h1 className="mkt-h2" style={{ marginBottom: "10px" }}>Your data is yours.</h1>
          <p className="mkt-lead" style={{ marginBottom: "40px" }}>
            We handle ideas that haven&apos;t shipped yet. That data is sensitive by definition. Here&apos;s exactly how we protect it.
          </p>

          {/* Security practices */}
          <div className="sec" style={{ marginBottom: "28px" }}>
            <div className="sec-hd">How we protect your data</div>
            <div className="sec-bd" style={{ padding: 0 }}>
              <div className="sec-grid" style={{ gap: 0, marginBottom: 0, background: "var(--line)" }}>
                {PRACTICES.map((p) => (
                  <div key={p.label} className="secc" style={{ border: "none" }}>
                    <div className="secc-nm">{p.label}</div>
                    <div className="secc-desc">{p.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SOC 2 roadmap */}
          <div className="sec" style={{ marginBottom: "28px" }}>
            <div className="sec-hd">SOC 2 roadmap</div>
            <div className="sec-bd">
              <p style={{ fontSize: "13.5px", color: "var(--dim)", marginBottom: "16px" }}>
                We are working toward SOC 2 Type II certification.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {SOC2_ROADMAP.map(({ label, status }) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span className="mono" style={{ fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", flexShrink: 0, width: "52px", color: status === "live" ? "var(--go)" : "var(--faint)" }}>
                      {status === "live" ? "Live" : "Planned"}
                    </span>
                    <span style={{ fontSize: "13px", color: status === "live" ? "var(--ink)" : "var(--dim)" }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Responsible disclosure */}
          <div className="sec" style={{ marginBottom: "28px" }}>
            <div className="sec-hd">Responsible disclosure</div>
            <div className="sec-bd">
              <p style={{ fontSize: "14px", color: "var(--dim)", lineHeight: 1.75, marginBottom: "12px" }}>
                If you discover a security vulnerability in PledgeOFF, please report it privately. We acknowledge within 48 hours and resolve confirmed issues within 14 days.
              </p>
              <p style={{ fontSize: "14px", color: "var(--dim)", lineHeight: 1.75, marginBottom: "16px" }}>
                Please do not publicly disclose vulnerabilities until we&apos;ve had a chance to address them. We credit researchers who report valid issues.
              </p>
              <a href="mailto:security@pledgeoff.com" className="btn-g">
                security@pledgeoff.com →
              </a>
            </div>
          </div>

          {/* Sub-processors */}
          <div className="sec">
            <div className="sec-hd">
              Sub-processors
              <span className="r">full list in Privacy Policy §5</span>
            </div>
            <div className="sec-bd" style={{ padding: 0 }}>
              {SUB_PROCESSORS.map(({ name, purpose, location }) => (
                <div
                  key={name}
                  style={{ display: "flex", gap: "16px", padding: "10px 22px", borderBottom: "1px solid var(--line-soft)", alignItems: "center" }}
                >
                  <span className="display" style={{ fontSize: "13px", fontWeight: 700, width: "80px", flexShrink: 0, color: "var(--ink)" }}>{name}</span>
                  <span style={{ fontSize: "13px", color: "var(--dim)", flex: 1 }}>{purpose}</span>
                  <span className="mono" style={{ fontSize: "10px", color: "var(--faint)", flexShrink: 0 }}>{location}</span>
                </div>
              ))}
              <div style={{ padding: "10px 22px" }}>
                <Link href="/privacy#s5" className="mono" style={{ fontSize: "10px", color: "var(--dim)", textDecoration: "underline", textUnderlineOffset: "3px" }}>
                  Full Privacy Policy →
                </Link>
              </div>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </>
  );
}
