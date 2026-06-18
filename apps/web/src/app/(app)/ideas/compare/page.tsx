import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth-server";
import { CompareClient } from "./CompareClient";

export const metadata: Metadata = {
  title: { absolute: "Compare Ideas — PledgeOFF" },
  robots: { index: false, follow: false },
};

export default async function ComparePage() {
  await requireUser();

  return (
    <Suspense
      fallback={
        <div className="cmp-wrap">
          <p className="fine">Loading…</p>
        </div>
      }
    >
      <CompareClient />
    </Suspense>
  );
}
