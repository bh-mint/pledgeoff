import { Suspense } from "react";
import type { Metadata } from "next";
import { ResetPasswordClient } from "./ResetPasswordClient";
import { ThemeToggle } from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "Reset Password — PledgeOFF",
  description: "Set a new password for your PledgeOFF account.",
  robots: { index: false },
};

export default function ResetPasswordPage() {
  return (
    <div className="auth-main" style={{ minHeight: "100vh" }}>
      <div className="auth-bar">
        <ThemeToggle />
      </div>
      <div className="auth-body">
        <Suspense fallback={null}>
          <ResetPasswordClient />
        </Suspense>
      </div>
    </div>
  );
}
