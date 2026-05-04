import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { LoginClient } from "./LoginClient";

export const metadata: Metadata = {
  title: "Sign in — PledgeOFF",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <div className="min-h-screen relative" style={{ background: "var(--canvas)", color: "var(--t1)" }}>
      {/* Ambient glow */}
      <div className="ambient-accent" />

      {/* Top bar */}
      <div
        className="relative z-10 px-8 h-14 flex items-center justify-between border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <Link
          href="/"
          className="display text-[14px] font-semibold reveal"
          style={{ animationDelay: "50ms" }}
        >
          Pledge<span style={{ color: "var(--accent)" }}>OFF</span>
        </Link>
        <span className="mono text-[11px] reveal" style={{ color: "var(--t3)", animationDelay: "120ms" }}>
          val_auth · session_new
        </span>
      </div>

      {/* Card area */}
      <div className="relative z-10 flex items-start justify-center px-6 py-16 min-h-[calc(100vh-3.5rem-5rem)]">
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

      {/* Footer */}
      <div
        className="relative z-10 px-8 py-6 border-t flex items-center justify-between"
        style={{ borderColor: "var(--border)" }}
      >
        <span className="mono text-[10px]" style={{ color: "var(--t3)" }}>© 2026 PledgeOFF</span>
        <span className="mono text-[10px]" style={{ color: "var(--t3)" }}>production uses single state</span>
      </div>
    </div>
  );
}
