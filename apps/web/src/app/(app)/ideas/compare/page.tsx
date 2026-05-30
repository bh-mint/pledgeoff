import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth-server";
import { CompareClient } from "./CompareClient";

export const metadata: Metadata = {
  title: "Compare Ideas — PledgeOFF",
  robots: { index: false, follow: false },
};

export default async function ComparePage() {
  await requireUser();

  return (
    <div className="min-h-screen bg-(--canvas)">
      <div className="max-w-360 mx-auto px-4 sm:px-8 py-8 sm:py-12">
        <Link
          href="/dashboard"
          className="mono text-[11px] text-(--t3) hover:text-(--t2) transition-colors uppercase tracking-[0.08em] mb-8 inline-block"
        >
          ← Back to Dashboard
        </Link>

        <div className="mb-8 pb-8 border-b border-(--border)">
          <p className="mono text-[10px] text-(--t3) uppercase tracking-[0.12em] mb-2">
            Signal Verdict · Compare
          </p>
          <h1 className="display text-[22px] font-semibold tracking-tight text-(--t1)">
            Compare two ideas
          </h1>
          <p className="text-[14px] text-(--t2) mt-2">
            Side-by-side score and dimension breakdown.
          </p>
        </div>

        <CompareClient />
      </div>
    </div>
  );
}
