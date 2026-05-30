import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseAuthClient } from "@/lib/supabase/server";
import { container } from "@/lib/container";
import { JoinTeamClient } from "./JoinTeamClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Join a team — PledgeOFF" },
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ token: string }> };

export default async function JoinPage({ params }: Props) {
  const { token } = await params;

  // Soft auth check — don't redirect, just detect session
  const supabase = await createSupabaseAuthClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Look up invite link
  const linkResult = await container.teamRepo.findInviteLinkByToken(token);
  const link = linkResult.isOk() ? linkResult.value : null;

  if (!link) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--canvas)" }}>
        <div className="text-center max-w-sm">
          <div className="mono text-[10px] uppercase tracking-[0.12em] mb-3" style={{ color: "var(--t3)" }}>
            Invite link
          </div>
          <h1 className="display text-[22px] font-semibold mb-2" style={{ color: "var(--t1)" }}>
            Link not found
          </h1>
          <p className="text-[13px] mb-6" style={{ color: "var(--t2)" }}>
            This invite link doesn&apos;t exist or has already been used.
          </p>
          <Link href="/" className="mono text-[11px] transition-opacity hover:opacity-70" style={{ color: "var(--t3)" }}>
            ← Back to PledgeOFF
          </Link>
        </div>
      </div>
    );
  }

  const expired = new Date(link.expiresAt) < new Date();
  const revoked = !!link.revokedAt;
  const invalid = expired || revoked;

  const teamResult = await container.teamRepo.findById(link.teamId);
  const teamName = teamResult.isOk() && teamResult.value ? teamResult.value.name : "a team";

  if (invalid) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--canvas)" }}>
        <div className="text-center max-w-sm">
          <div className="mono text-[10px] uppercase tracking-[0.12em] mb-3" style={{ color: "var(--t3)" }}>
            Invite link
          </div>
          <h1 className="display text-[22px] font-semibold mb-2" style={{ color: "var(--t1)" }}>
            {revoked ? "Link revoked" : "Link expired"}
          </h1>
          <p className="text-[13px] mb-6" style={{ color: "var(--t2)" }}>
            {revoked
              ? "This invite link has been revoked by the team owner."
              : "This invite link expired. Ask the team owner to generate a new one."}
          </p>
          <Link href="/" className="mono text-[11px] transition-opacity hover:opacity-70" style={{ color: "var(--t3)" }}>
            ← Back to PledgeOFF
          </Link>
        </div>
      </div>
    );
  }

  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(link.expiresAt).getTime() - Date.now()) / 86400_000),
  );

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--canvas)" }}>
      <div className="text-center max-w-sm w-full">
        <Link
          href="/"
          className="mono text-[11px] uppercase tracking-[0.12em] mb-8 block transition-opacity hover:opacity-70"
          style={{ color: "var(--t3)" }}
        >
          PledgeOFF
        </Link>

        <div
          className="border rounded-lg p-8 mb-6"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <div className="mono text-[10px] uppercase tracking-[0.12em] mb-3" style={{ color: "var(--t3)" }}>
            You&apos;ve been invited to join
          </div>
          <h1 className="display text-[28px] font-semibold mb-1" style={{ color: "var(--t1)" }}>
            {teamName}
          </h1>
          <p className="mono text-[10px] mb-8" style={{ color: "var(--t3)" }}>
            Link valid for {daysLeft} more {daysLeft === 1 ? "day" : "days"}
          </p>

          <JoinTeamClient token={token} teamName={teamName} isLoggedIn={!!user} />
        </div>

        <p className="mono text-[10px]" style={{ color: "var(--t3)" }}>
          By joining, you agree to PledgeOFF&apos;s{" "}
          <Link href="/terms" className="underline underline-offset-2 hover:opacity-70">
            Terms of Service
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
