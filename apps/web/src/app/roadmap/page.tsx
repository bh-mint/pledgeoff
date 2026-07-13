import type { Metadata } from "next";
import Link from "next/link";
import { PublicNav } from "@/components/PublicNav";
import { Footer } from "@/components/Footer";
import { Reveal } from "@/components/motion/Reveal";

export const metadata: Metadata = {
  title: { absolute: "Roadmap — PledgeOFF" },
  description:
    "What's live, what's in progress, and what's next for PledgeOFF. A public view of our product direction.",
  alternates: { canonical: "https://pledgeoff.com/roadmap" },
  openGraph: {
    title: "Roadmap — PledgeOFF",
    description: "What's live, what's in progress, and what's next for PledgeOFF.",
    url: "https://pledgeoff.com/roadmap",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Roadmap — PledgeOFF",
  description: "Public product roadmap for PledgeOFF.",
  url: "https://pledgeoff.com/roadmap",
};

type Status = "live" | "in-progress" | "next" | "considering";

const ITEMS: { label: string; desc: string; status: Status; tag?: string }[] = [
  { label: "Signal Verdict",             desc: "Submit an idea, get a GO / KILL / PIVOT verdict in under 60 seconds. Backed by Reddit, GitHub, HN, Dev.to, and Brave signals.", status: "live",       tag: "Core" },
  { label: "Decision Intelligence tools", desc: "ICP Analysis, Revenue Model, Build Spec, Competitive Landscape, GTM Brief, Page Brief — all generated from your idea.",         status: "live",       tag: "Core" },
  { label: "Otto — AI assistant",         desc: "Conversational AI with full context of your idea and verdict. Ask follow-up questions, explore edge cases.",                      status: "live",       tag: "AI" },
  { label: "Decision Queue",              desc: "Automatic prioritization of your idea backlog. Daily AI analysis ranks ideas by GO potential and market timing.",                 status: "live",       tag: "Intelligence" },
  { label: "Data Flywheel",               desc: "Record outcomes on your ideas after 30 days. Accuracy score tracks how well verdicts predict reality.",                           status: "live",       tag: "Intelligence" },
  { label: "Team workspaces",             desc: "Invite members, share ideas, assign roles. Admin and owner permission levels.",                                                   status: "live",       tag: "Collaboration" },
  { label: "API keys",                    desc: "Programmatic access to all validation endpoints via X-API-Key header.",                                                          status: "live",       tag: "API" },
  { label: "TOTP two-factor auth",        desc: "Secure your account with any TOTP app (Google Authenticator, Authy, 1Password).",                                               status: "live",       tag: "Security" },
  { label: "Webhook outbound",            desc: "POST to your endpoint when a verdict is ready. For Zapier, Make, and custom integrations.",                                      status: "next",       tag: "API" },
  { label: "PWA / installable app",       desc: "Install PledgeOFF from your browser on mobile. Offline-ready manifest, home screen icon.",                                      status: "next",       tag: "Mobile" },
  { label: "Enterprise domain allowlist", desc: "Auto-join workspace on signup for any email @yourdomain.com.",                                                                  status: "next",       tag: "Enterprise" },
  { label: "SSO / SAML",                  desc: "Log in with Okta, Google Workspace, or Microsoft Entra. Enterprise provisioning.",                                              status: "next",       tag: "Enterprise" },
  { label: "Public verdict profiles",     desc: "Share your GO verdicts publicly under @yourname. Builds credibility in communities.",                                           status: "considering", tag: "Social" },
  { label: "Slack integration",           desc: "Receive verdict alerts and queue digests in a Slack channel.",                                                                  status: "considering", tag: "Integrations" },
  { label: "Bulk invite",                 desc: "Invite up to 200 team members at once via CSV. For agencies onboarding entire product orgs.",                                   status: "considering", tag: "Enterprise" },
];

const STATUS_CONFIG: Record<Status, { label: string; tag: string }> = {
  live:         { label: "Live",        tag: "live"      },
  "in-progress":{ label: "In progress", tag: "soon"      },
  next:         { label: "Coming next", tag: "soon"      },
  considering:  { label: "Considering", tag: "later"     },
};

const STATUS_ORDER: Status[] = ["live", "in-progress", "next", "considering"];

export default function RoadmapPage() {
  const grouped = STATUS_ORDER.reduce<Record<Status, typeof ITEMS>>(
    (acc, s) => { acc[s] = ITEMS.filter((i) => i.status === s); return acc; },
    { live: [], "in-progress": [], next: [], considering: [] },
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div style={{ background: "var(--bg)", color: "var(--ink)" }}>
        <PublicNav />

        <div className="w-bleed" style={{ paddingTop: "52px", paddingBottom: "60px" }}>
          <span className="eye">Product roadmap</span>
          <h1 className="mkt-h2" style={{ marginBottom: "10px" }}>Where we&apos;re going.</h1>
          <p className="mkt-lead" style={{ marginBottom: "8px", maxWidth: "56ch" }}>
            Public view of what&apos;s live, what&apos;s coming next, and what we&apos;re still evaluating.
          </p>
          <p className="mono" style={{ fontSize: "11px", color: "var(--faint)", marginBottom: "36px" }}>
            Have a request?{" "}
            <Link href="/contact" style={{ color: "var(--dim)", textDecoration: "underline", textUnderlineOffset: "3px" }}>
              Tell us what you need.
            </Link>
          </p>

          {STATUS_ORDER.map((status, i) => {
            const items = grouped[status];
            if (items.length === 0) return null;
            const cfg = STATUS_CONFIG[status];
            return (
              <Reveal key={status} delayMs={i * 80}>
                <div className="sec" style={{ marginBottom: "20px" }}>
                  <div className="sec-hd">
                    {cfg.label}
                    <span className="r">{items.length} items</span>
                  </div>
                  <div className="sec-bd" style={{ padding: 0 }}>
                    {items.map(({ label, desc, tag }) => (
                      <div key={label} className="rm-item" style={{ padding: "16px 22px" }}>
                        <div>
                          {tag && <span className={`rm-tag${status === "next" || status === "in-progress" ? " soon" : ""}`}>{tag}</span>}
                        </div>
                        <div>
                          <div className="rm-nm">{label}</div>
                          <div className="rm-desc">{desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>
            );
          })}

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "32px" }}>
            <Link href="/ideas/new" className="btn-p">Try it now →</Link>
            <Link href="/contact" className="btn-g">Request a feature</Link>
          </div>
        </div>

        <Footer />
      </div>
    </>
  );
}
