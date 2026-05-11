import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { LoginClient } from "./LoginClient";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FooterMicro } from "@/components/FooterMicro";

export const metadata: Metadata = {
  title: "Sign in — PledgeOFF",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--canvas)", color: "var(--t1)" }}
    >
      {/* Minimal auth nav — logo centered, toggle right */}
      <nav
        className="relative h-14 border-b flex items-center px-4 sm:px-8 flex-shrink-0"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="absolute left-1/2 -translate-x-1/2">
          <Link
            href="/"
            className="display text-[15px] font-semibold"
            style={{ color: "var(--t1)" }}
          >
            Pledge<span style={{ color: "var(--accent)" }}>OFF</span>
          </Link>
        </div>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </nav>

      {/* Centered form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <Suspense
          fallback={
            <div
              className="rounded-md border p-8 w-full max-w-sm animate-pulse"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            />
          }
        >
          <LoginClient />
        </Suspense>
      </div>

      <FooterMicro />
    </div>
  );
}
