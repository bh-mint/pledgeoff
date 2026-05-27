"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { getPreferences, CONSENT_EVENT, type CookiePreferences } from "@/lib/cookie-consent";

export function GoogleAnalytics({ gaId }: { gaId: string }) {
  const [consented, setConsented] = useState(() => {
    if (typeof window === "undefined") return false;
    return getPreferences()?.analytics === true;
  });

  useEffect(() => {
    const handler = (e: Event) => {
      const prefs = (e as CustomEvent<CookiePreferences>).detail;
      setConsented(prefs.analytics === true);
    };
    window.addEventListener(CONSENT_EVENT, handler);
    return () => window.removeEventListener(CONSENT_EVENT, handler);
  }, []);

  if (!gaId || !consented) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}', { anonymize_ip: true });
        `}
      </Script>
    </>
  );
}

export function trackEvent(
  name: string,
  params?: Record<string, string | number>
) {
  if (typeof window === "undefined" || !("gtag" in window)) return;
  (window as unknown as { gtag: (...args: unknown[]) => void }).gtag(
    "event",
    name,
    params
  );
}
