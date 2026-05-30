import { Suspense } from "react";
import type { Metadata } from "next";
import { ResetPasswordClient } from "./ResetPasswordClient";

export const metadata: Metadata = {
  title: "Reset Password — PledgeOFF",
  description: "Set a new password for your PledgeOFF account.",
  robots: { index: false },
};

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--canvas)" }}>
      <Suspense fallback={null}>
        <ResetPasswordClient />
      </Suspense>
    </main>
  );
}
