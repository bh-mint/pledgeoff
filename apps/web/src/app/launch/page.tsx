import type { Metadata } from "next";
import { LaunchClient } from "./LaunchClient";

export const metadata: Metadata = {
  title: { absolute: "PledgeOFF — GO / KILL / PIVOT your startup idea in 15 seconds" },
  description:
    "PledgeOFF scans live signals from Reddit, GitHub, and Google Trends and gives you a GO, KILL, or PIVOT verdict on your startup idea. Free to start.",
  alternates: { canonical: "https://pledgeoff.com/launch" },
  openGraph: {
    title: "PledgeOFF — GO / KILL / PIVOT your startup idea in 15 seconds",
    description: "Live signals from Reddit and GitHub. A verdict in 15 seconds. Not your gut — real data.",
    url: "https://pledgeoff.com/launch",
    type: "website",
  },
};

export default function LaunchPage() {
  return <LaunchClient />;
}
