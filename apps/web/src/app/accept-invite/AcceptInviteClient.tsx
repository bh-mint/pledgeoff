"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function AcceptInviteClient({ token }: { token: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "accepting" | "done" | "error" | "login">("checking");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function run() {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        setStatus("login");
        return;
      }

      setStatus("accepting");
      try {
        const res = await fetch("/api/v1/teams/accept", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${data.session.access_token}`,
          },
          body: JSON.stringify({ token }),
        });

        if (res.status === 404) {
          setErrorMsg("This invite link is invalid or has already been used.");
          setStatus("error");
          return;
        }

        if (res.status === 409) {
          setErrorMsg("You are already a member of another team. Leave that team first before accepting a new invite.");
          setStatus("error");
          return;
        }

        if (!res.ok) {
          setErrorMsg("Something went wrong. Please try again.");
          setStatus("error");
          return;
        }

        setStatus("done");
        setTimeout(() => router.push("/dashboard"), 1500);
      } catch {
        setErrorMsg("Network error. Please try again.");
        setStatus("error");
      }
    }

    run();
  }, [token, router]);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--canvas)", color: "var(--t1)" }}
    >
      <div
        className="w-full max-w-sm rounded-md border p-8 text-center"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <div className="display font-bold mb-3" style={{ fontSize: "22px" }}>
          {status === "checking" && "Checking invite…"}
          {status === "accepting" && "Joining team…"}
          {status === "done" && "You're in!"}
          {status === "error" && "Invite error"}
          {status === "login" && "Sign in first"}
        </div>

        {status === "login" && (
          <>
            <p className="text-[14px] mb-6" style={{ color: "var(--t2)" }}>
              You need to be signed in to accept this invite.
            </p>
            <a
              href={`/login?next=${encodeURIComponent(`/accept-invite?token=${token}`)}`}
              className="inline-flex items-center h-9 px-5 rounded-md display text-[13px] font-semibold"
              style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
            >
              Sign in or create account →
            </a>
          </>
        )}

        {status === "done" && (
          <p className="text-[14px]" style={{ color: "var(--t2)" }}>
            Redirecting to dashboard…
          </p>
        )}

        {status === "error" && (
          <p className="text-[14px]" style={{ color: "var(--kill)" }}>
            {errorMsg}
          </p>
        )}

        {(status === "checking" || status === "accepting") && (
          <div className="mono text-[11px] mt-2" style={{ color: "var(--t3)" }}>
            Please wait…
          </div>
        )}
      </div>
    </div>
  );
}
