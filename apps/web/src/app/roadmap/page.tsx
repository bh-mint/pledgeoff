import type { Metadata } from "next";
import Link from "next/link";
import { PublicNav } from "@/components/PublicNav";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: { absolute: "Roadmap — PledgeOFF" },
  description:
    "What's live, what's in progress, and what's next for PledgeOFF. A public view of our product direction.",
  alternates: { canonical: "https://pledgeoff.com/roadmap" },
  openGraph: {
    title: "Roadmap — PledgeOFF",
    description:
      "What's live, what's in progress, and what's next for PledgeOFF.",
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
  // Live
  {
    label: "Signal Verdict",
    desc: "Submit an idea, get a GO / KILL / PIVOT verdict in under 60 seconds. Backed by Reddit, GitHub, and HN signals.",
    status: "live",
    tag: "Core",
  },
  {
    label: "Decision Intelligence tools",
    desc: "ICP Analysis, Revenue Model, Build Spec, Competitive Landscape, GTM Brief, Page Brief — all generated from your idea.",
    status: "live",
    tag: "Core",
  },
  {
    label: "Otto — AI assistant",
    desc: "Conversational AI with full context of your idea and verdict. Ask follow-up questions, explore edge cases.",
    status: "live",
    tag: "AI",
  },
  {
    label: "Decision Queue",
    desc: "Automatic prioritization of your idea backlog. Daily AI analysis ranks ideas by GO potential and market timing.",
    status: "live",
    tag: "Intelligence",
  },
  {
    label: "Engineering Intelligence",
    desc: "Connect GitHub to see your team's velocity, delivery estimates, and bottleneck detection per idea.",
    status: "live",
    tag: "Intelligence",
  },
  {
    label: "Data Flywheel",
    desc: "Record outcomes on your ideas after 30 days. Accuracy score tracks how well our verdicts predict reality.",
    status: "live",
    tag: "Intelligence",
  },
  {
    label: "Team workspaces",
    desc: "Invite members, share ideas, assign roles. Admin and owner permission levels.",
    status: "live",
    tag: "Collaboration",
  },
  {
    label: "In-app notifications",
    desc: "Queue updates, accuracy reports, and workspace alerts delivered inside the app.",
    status: "live",
    tag: "Product",
  },
  {
    label: "TOTP two-factor authentication",
    desc: "Secure your account with any TOTP app (Google Authenticator, Authy, 1Password).",
    status: "live",
    tag: "Security",
  },
  {
    label: "GitHub OAuth login",
    desc: "Sign in with GitHub alongside Google OAuth and email/password.",
    status: "live",
    tag: "Auth",
  },
  // In progress / Next
  {
    label: "Webhook outbound",
    desc: "POST to your endpoint when a verdict is ready. For Zapier, Make, and custom integrations.",
    status: "next",
    tag: "API",
  },
  {
    label: "PWA / installable app",
    desc: "Install PledgeOFF from your browser on mobile. Offline-ready manifest, home screen icon.",
    status: "next",
    tag: "Mobile",
  },
  {
    label: "Enterprise domain allowlist",
    desc: "Auto-join workspace on signup for any email @yourdomain.com. Designed for teams of 50+.",
    status: "next",
    tag: "Enterprise",
  },
  // Considering
  {
    label: "Public username & verdict profiles",
    desc: "Share your GO verdicts publicly under @yourname. Opt-in. Builds credibility in communities.",
    status: "considering",
    tag: "Social",
  },
  {
    label: "Bulk invite",
    desc: "Invite up to 200 team members at once via CSV. For agencies onboarding entire product orgs.",
    status: "considering",
    tag: "Enterprise",
  },
  {
    label: "Slack integration",
    desc: "Receive verdict alerts and queue digests in a Slack channel.",
    status: "considering",
    tag: "Integrations",
  },
];

const STATUS_CONFIG: Record<Status, { label: string; color: string }> = {
  live: { label: "Live", color: "var(--validated)" },
  "in-progress": { label: "In progress", color: "var(--caution)" },
  next: { label: "Coming next", color: "var(--accent)" },
  considering: { label: "Considering", color: "var(--t3)" },
};

const STATUS_ORDER: Status[] = ["live", "in-progress", "next", "considering"];

export default function RoadmapPage() {
  const grouped = STATUS_ORDER.reduce<Record<Status, typeof ITEMS>>(
    (acc, s) => {
      acc[s] = ITEMS.filter((i) => i.status === s);
      return acc;
    },
    { live: [], "in-progress": [], next: [], considering: [] },
  );

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
              Product roadmap
            </div>

            <h1
              className="display font-bold leading-[1.05]"
              style={{ fontSize: "40px", letterSpacing: "-0.04em", color: "var(--t1)" }}
            >
              Where we&apos;re going.
            </h1>

            <p className="mt-6 text-[16px] leading-relaxed" style={{ color: "var(--t2)" }}>
              This is a public view of what&apos;s live, what&apos;s coming next, and what we&apos;re
              still evaluating. We update this as priorities shift.
            </p>

            <p className="mt-3 text-[14px]" style={{ color: "var(--t3)" }}>
              Have a feature request?{" "}
              <Link
                href="/contact"
                className="underline underline-offset-2 hover:opacity-70"
                style={{ color: "var(--t2)" }}
              >
                Tell us what you need.
              </Link>
            </p>

            {/* Legend */}
            <div className="mt-8 flex flex-wrap gap-4">
              {STATUS_ORDER.map((s) => (
                <div key={s} className="flex items-center gap-1.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: STATUS_CONFIG[s].color }}
                    aria-hidden="true"
                  />
                  <span className="mono text-[11px]" style={{ color: "var(--t2)" }}>
                    {STATUS_CONFIG[s].label}
                  </span>
                </div>
              ))}
            </div>

            {/* Sections */}
            {STATUS_ORDER.map((status) => {
              const items = grouped[status];
              if (items.length === 0) return null;
              const cfg = STATUS_CONFIG[status];
              return (
                <div key={status}>
                  {/* Divider */}
                  <div className="my-10 h-px" style={{ background: "var(--border)" }} />

                  <h2
                    className="display font-semibold mb-6 flex items-center gap-2"
                    style={{ fontSize: "18px", color: "var(--t1)" }}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: cfg.color }}
                      aria-hidden="true"
                    />
                    {cfg.label}
                    <span className="mono text-[11px] font-normal" style={{ color: "var(--t3)" }}>
                      {items.length}
                    </span>
                  </h2>

                  <div className="space-y-4">
                    {items.map(({ label, desc, tag }) => (
                      <div
                        key={label}
                        className="rounded-md border p-4"
                        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="display text-[14px] font-semibold" style={{ color: "var(--t1)" }}>
                            {label}
                          </div>
                          {tag && (
                            <span
                              className="mono text-[10px] uppercase tracking-wider shrink-0 px-1.5 py-0.5 rounded"
                              style={{
                                color: "var(--t3)",
                                background: "var(--canvas)",
                                border: "1px solid var(--border)",
                              }}
                            >
                              {tag}
                            </span>
                          )}
                        </div>
                        <div className="text-[13px] mt-1.5 leading-relaxed" style={{ color: "var(--t2)" }}>
                          {desc}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Divider */}
            <div className="my-12 h-px" style={{ background: "var(--border)" }} />

            {/* CTA */}
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/ideas/new"
                className="inline-flex items-center gap-2 h-10 px-5 rounded-md display text-[13px] font-semibold transition-opacity hover:opacity-90"
                style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
              >
                Try it now →
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 h-10 px-4 rounded-md display text-[13px] font-medium transition-opacity hover:opacity-80 border"
                style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--t1)" }}
              >
                Request a feature
              </Link>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
