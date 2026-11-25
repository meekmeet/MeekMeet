// Minimal service worker — exists so the site is installable as a PWA.
// Deliberately cache-free: every request goes to the network, so nothing
// can ever go stale. Offline support can come later with a real strategy.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
