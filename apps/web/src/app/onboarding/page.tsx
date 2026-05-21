import type { Metadata } from "next";
import { requireUser } from "@/lib/auth-server";
import { OnboardingClient } from "./OnboardingClient";

export const metadata: Metadata = {
  title: { absolute: "Welcome to PledgeOFF" },
  robots: { index: false, follow: false },
};

export default async function OnboardingPage() {
  await requireUser();
  return <OnboardingClient />;
}
