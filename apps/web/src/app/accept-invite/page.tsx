import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AcceptInviteClient } from "./AcceptInviteClient";

export const metadata: Metadata = {
  title: "Accept Team Invite",
  robots: { index: false, follow: false },
};

interface Props {
  searchParams: Promise<{ token?: string }>;
}

export default async function AcceptInvitePage({ searchParams }: Props) {
  const { token } = await searchParams;
  if (!token) redirect("/dashboard");

  return <AcceptInviteClient token={token} />;
}
