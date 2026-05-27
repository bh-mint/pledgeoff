import type { Metadata } from "next";
import { requireUser } from "@/lib/auth-server";
import { IntegrationsClient } from "./IntegrationsClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Integrations — PledgeOFF" },
  robots: { index: false, follow: false },
};

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ github?: string }>;
}) {
  await requireUser();
  const params = await searchParams;
  return <IntegrationsClient githubParam={params.github ?? null} />;
}
