"use client";

import Link from "next/link";
import type { TeamActivityEvent } from "@/server/team/getTeamActivity";

const VERDICT_COLOR: Record<string, string> = {
  GO: "var(--validated)",
  KILL: "var(--kill)",
  PIVOT: "var(--caution)",
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

interface TeamActivityFeedProps {
  events: TeamActivityEvent[];
}

export function TeamActivityFeed({ events }: TeamActivityFeedProps) {
  if (events.length === 0) {
    return (
      <div className="px-6 py-10 text-center">
        <div className="mono text-[12px] text-(--t3)">
          No activity yet. Validate ideas to see activity here.
        </div>
      </div>
    );
  }

  return (
    <div className="divide-y" style={{ borderColor: "var(--border)" }}>
      {events.map((ev, i) => (
        <div key={i} className="px-4 sm:px-6 py-3 flex items-start gap-3">
          {/* Avatar */}
          <div
            className="w-7 h-7 rounded-full border flex items-center justify-center mono text-[10px] font-semibold shrink-0 mt-0.5"
            style={{
              borderColor: ev.isOwn ? "var(--accent)" : "var(--border)",
              background: ev.isOwn
                ? "color-mix(in srgb, var(--accent) 12%, transparent)"
                : "var(--canvas)",
              color: ev.isOwn ? "var(--accent)" : "var(--t2)",
            }}
          >
            {ev.actorInitials}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {ev.type === "idea_validated" && (
              <>
                <div className="text-[13px] text-(--t2) leading-snug">
                  <span className="text-(--t1) font-medium">
                    {ev.isOwn ? "You" : ev.actorInitials}
                  </span>{" "}
                  validated
                </div>
                <Link
                  href={`/ideas/${ev.ideaId}`}
                  className="block text-[13px] text-(--t1) truncate hover:underline underline-offset-2 mt-0.5"
                >
                  {ev.ideaText}
                </Link>
                <div className="flex items-center gap-2 mt-1">
                  {ev.verdict && (
                    <span
                      className="mono text-[10px] font-semibold"
                      style={{ color: VERDICT_COLOR[ev.verdict] ?? "var(--t3)" }}
                    >
                      {ev.verdict}
                    </span>
                  )}
                  {ev.score !== null && (
                    <span className="mono text-[10px] text-(--t3)">
                      {ev.score}
                    </span>
                  )}
                  <span className="mono text-[10px] text-(--t3) ml-auto">
                    {relativeTime(ev.occurredAt)}
                  </span>
                </div>
              </>
            )}

            {ev.type === "member_joined" && (
              <>
                <div className="text-[13px] text-(--t2) leading-snug">
                  <span className="text-(--t1) font-medium">
                    {ev.isOwn ? "You" : ev.actorInitials}
                  </span>{" "}
                  joined the workspace
                </div>
                <div className="mono text-[10px] text-(--t3) mt-1">
                  {relativeTime(ev.occurredAt)}
                </div>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
