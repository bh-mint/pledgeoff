import type { Metadata } from "next";
import { PublicNav } from "@/components/PublicNav";
import { Footer } from "@/components/Footer";
import { DecisionClarityClient } from "./DecisionClarityClient";

export const metadata: Metadata = {
  title: { absolute: "Decision Clarity Tool — PledgeOFF" },
  description:
    "Answer 5 questions about a decision you've been avoiding. Get a clarity score and 3 concrete next steps — free, no account required.",
  alternates: { canonical: "https://pledgeoff.com/tools/decision-clarity" },
  openGraph: {
    title: "Decision Clarity Tool — PledgeOFF",
    description:
      "Answer 5 questions. Get a clarity score and 3 concrete next steps.",
    url: "https://pledgeoff.com/tools/decision-clarity",
    type: "website",
  },
  robots: { index: true, follow: true },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Decision Clarity Tool — PledgeOFF",
  description:
    "Answer 5 questions about a decision you've been avoiding. Get a clarity score and 3 concrete next steps.",
  url: "https://pledgeoff.com/tools/decision-clarity",
};

export default function DecisionClarityPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PublicNav />
      <main
        className="min-h-screen flex flex-col items-center px-4 py-16"
        style={{ background: "var(--canvas)" }}
      >
        <div className="w-full max-w-xl">
          <div className="mb-10 text-center">
            <p
              className="mono text-[11px] uppercase tracking-[0.14em] mb-3"
              style={{ color: "var(--accent)" }}
            >
              Free tool
            </p>
            <h1
              className="font-serif text-3xl md:text-4xl mb-4 leading-tight"
              style={{ color: "var(--t1)" }}
            >
              Decision Clarity
            </h1>
            <p className="text-base" style={{ color: "var(--t2)" }}>
              5 questions. A clarity score. 3 concrete next steps.
              <br />
              No account required.
            </p>
          </div>
          <DecisionClarityClient />
        </div>
      </main>
      <Footer />
    </>
  );
}
