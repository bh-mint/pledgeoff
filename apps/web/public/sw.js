// Retire the legacy offline worker: private responses must never be cached.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key.startsWith('pledgeoff-')).map((key) => caches.delete(key))
  )).then(() => self.clients.claim()).then(() => self.registration.unregister()));
});
