"use client";

import { resetCookieConsent } from "@/components/CookieBanner";

export function CookiePreferencesButton() {
  return (
    <button
      onClick={resetCookieConsent}
      className="hover:opacity-80 transition-opacity underline underline-offset-2 cursor-pointer"
      style={{ color: "inherit", background: "none", border: "none", padding: 0, font: "inherit" }}
    >
      Cookie preferences
    </button>
  );
}
