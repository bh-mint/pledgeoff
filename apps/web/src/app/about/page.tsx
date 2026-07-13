import type { Metadata } from "next";
import Link from "next/link";
import { PublicNav } from "@/components/PublicNav";
import { Footer } from "@/components/Footer";
import { Reveal } from "@/components/motion/Reveal";

export const metadata: Metadata = {
  title: { absolute: "About — PledgeOFF" },
  description:
    "PledgeOFF exists because validation should take 15 seconds, not 15 weeks. Real signals from Hacker News, Dev.to, GitHub, Reddit, and the web — with every source cited.",
  alternates: { canonical: "https://pledgeoff.com/about" },
  openGraph: {
    title: "About — PledgeOFF",
    description:
      "PledgeOFF exists because validation should take 15 seconds, not 15 weeks. Real signals, traceable sources, a verdict you can act on.",
    url: "https://pledgeoff.com/about",
    type: "website",
    images: [
      {
        url: "https://pledgeoff.com/api/og?type=home",
        width: 1200,
        height: 630,
        alt: "About PledgeOFF — Decision Intelligence for Founders",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "About — PledgeOFF",
    description:
      "PledgeOFF exists because validation should take 15 seconds, not 15 weeks. Real signals, traceable sources, a verdict you can act on.",
    images: ["https://pledgeoff.com/api/og?type=home"],
  },
};

const webPageJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "About PledgeOFF",
  description:
    "PledgeOFF is a decision intelligence platform for founders. Real signals from Hacker News, Dev.to, GitHub, Reddit, and the web — a GO / PIVOT / KILL verdict in ~15 seconds.",
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
      <div style={{ background: "var(--bg)", color: "var(--ink)" }}>
        <PublicNav />

        <div className="w-bleed" style={{ paddingTop: "52px", paddingBottom: "60px" }}>
          <span className="eye">About</span>
          <h1 className="mkt-h2" style={{ marginBottom: "20px" }}>
            We got tired of building the wrong things.
          </h1>

          <div className="art-body" style={{ marginBottom: "40px" }}>
            <p>
              PledgeOFF exists because the standard advice — &ldquo;talk to customers&rdquo;, &ldquo;build a landing page&rdquo;, &ldquo;find ten paying users&rdquo; — takes weeks and requires skills most early-stage founders don&apos;t have yet. By the time you&apos;ve done it right, you&apos;ve either lost momentum or built too much to pivot.
            </p>
            <p>
              The question &ldquo;is this a real problem?&rdquo; has always had an answer buried in public data. Hacker News threads, GitHub issue trackers, Reddit complaints, developer forums, industry blogs. The signal is there. It just takes hours to find and weeks to synthesise honestly.
            </p>
            <p>
              PledgeOFF automates that synthesis. You get a structured verdict — not a chatbot&apos;s guess, not an AI hallucination, but a scoring system grounded in real public signals with every source cited. GO, PIVOT, or KILL. In fifteen seconds.
            </p>
            <Reveal>
              <blockquote>
                &ldquo;The goal is never to tell founders what to do. It&apos;s to remove the excuse for not knowing what the evidence says.&rdquo;
              </blockquote>
            </Reveal>
            <p>
              We charge for it because the infrastructure to scrape, parse, weight, and summarise signals at this quality has real costs. The free tier exists because we want the verdict to be available to everyone before they decide to commit. If you never upgrade, that&apos;s fine — one honest verdict per month is still more than most people get.
            </p>
          </div>

          <div className="sec" style={{ marginBottom: "32px" }}>
            <div className="sec-hd">What we believe</div>
            <div className="sec-bd" style={{ padding: 0 }}>
              <div className="how-row">
                <div className="how-no">—</div>
                <div className="how-body">
                  <div className="how-title">Evidence over intuition</div>
                  <div className="how-desc">Your instincts matter. But they&apos;re incomplete. The verdict uses both.</div>
                </div>
              </div>
              <div className="how-row">
                <div className="how-no">—</div>
                <div className="how-body">
                  <div className="how-title">Sources, always</div>
                  <div className="how-desc">Every signal in a verdict links to its source. You can read the thread, the GitHub issue, the forum post. Nothing is asserted without a citation.</div>
                </div>
              </div>
              <div className="how-row">
                <div className="how-no">—</div>
                <div className="how-body">
                  <div className="how-title">KILL is not failure</div>
                  <div className="how-desc">A KILL verdict is the product working correctly. Finding out early — before you&apos;ve built anything — is the entire point.</div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div style={{ marginTop: "32px", display: "flex", gap: "24px", flexWrap: "wrap" }}>
            {[
              { label: "General / Press", email: "hello@pledgeoff.com" },
              { label: "Billing", email: "billing@pledgeoff.com" },
            ].map(({ label, email }) => (
              <div key={email}>
                <div className="mono" style={{ fontSize: "8px", letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--faint)", marginBottom: "4px" }}>
                  {label}
                </div>
                <a href={`mailto:${email}`} className="mono" style={{ fontSize: "12px", color: "var(--dim)", textDecoration: "underline", textUnderlineOffset: "3px" }}>
                  {email}
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* CTA band */}
        <div className="cta-band">
          <div style={{ maxWidth: "820px", margin: "0 auto" }}>
            <span className="cta-eye">PledgeOFF · Decision intelligence</span>
            <h2 className="cta-h">Know before you build.</h2>
            <p className="cta-sub">Your next idea is a 15-second validation away. The first one is always free.</p>
            <div className="btns">
              <Link href="/ideas/new" className="btn-inv">Validate free →</Link>
              <Link href="/pricing" className="btn-inv-g">Compare plans</Link>
            </div>
            <p className="cta-note">No credit card · Free account in 30s · Cancel any time</p>
          </div>
        </div>

        <Footer />
      </div>
    </>
  );
}
