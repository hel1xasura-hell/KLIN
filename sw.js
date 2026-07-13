/* =====================================================================================
   DevHub Service Worker
   Deploy this file in the SAME folder as index.html (e.g. the root of your GitHub
   Pages repo). It caches the app shell on install so DevHub keeps working offline
   and loads instantly on repeat visits — required for reliable PWA behavior.
   ===================================================================================== */

const CACHE_NAME = 'devhub-cache-v1';
const APP_SHELL = [
  './',
  './index.html'
];

// Install: pre-cache the app shell. Defensive — never let a single failed
// request block installation.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => Promise.all(
        APP_SHELL.map((url) => cache.add(url).catch((err) => {
          console.warn('DevHub SW: failed to cache', url, err);
        }))
      ))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean up old cache versions.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first for same-origin requests (the app shell), falling back to
// network, and finally to whatever cached copy exists if offline. External CDN
// requests (Tailwind, FontAwesome, Google Fonts) are passed straight through to
// the network since they're versioned/hashed and browser-cached already.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const isSameOrigin = new URL(req.url).origin === self.location.origin;
  if (!isSameOrigin) return; // let external CDN requests pass through normally

  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
