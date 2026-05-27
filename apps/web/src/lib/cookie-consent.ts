"use client";

export const PREFS_KEY = "cookie_preferences";
export const LEGACY_KEY = "cookie_consent";
export const CONSENT_EVENT = "pledgeoff:cookie_consent";
export const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

export type CookiePreferences = {
  analytics: boolean;
};

export function getPreferences(): CookiePreferences | null {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem(PREFS_KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as CookiePreferences;
    } catch {
      return null;
    }
  }

  // Migrate legacy cookie_consent value
  const legacy = localStorage.getItem(LEGACY_KEY);
  if (legacy === "accepted") return { analytics: true };
  if (legacy === "rejected") return { analytics: false };

  return null;
}

export function savePreferences(prefs: CookiePreferences): void {
  if (typeof window === "undefined") return;

  const json = JSON.stringify(prefs);
  localStorage.setItem(PREFS_KEY, json);
  localStorage.removeItem(LEGACY_KEY);

  document.cookie = `${PREFS_KEY}=${encodeURIComponent(json)}; Max-Age=${ONE_YEAR_SECONDS}; path=/; SameSite=Lax`;
  document.cookie = `${LEGACY_KEY}=; Max-Age=0; path=/; SameSite=Lax`;

  window.dispatchEvent(
    new CustomEvent(CONSENT_EVENT, { detail: prefs })
  );

  if (!prefs.analytics) clearGaCookies();
}

export function clearPreferences(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PREFS_KEY);
  localStorage.removeItem(LEGACY_KEY);
  document.cookie = `${PREFS_KEY}=; Max-Age=0; path=/; SameSite=Lax`;
  document.cookie = `${LEGACY_KEY}=; Max-Age=0; path=/; SameSite=Lax`;
}

export function clearGaCookies(): void {
  const domain = "." + window.location.hostname;
  document.cookie.split(";").forEach((c) => {
    const name = c.trim().split("=")[0];
    if (name.startsWith("_ga")) {
      document.cookie = `${name}=; Max-Age=0; path=/; domain=${domain}`;
    }
  });
}
