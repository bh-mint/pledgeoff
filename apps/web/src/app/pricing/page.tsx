import type { Metadata } from "next";
import { PricingClient } from "./PricingClient";
import { PRICING } from "@/lib/pricing.config";
import { createSupabaseServiceClient } from "@/lib/supabase-server";

export const metadata: Metadata = {
  title: { absolute: "Pricing — PledgeOFF" },
  description: `Free until you're sure. Then €${PRICING.founder.monthly.eur}/mo for Founder or €${PRICING.team.monthly.eur}/mo for Team. Validate ideas with real signals from Reddit, GitHub, HN, and more.`,
  alternates: { canonical: "https://pledgeoff.com/pricing" },
  openGraph: {
    title: "Pricing — PledgeOFF",
    description: `Free until you're sure. Then €${PRICING.founder.monthly.eur}/mo for Founder or €${PRICING.team.monthly.eur}/mo for Team.`,
    url: "https://pledgeoff.com/pricing",
    type: "website",
    images: [
      {
        url: "https://pledgeoff.com/api/og?type=home",
        width: 1200,
        height: 630,
        alt: "PledgeOFF Pricing — Free until you're sure",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pricing — PledgeOFF",
    description: `Free until you're sure. Then €${PRICING.founder.monthly.eur}/mo for Founder or €${PRICING.team.monthly.eur}/mo for Team.`,
    images: ["https://pledgeoff.com/api/og?type=home"],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Pricing — PledgeOFF",
  description: `Free until you're sure. Then €${PRICING.founder.monthly.eur}/mo for Founder. Validate startup ideas with real Reddit, GitHub, and HN signals.`,
  url: "https://pledgeoff.com/pricing",
};

async function getMostPopularPlan(): Promise<"founder" | "team" | "studio" | null> {
  try {
    const supabase = createSupabaseServiceClient();
    const { data } = await supabase
      .from("subscriptions")
      .select("plan")
      .in("plan", ["founder", "team", "studio"])
      .eq("status", "active");
    if (!data || data.length === 0) return null;
    const counts: Record<string, number> = {};
    for (const row of data) {
      counts[row.plan as string] = (counts[row.plan as string] ?? 0) + 1;
    }
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return (top?.[0] as "founder" | "team" | "studio") ?? null;
  } catch {
    return null;
  }
}

export default async function PricingPage() {
  const popularPlan = await getMostPopularPlan();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PricingClient popularPlan={popularPlan} />
    </>
  );
}
