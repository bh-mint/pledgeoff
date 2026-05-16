import type { Metadata } from "next";
import { PricingClient } from "./PricingClient";
import { PRICING } from "@/lib/pricing.config";

export const metadata: Metadata = {
  title: { absolute: "Pricing — PledgeOFF" },
  description: `Free until you're sure. Then €${PRICING.pro.monthly.eur}/mo for Pro or €${PRICING.pro_plus.monthly.eur}/mo for Pro+. Validate ideas with real signals from Reddit, GitHub, HN, and more.`,
  alternates: { canonical: "https://pledgeoff.com/pricing" },
  openGraph: {
    title: "Pricing — PledgeOFF",
    description: `Free until you're sure. Then €${PRICING.pro.monthly.eur}/mo for Pro or €${PRICING.pro_plus.monthly.eur}/mo for Pro+.`,
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
