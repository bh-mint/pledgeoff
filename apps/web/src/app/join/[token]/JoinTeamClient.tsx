"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getAuthToken } from "@/lib/auth-client";

type Props = {
  token: string;
  teamName: string;
  isLoggedIn: boolean;
};

export function JoinTeamClient({ token, teamName, isLoggedIn }: Props) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleJoin = async () => {
    setState("loading");
    setErrorMsg("");
    const authToken = await getAuthToken();
    const res = await fetch(`/api/v1/teams/join/${token}`, {
      method: "POST",
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    });
    if (res.ok) {
      setState("success");
      setTimeout(() => router.push("/settings/team"), 1500);
    } else {
      const json = (await res.json().catch(() => ({}))) as { error?: { message?: string; code?: string } };
      const code = json.error?.code ?? "";
      if (code === "ALREADY_IN_TEAM") {
        setErrorMsg("You're already a member of a team.");
      } else if (code === "SEAT_LIMIT_REACHED") {
        setErrorMsg("This team has reached its seat limit. Ask the owner to add more seats.");
      } else {
        setErrorMsg(json.error?.message ?? "Something went wrong. Please try again.");
      }
      setState("error");
    }
  };

  if (state === "success") {
    return (
      <div className="text-center">
        <div className="mono text-[13px] mb-1" style={{ color: "var(--validated)" }}>
          Joined successfully ✓
        </div>
        <div className="mono text-[11px]" style={{ color: "var(--t3)" }}>
          Redirecting to team settings…
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="flex flex-col items-center gap-3">
        <Link
          href={`/login?mode=signup&next=/join/${token}`}
          className="display font-semibold text-[14px] h-10 px-6 rounded-md inline-flex items-center transition-opacity hover:opacity-90"
          style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
        >
          Sign up to join →
        </Link>
        <Link
          href={`/login?next=/join/${token}`}
          className="mono text-[11px] transition-opacity hover:opacity-70"
          style={{ color: "var(--t3)" }}
        >
          Already have an account? Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={handleJoin}
        disabled={state === "loading"}
        className="display font-semibold text-[14px] h-10 px-6 rounded-md transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
      >
        {state === "loading" ? "Joining…" : `Join ${teamName} →`}
      </button>
      {state === "error" && (
        <p className="mono text-[11px] text-center" style={{ color: "var(--kill)" }}>
          {errorMsg}
        </p>
      )}
    </div>
  );
}
