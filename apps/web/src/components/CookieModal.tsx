"use client";

import { useEffect, useRef, useState } from "react";
import { getPreferences, savePreferences } from "@/lib/cookie-consent";

interface Props {
  onClose: (saved: boolean) => void;
  triggerRef?: React.RefObject<HTMLButtonElement | null>;
}

export function CookieModal({ onClose, triggerRef }: Props) {
  const existing = getPreferences();
  const [analytics, setAnalytics] = useState(existing?.analytics ?? false);
  const closeRef = useRef<HTMLButtonElement>(null);

  const dismiss = () => {
    triggerRef?.current?.focus();
    onClose(false);
  };

  const save = () => {
    savePreferences({ analytics });
    triggerRef?.current?.focus();
    onClose(true);
  };

  useEffect(() => {
    closeRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  return (
    <div
      className="ck-scrim open"
      onMouseDown={(e) => { if (e.target === e.currentTarget) dismiss(); }}
    >
      <div
        className="ck-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ck-pref-title"
      >
        <div className="ck-mhd">
          <span>Cookie preferences</span>
          <span className="ck-mhd-right">
            <span className="ck-mhd-sub">GDPR · you decide</span>
            <button ref={closeRef} className="ck-mclose" type="button" aria-label="Close" onClick={dismiss}>
              ✕
            </button>
          </span>
        </div>

        <div className="ck-mbody">
          <div className="ck-meyebrow">Manage what we store</div>
          <h2 className="ck-mtitle" id="ck-pref-title">Three categories. You control two.</h2>
          <p className="ck-mlede">
            Necessary cookies keep you logged in and can&apos;t be turned off. Everything else
            is opt-in and easy to revoke later from Settings.
          </p>

          {/* Necessary */}
          <div className="ck-cat">
            <div className="ck-cat-top">
              <div className="ck-cat-id">
                <div className="ck-cat-nm">
                  Necessary <span className="ck-cat-tag req">Always on</span>
                </div>
              </div>
              <label className="ck-sw locked">
                <input type="checkbox" defaultChecked disabled aria-label="Necessary — always on" />
                <span className="ck-sw-track" />
                <span className="ck-sw-thumb" />
              </label>
            </div>
            <div className="ck-cat-desc">
              Session, authentication, theme, and security. Required for the site to function — no consent needed under GDPR.
            </div>
          </div>

          {/* Analytics */}
          <div className="ck-cat">
            <div className="ck-cat-top">
              <div className="ck-cat-id">
                <div className="ck-cat-nm">
                  Analytics <span className="ck-cat-tag">Opt-in</span>
                </div>
              </div>
              <label className="ck-sw">
                <input
                  type="checkbox"
                  checked={analytics}
                  onChange={(e) => setAnalytics(e.target.checked)}
                  aria-label="Analytics"
                />
                <span className="ck-sw-track" />
                <span className="ck-sw-thumb" />
              </label>
            </div>
            <div className="ck-cat-desc">
              Product telemetry via <code>PostHog</code> and <code>Axiom</code> — page views, feature usage, error rates.
              Helps us prioritise what to build. Never sold or shared.
            </div>
          </div>

          {/* Marketing */}
          <div className="ck-cat">
            <div className="ck-cat-top">
              <div className="ck-cat-id">
                <div className="ck-cat-nm">
                  Marketing <span className="ck-cat-tag">None active</span>
                </div>
              </div>
              <label className="ck-sw locked">
                <input type="checkbox" disabled aria-label="Marketing — none active" />
                <span className="ck-sw-track" />
                <span className="ck-sw-thumb" />
              </label>
            </div>
            <div className="ck-cat-desc">
              We run no advertising or retargeting cookies. This stays off because there&apos;s nothing
              here to enable — listed for transparency.
            </div>
          </div>

          <div className="ck-macts">
            <span className="ck-fnote">Revoke anytime in Settings → Privacy</span>
            <button className="btn-p" type="button" onClick={save}>
              Save preferences
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
