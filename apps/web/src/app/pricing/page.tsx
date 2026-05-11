import type { Metadata } from "next";
import { PricingClient } from "./PricingClient";

export const metadata: Metadata = {
  title: "Pricing — PledgeOFF",
  description:
    "Free until you're sure. Then €19.99/mo. Validate unlimited ideas, access all signal sources, and stop wasting months on bad bets.",
  alternates: { canonical: "https://pledgeoff.com/pricing" },
  openGraph: {
    title: "Pricing — PledgeOFF",
    description: "Free until you're sure. Then €19.99/mo.",
    url: "https://pledgeoff.com/pricing",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Pricing — PledgeOFF",
  description: "Free until you're sure. Then €19.99/mo. Validate unlimited startup ideas with real Reddit and trend signals.",
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
