import type { Metadata } from "next";
import { PricingClient } from "./PricingClient";

export const metadata: Metadata = {
  title: "Pricing — PledgeOFF",
  description:
    "Free until you're sure. Then €39/mo for Pro or €79/mo for Pro+. Validate ideas with real signals from Reddit, GitHub, HN, and more.",
  alternates: { canonical: "https://pledgeoff.com/pricing" },
  openGraph: {
    title: "Pricing — PledgeOFF",
    description: "Free until you're sure. Then €39/mo for Pro or €79/mo for Pro+.",
    url: "https://pledgeoff.com/pricing",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Pricing — PledgeOFF",
  description: "Free until you're sure. Then €39/mo for Pro. Validate startup ideas with real Reddit, GitHub, and HN signals.",
  url: "https://pledgeoff.com/pricing",
};

export default function PricingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PricingClient />
    </>
  );
}
