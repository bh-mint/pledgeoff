import type { Metadata } from "next";
import { requireUser } from "@/lib/auth-server";
import { DataClient } from "./DataClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Data — PledgeOFF" },
  robots: { index: false, follow: false },
};

export default async function DataPage() {
  const user = await requireUser();
  return <DataClient email={user.email ?? ""} />;
}
