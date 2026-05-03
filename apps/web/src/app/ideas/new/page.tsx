import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth-server";
import { Nav } from "@/components/Nav";
import { IdeaInput } from "@/components/IdeaInput";

export const metadata: Metadata = {
  title: "Validate a new idea",
  robots: { index: false, follow: false },
};

export default async function NewIdeaPage() {
  await requireUser();

  return (
    <div className="min-h-screen bg-[var(--canvas)]">
      <Nav />

      <div className="max-w-[640px] mx-auto px-8 py-16">
        <Link
          href="/dashboard"
          className="mono text-[11px] text-[var(--t3)] hover:text-[var(--t2)] transition-colors uppercase tracking-[0.08em] mb-8 inline-block"
        >
          ← Dashboard
        </Link>

        <p className="mono text-[10px] text-[var(--t3)] uppercase tracking-[0.12em] mb-3">
          New idea
        </p>
        <h1 className="display text-[32px] font-bold text-[var(--t1)] mb-2 leading-tight">
          What are you building?
        </h1>
        <p className="text-[14px] text-[var(--t2)] mb-10 leading-relaxed">
          Describe your idea in plain English. We&apos;ll scan 847 live signals
          from Reddit and GitHub and return a GO / KILL / PIVOT verdict with
          the evidence.
        </p>

        <IdeaInput />
      </div>
    </div>
  );
}
