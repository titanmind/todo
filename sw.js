// Minimal service worker — exists only for PWA installability.
// No caching. All requests go to network. Always fresh content.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  // Clear any old caches from previous versions
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
  );
  self.clients.claim();
});
self.addEventListener('fetch', event => {
  // Pass everything through to network — no caching
});
