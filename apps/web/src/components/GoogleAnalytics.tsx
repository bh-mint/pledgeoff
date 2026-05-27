"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

const CONSENT_KEY = "cookie_consent";
const CONSENT_EVENT = "pledgeoff:cookie_consent";

export function GoogleAnalytics({ gaId }: { gaId: string }) {
  const [consented, setConsented] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(CONSENT_KEY) === "accepted";
  });

  useEffect(() => {
    const handler = (e: Event) => {
      if ((e as CustomEvent<string>).detail === "accepted") {
        setConsented(true);
      }
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
