// --- Bailey's Exchange service worker ---
// Cache versioning (bump when you change files)
const SHELL_CACHE = 'bailey-fx-shell-v1';
const API_CACHE   = 'bailey-fx-api-v1';

// App shell files to cache for offline
// If you deploy under a subpath (e.g. /fx/), prefix each path with that subpath.
const APP_ASSETS = [
  '/',                  // root (remove if deploying under a subpath without an index at /)
  '/index.html',
  '/styles.css',
  '/main.js',
  '/site.webmanifest',
  '/favicon.ico',
  // icons you generated
  '/bailey-exchange-icon-180.png',
  '/bailey-exchange-icon-192.png',
  '/bailey-exchange-icon-512.png'
];

// Install: pre-cache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(cache => cache.addAll(APP_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => ![SHELL_CACHE, API_CACHE].includes(k))
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch strategy:
// - Same-origin files: Cache-First
// - Frankfurter API: Network-First with cache fallback
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Runtime cache for the Frankfurter API
  if (url.origin === 'https://api.frankfurter.dev') {
    event.respondWith((async () => {
      try {
        const netRes = await fetch(req);
        const cache = await caches.open(API_CACHE);
        cache.put(req, netRes.clone());
        return netRes;
      } catch {
        const cache = await caches.open(API_CACHE);
        const cached = await cache.match(req);
        if (cached) return cached;
        // If no cache, return a minimal response
        return new Response(JSON.stringify({ error: 'Offline and no cached rate' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    })());
    return;
  }

  // Same-origin assets
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then(cached => cached || fetch(req))
    );
  }
});
