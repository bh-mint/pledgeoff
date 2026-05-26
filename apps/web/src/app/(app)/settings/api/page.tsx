import type { Metadata } from "next";
import { requireUser } from "@/lib/auth-server";
import { ApiKeySection } from "../ApiKeySection";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "API Keys — PledgeOFF" },
  robots: { index: false, follow: false },
};

export default async function ApiPage() {
  await requireUser();
  return <ApiKeySection />;
}
