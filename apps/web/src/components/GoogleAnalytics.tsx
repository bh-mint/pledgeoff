"use client";

import Script from "next/script";

export function GoogleAnalytics({ gaId }: { gaId: string }) {
  if (!gaId) return null;
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
          gtag('config', '${gaId}');
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
  (window as unknown as { gtag: Function }).gtag("event", name, params);
}
