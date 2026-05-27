import type { Metadata } from "next";
import { requireUser } from "@/lib/auth-server";
import { DeveloperClient } from "./DeveloperClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Developer — PledgeOFF" },
  robots: { index: false, follow: false },
};

export default async function DeveloperPage() {
  await requireUser();
  return <DeveloperClient />;
}
