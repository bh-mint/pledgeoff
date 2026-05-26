import type { Metadata } from "next";
import { requireUser } from "@/lib/auth-server";
import { NotificationsClient } from "./NotificationsClient";

export const metadata: Metadata = {
  title: { absolute: "Notifications — PledgeOFF" },
  robots: { index: false, follow: false },
};

export default async function NotificationsPage() {
  await requireUser();
  return <NotificationsClient />;
}
