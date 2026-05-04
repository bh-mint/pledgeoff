import type { Metadata } from "next";
import { requireUser } from "@/lib/auth-server";
import { NewIdeaClient } from "./NewIdeaClient";

export const metadata: Metadata = {
  title: "Validate a new idea — PledgeOFF",
  robots: { index: false, follow: false },
};

export default async function NewIdeaPage() {
  await requireUser();

  return <NewIdeaClient validationsLeft={3} />;
}
