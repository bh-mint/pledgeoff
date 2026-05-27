"use client";

import { useState, useEffect } from "react";

const NOTIFICATION_ITEMS = [
  {
    key: "accuracy_report",
    label: "Monthly accuracy report",
    desc: "How well your GO/KILL verdicts held up. Sent on the 2nd of each month.",
  },
  {
    key: "queue_alerts",
    label: "Decision queue alerts",
    desc: "When a stale idea rises to the top of your decision queue.",
  },
  {
    key: "weekly_digest",
    label: "Weekly progress summary",
    desc: "Mondays — what you validated, what you killed, what's launch-ready.",
  },
  {
    key: "signal_feed",
    label: "Daily Signal Feed digest",
    desc: "Sent every day at 09:00 UTC. The 12 niches with one-line previews.",
  },
  {
    key: "score",
    label: "Score reveal notification",
    desc: "When a long-running validation finishes.",
  },
];

export function NotificationsClient() {
  const [notifState, setNotifState] = useState<Record<string, boolean>>({});

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/v1/notification-preferences");
      if (res.ok) {
        const json = (await res.json()) as { data: Record<string, boolean> };
        setNotifState(json.data ?? {});
      }
    })();
  }, []);

  return (
    <div>
      <h1 className="display text-[28px] font-semibold tracking-tight text-(--t1) mb-1">
        Notifications
      </h1>
      <p className="text-[13px] mb-8" style={{ color: "var(--t2)" }}>
        Email preferences. Off by default for everything non-essential.
      </p>

      <div
        className="border rounded-md overflow-hidden"
        style={{ borderColor: "var(--border)" }}
      >
        {NOTIFICATION_ITEMS.map((item, i) => (
          <div
            key={item.key}
            className={`px-5 py-4 flex items-start gap-5${i < NOTIFICATION_ITEMS.length - 1 ? " border-b" : ""}`}
            style={{ borderColor: "var(--border)" }}
          >
            <div className="flex-1">
              <div className="display text-[14px] font-semibold text-(--t1)">
                {item.label}
              </div>
              <div
                className="text-[12px] mt-1"
                style={{ color: "var(--t2)" }}
              >
                {item.desc}
              </div>
            </div>
            <button
              onClick={() => {
                const next = !notifState[item.key];
                setNotifState((prev) => ({ ...prev, [item.key]: next }));
                void fetch("/api/v1/notification-preferences", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ [item.key]: next }),
                });
              }}
              role="switch"
              aria-checked={notifState[item.key] ?? false}
              aria-label={item.label}
              className="relative w-11 h-6 rounded-full border shrink-0 mt-0.5"
              style={{
                borderColor: "var(--border)",
                background: notifState[item.key]
                  ? "color-mix(in srgb, var(--accent) 15%, transparent)"
                  : "var(--surface)",
              }}
            >
              <span
                className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
                style={{
                  left: notifState[item.key] ? "calc(100% - 18px)" : "2px",
                  background: notifState[item.key]
                    ? "var(--accent)"
                    : "var(--t3)",
                }}
              />
            </button>
          </div>
        ))}
      </div>
      <p className="mono text-[10px] mt-4" style={{ color: "var(--t3)" }}>
        Preferences saved to your account instantly.
      </p>
    </div>
  );
}
