"use client";

import { useState, useEffect, useRef } from "react";
import { getAuthToken } from "@/lib/auth-client";

type Notification = {
  id: string;
  type: "queue_alert" | "accuracy_report";
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function typeIcon(type: Notification["type"]): string {
  if (type === "queue_alert") return "↑";
  if (type === "accuracy_report") return "◎";
  return "·";
}

interface NotificationBellProps {
  initialUnreadCount: number;
}

export function NotificationBell({ initialUnreadCount }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loaded, setLoaded] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Fetch + mark-read when panel opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function loadAndMarkRead() {
      const token = await getAuthToken();
      if (!token || cancelled) return;

      const res = await fetch("/api/v1/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok || cancelled) return;

      const json = (await res.json()) as { data: { notifications: Notification[]; unreadCount: number } };
      if (cancelled) return;
      setNotifications(json.data.notifications);
      setUnreadCount(json.data.unreadCount);
      setLoaded(true);

      if (json.data.unreadCount > 0) {
        await fetch("/api/v1/notifications", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled) {
          setUnreadCount(0);
          setNotifications((prev) =>
            prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() }))
          );
        }
      }
    }

    loadAndMarkRead();
    return () => { cancelled = true; };
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unreadCount > 0 ? ` — ${unreadCount} unread` : ""}`}
        className="relative w-9 h-9 flex items-center justify-center rounded-md transition-colors hover:bg-(--surface)"
        style={{ color: open ? "var(--t1)" : "var(--t2)" }}
      >
        {/* Bell icon */}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M8 1.5A4.5 4.5 0 0 0 3.5 6v2.5L2 10h12l-1.5-1.5V6A4.5 4.5 0 0 0 8 1.5Z"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinejoin="round"
          />
          <path
            d="M6.5 10.5a1.5 1.5 0 0 0 3 0"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
          />
        </svg>

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span
            className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
            style={{ background: "var(--accent)" }}
            aria-hidden="true"
          />
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 top-full mt-1 w-80 rounded-md border shadow-lg z-50 overflow-hidden"
          style={{ borderColor: "var(--border)", background: "var(--canvas)" }}
        >
          {/* Header */}
          <div
            className="px-4 py-3 border-b flex items-center justify-between"
            style={{ borderColor: "var(--border)" }}
          >
            <span className="display text-[13px] font-semibold tracking-tight text-(--t1)">
              Notifications
            </span>
            {unreadCount === 0 && loaded && (
              <span className="mono text-[10px] text-(--t3)">all read</span>
            )}
          </div>

          {/* List */}
          {!loaded ? (
            <div className="px-4 py-8 text-center mono text-[11px] text-(--t3)">Loading…</div>
          ) : notifications.length === 0 ? (
            <div className="px-4 py-8 text-center mono text-[11px] text-(--t3)">
              No notifications yet.
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto divide-y" style={{ borderColor: "var(--border)" }}>
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className="px-4 py-3 flex items-start gap-3"
                  style={{
                    background: n.readAt
                      ? "transparent"
                      : "color-mix(in srgb, var(--accent) 4%, transparent)",
                  }}
                >
                  <span
                    className="mono text-[12px] font-semibold shrink-0 mt-0.5"
                    style={{ color: "var(--accent)" }}
                    aria-hidden="true"
                  >
                    {typeIcon(n.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-(--t1) leading-snug">{n.title}</div>
                    <div className="text-[12px] text-(--t2) mt-0.5 leading-snug">{n.body}</div>
                    <div className="mono text-[10px] text-(--t3) mt-1">{relativeTime(n.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
