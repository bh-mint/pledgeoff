import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { LoginClient } from "./LoginClient";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[var(--canvas)] flex flex-col items-center justify-center px-4">
      <Link
        href="/"
        className="display text-[15px] font-semibold text-[var(--t1)] tracking-tight mb-12"
      >
        Pledge<span className="text-[var(--accent)]">OFF</span>
      </Link>

      <Suspense fallback={<div className="w-full max-w-sm h-48 bg-[var(--surface)] border border-[var(--border)] rounded-lg animate-pulse" />}>
        <LoginClient />
      </Suspense>

      <p className="text-[12px] text-[var(--t3)] mt-6">
        Don&apos;t have access yet?{" "}
        <Link href="/" className="text-[var(--accent)] hover:opacity-80 transition-opacity">
          Join the waitlist →
        </Link>
      </p>
    </div>
  );
}
