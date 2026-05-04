import type { Metadata } from "next";
import { PricingClient } from "./PricingClient";

export const metadata: Metadata = {
  title: "Pricing — PledgeOFF",
  description:
    "Free until you're sure. Then €19.99/mo. Validate unlimited ideas, access all signal sources, and stop wasting months on bad bets.",
  openGraph: {
    title: "Pricing — PledgeOFF",
    description: "Free until you're sure. Then €19.99/mo.",
  },
};

export default function PricingPage() {
  return <PricingClient />;
}
