"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type OutboxEvent = {
  event_id: string;
  event_type: string;
  payload: Record<string, unknown> | null;
  processed: boolean;
  attempts: number;
  last_error: string | null;
  created_at: string;
  processed_at: string | null;
};

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function statusBadge(ev: OutboxEvent) {
  if (ev.processed) return <span className="adm-bs adm-bs-go">Delivered</span>;
  if (ev.attempts > 0) return <span className="adm-bs adm-bs-kll">Failed</span>;
  return <span className="adm-bs adm-bs-dim">Pending</span>;
}

export function OutboxTable({ events }: { events: OutboxEvent[] }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [retrying, setRetrying] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function retry(eventId: string) {
    setRetrying((prev) => new Set(prev).add(eventId));
    const { createSupabaseBrowserClient } = await import("@/lib/supabase/client");
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token ?? "";
    await fetch(`/api/v1/admin/outbox/${eventId}/retry`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    setRetrying((prev) => {
      const next = new Set(prev);
      next.delete(eventId);
      return next;
    });
    router.refresh();
  }

  return (
    <div className="at-wrap">
      <table className="at">
        <thead>
          <tr>
            <th style={{ width: 18 }} />
            <th>Event</th>
            <th>Status</th>
            <th>Attempts</th>
            <th>Created</th>
            <th>Error</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {events.map((ev) => {
            const isExpanded = expanded.has(ev.event_id);
            const isRetrying = retrying.has(ev.event_id);
            return (
              <>
                <tr
                  key={ev.event_id}
                  style={{ cursor: "pointer" }}
                  onClick={() => toggle(ev.event_id)}
                >
                  <td
                    style={{
                      width: 18,
                      fontSize: 10,
                      color: "var(--faint)",
                      paddingLeft: 8,
                    }}
                  >
                    {isExpanded ? "▼" : "▶"}
                  </td>
                  <td className="td-main" style={{ fontSize: 11 }}>
                    {ev.event_type}
                  </td>
                  <td>{statusBadge(ev)}</td>
                  <td className="td-mono">{ev.attempts}</td>
                  <td className="td-mono">{fmt(ev.created_at)}</td>
                  <td
                    className="td-mono"
                    style={{
                      maxWidth: 200,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      color: "var(--kill)",
                    }}
                  >
                    {ev.last_error ?? "—"}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    {!ev.processed && ev.attempts > 0 && (
                      <button
                        className="btn-xs d"
                        disabled={isRetrying}
                        onClick={() => void retry(ev.event_id)}
                      >
                        {isRetrying ? "…" : "Retry"}
                      </button>
                    )}
                  </td>
                </tr>
                {isExpanded && (
                  <tr key={`${ev.event_id}-payload`}>
                    <td colSpan={7} style={{ padding: "0 0 12px 26px" }}>
                      <pre className="evt-payload">
                        {JSON.stringify(ev.payload, null, 2)}
                      </pre>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
          {events.length === 0 && (
            <tr className="no-click">
              <td
                colSpan={7}
                style={{
                  padding: 24,
                  textAlign: "center",
                  color: "var(--faint)",
                  fontSize: 12,
                }}
              >
                No events found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
