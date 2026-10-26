"use client";
import { useEffect } from 'react';

export function SessionHygiene() {
  useEffect(() => {
    // Remove offline copies made by the old public application's service worker.
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.getRegistrations().then(async (registrations) => {
        await Promise.all(registrations.filter((r) => r.active?.scriptURL === `${location.origin}/sw.js`).map((r) => r.update()));
      }).catch(() => {});
    }
    if ('caches' in window) {
      void caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('pledgeoff-')).map((k) => caches.delete(k)))).catch(() => {});
    }
    // Revalidate after browser back/forward restoration; never show a cached session after logout.
    const restore = (event: PageTransitionEvent) => { if (event.persisted) location.reload(); };
    window.addEventListener('pageshow', restore);
    return () => window.removeEventListener('pageshow', restore);
  }, []);
  return null;
}
