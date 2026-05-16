import type { Metadata } from "next";
import Link from "next/link";
import { PreLoginNav } from "@/components/PreLoginNav";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: { absolute: "About — PledgeOFF" },
  description:
    "PledgeOFF is a decision intelligence tool for founders. We fetch real signals from Reddit and GitHub, then give you a GO / KILL / PIVOT verdict in under 60 seconds.",
  alternates: { canonical: "https://pledgeoff.com/about" },
  openGraph: {
    title: "About — PledgeOFF",
    description:
      "PledgeOFF is a decision intelligence tool for founders. We fetch real signals from Reddit and GitHub, then give you a GO / KILL / PIVOT verdict in under 60 seconds.",
    url: "https://pledgeoff.com/about",
    type: "website",
  },
};

const webPageJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "About PledgeOFF",
  description:
    "PledgeOFF is a decision intelligence tool for founders. We fetch real signals from Reddit and GitHub, then give you a GO / KILL / PIVOT verdict in under 60 seconds.",
  url: "https://pledgeoff.com/about",
  publisher: {
    "@type": "Organization",
    name: "PledgeOFF",
    url: "https://pledgeoff.com",
  },
};

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }}
      />
      <div style={{ background: "var(--canvas)", color: "var(--t1)" }}>
        <PreLoginNav />

        <main className="max-w-2xl mx-auto px-6 pt-20 pb-32">
          {/* Label */}
          <div className="mono text-[10px] uppercase tracking-wider mb-4" style={{ color: "var(--t3)" }}>
            About
          </div>

          <h1
            className="display font-bold leading-[1.05]"
            style={{ fontSize: "40px", letterSpacing: "-0.04em", color: "var(--t1)" }}
          >
            Built to kill bad ideas early.
          </h1>

          <p className="mt-6 text-[16px] leading-relaxed" style={{ color: "var(--t2)" }}>
            Most founders spend months building something nobody wants.
            Not because they&apos;re lazy — because validation is slow, scattered, and uncomfortable.
          </p>

          <p className="mt-4 text-[16px] leading-relaxed" style={{ color: "var(--t2)" }}>
            PledgeOFF fixes that. You write your idea. We fetch real signals from Reddit and GitHub —
            complaints, feature requests, demand patterns — and an AI returns a single verdict:
            <span style={{ color: "var(--validated)" }}> GO</span>,
            <span style={{ color: "var(--kill)" }}> KILL</span>, or
            <span style={{ color: "var(--caution)" }}> PIVOT</span>.
            In under 60 seconds. With sources.
          </p>

          <p className="mt-4 text-[16px] leading-relaxed" style={{ color: "var(--t2)" }}>
            No surveys. No landing pages. No guessing.
            Just the evidence that already exists — surfaced and structured for you.
          </p>

          {/* Divider */}
          <div className="my-12 h-px" style={{ background: "var(--border)" }} />

          {/* How it works */}
          <h2
            className="display font-semibold mb-6"
            style={{ fontSize: "22px", color: "var(--t1)" }}
          >
            How it works
          </h2>

          <div className="space-y-5">
            {[
              { step: "01", label: "You describe your idea", desc: "Free text. No format required. One sentence or a paragraph — both work." },
              { step: "02", label: "We fetch the signals", desc: "Reddit threads, GitHub issues, complaint patterns, demand signals. Real data, not synthetic." },
              { step: "03", label: "AI generates the verdict", desc: "GO / KILL / PIVOT — with a confidence score, reasoning, and per-source breakdown." },
              { step: "04", label: "You decide in seconds", desc: "Kill the idea before you waste months. Or validate it before you talk to investors." },
            ].map(({ step, label, desc }) => (
              <div key={step} className="flex gap-5">
                <div className="mono text-[11px] pt-0.5 shrink-0" style={{ color: "var(--t3)" }}>{step}</div>
                <div>
                  <div className="display text-[15px] font-semibold" style={{ color: "var(--t1)" }}>{label}</div>
                  <div className="text-[13px] mt-1 leading-relaxed" style={{ color: "var(--t2)" }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="my-12 h-px" style={{ background: "var(--border)" }} />

          {/* Contact */}
          <h2
            className="display font-semibold mb-4"
            style={{ fontSize: "22px", color: "var(--t1)" }}
          >
            Get in touch
          </h2>

          <div className="space-y-3">
            {[
              { label: "General", email: "contact@pledgeoff.com" },
              { label: "Partnerships & affiliate", email: "partnerships@pledgeoff.com" },
              { label: "Press", email: "hello@pledgeoff.com" },
            ].map(({ label, email }) => (
              <div key={email} className="flex items-center gap-4">
                <span className="mono text-[11px] w-40" style={{ color: "var(--t3)" }}>{label}</span>
                <a
                  href={`mailto:${email}`}
                  className="text-[13px] underline transition-colors hover:opacity-70"
                  style={{ color: "var(--t2)" }}
                >
                  {email}
                </a>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div
            className="mt-16 rounded-md border p-6"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          >
            <div className="display font-semibold leading-tight" style={{ fontSize: "20px", color: "var(--t1)" }}>
              Validate your idea now.
            </div>
            <p className="text-[13px] mt-2 leading-relaxed" style={{ color: "var(--t2)" }}>
              1 free validation every month. No card required.
            </p>
            <Link
              href="/ideas/new"
              className="mt-5 inline-flex items-center gap-2 h-10 px-5 rounded-md display text-[13px] font-semibold transition-opacity hover:opacity-90"
              style={{ background: "var(--accent)", color: "#000" }}
            >
              Run a validation →
            </Link>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
