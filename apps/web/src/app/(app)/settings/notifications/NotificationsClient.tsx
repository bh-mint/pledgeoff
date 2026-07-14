"use client";

import { useState, useEffect } from "react";
import { getAuthToken } from "@/lib/auth-client";

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
    key: "movement_alerts",
    label: "Market movement alerts",
    desc: "When a competitor makes a major move — price change, repositioning, new segment.",
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

type Props = {
  marketingEmailsConsent: boolean;
  marketingEmailsConsentedAt: string | null;
};

function formatConsentDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function NotificationsClient({
  marketingEmailsConsent,
  marketingEmailsConsentedAt,
}: Props) {
  const [notifState, setNotifState] = useState<Record<string, boolean>>({});
  const [marketing, setMarketing] = useState(marketingEmailsConsent);
  const [marketingConsentedAt, setMarketingConsentedAt] = useState<
    string | null
  >(marketingEmailsConsentedAt);
  const [marketingSaving, setMarketingSaving] = useState(false);
  const [notifError, setNotifError] = useState<string | null>(null);

  async function toggleNotification(key: string) {
    const next = !notifState[key];
    setNotifState((prev) => ({ ...prev, [key]: next }));
    setNotifError(null);
    try {
      const res = await fetch("/api/v1/notification-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: next }),
      });
      if (!res.ok) {
        setNotifState((prev) => ({ ...prev, [key]: !next }));
        setNotifError("Couldn't save that change. Try again.");
      }
    } catch {
      setNotifState((prev) => ({ ...prev, [key]: !next }));
      setNotifError("Couldn't save that change. Try again.");
    }
  }

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/v1/notification-preferences");
      if (res.ok) {
        const json = (await res.json()) as { data: Record<string, boolean> };
        setNotifState(json.data ?? {});
      }
    })();
  }, []);

  const handleMarketingToggle = async () => {
    const next = !marketing;
    setMarketing(next);
    setMarketingConsentedAt(next ? new Date().toISOString() : null);
    setMarketingSaving(true);
    try {
      const token = await getAuthToken();
      await fetch("/api/v1/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ marketing_emails_consent: next }),
      });
    } finally {
      setMarketingSaving(false);
    }
  };

  return (
    <div>
      {/* Marketing emails */}
      <div className="nrow">
        <div>
          <div className="nrow-ttl">Product updates &amp; tips</div>
          <div className="nrow-desc">
            Occasional emails about new features and product news.
            {marketing && marketingConsentedAt && (
              <span style={{ marginLeft: 6, color: "var(--faint)" }}>
                Consent given {formatConsentDate(marketingConsentedAt)}
              </span>
            )}
          </div>
        </div>
        <button
          className="tog"
          onClick={() => {
            void handleMarketingToggle();
          }}
          disabled={marketingSaving}
          role="switch"
          aria-checked={marketing}
          aria-label="Product updates and tips"
        >
          <div className={`tog-t${marketing ? " on" : ""}`}>
            <div className="tog-th" />
          </div>
        </button>
      </div>

      {/* Product notifications */}
      {NOTIFICATION_ITEMS.map((item) => (
        <div className="nrow" key={item.key}>
          <div>
            <div className="nrow-ttl">{item.label}</div>
            <div className="nrow-desc">{item.desc}</div>
          </div>
          <button
            className="tog"
            onClick={() => void toggleNotification(item.key)}
            role="switch"
            aria-checked={notifState[item.key] ?? false}
            aria-label={item.label}
          >
            <div className={`tog-t${notifState[item.key] ? " on" : ""}`}>
              <div className="tog-th" />
            </div>
          </button>
        </div>
      ))}

      {notifError && (
        <p className="fine" style={{ marginTop: 12, color: "var(--caution)" }}>{notifError}</p>
      )}
      <p className="fine" style={{ marginTop: 12 }}>
        GDPR Art. 6(1)(a) for marketing · 6(1)(f) for product notifications.
        Preferences saved instantly.
      </p>
    </div>
  );
}
