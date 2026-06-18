import type { Metadata } from "next";
import { PublicNav } from "@/components/PublicNav";
import { Footer } from "@/components/Footer";
import { DecisionClarityClient } from "./DecisionClarityClient";

export const metadata: Metadata = {
  title: { absolute: "Decision-Clarity Score — Free Tool · PledgeOFF" },
  description:
    "Five questions. Two minutes. Understand how clearly you've defined your idea before you validate it. Free, no account needed.",
  alternates: { canonical: "https://pledgeoff.com/tools/decision-clarity" },
  openGraph: {
    title: "Decision-Clarity Score — Free Tool · PledgeOFF",
    description: "Five questions. Two minutes. Know how ready your idea is to validate.",
    url: "https://pledgeoff.com/tools/decision-clarity",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Decision-Clarity Score — PledgeOFF",
  description: "A five-question quiz that scores how clearly a founder has defined their product idea before validation.",
  url: "https://pledgeoff.com/tools/decision-clarity",
};

export default function DecisionClarityPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div style={{ background: "var(--bg)", color: "var(--ink)" }}>
        <PublicNav />
        <div className="w-page-xs" style={{ paddingTop: "52px", paddingBottom: "80px" }}>
          <span className="eye">Free tool · No account required</span>
          <h1 className="mkt-h2" style={{ marginBottom: "8px" }}>Decision-Clarity Score.</h1>
          <p className="mkt-lead" style={{ marginBottom: "36px" }}>
            Five questions. Two minutes. Understand how clearly you&apos;ve defined your idea before validating it.
          </p>
          <DecisionClarityClient />
        </div>
        <Footer />
      </div>
    </>
  );
}
