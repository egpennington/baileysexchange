// --- Bailey's Exchange service worker (v2) ---
const SHELL_CACHE = 'bailey-fx-shell-v2';
const API_CACHE   = 'bailey-fx-api-v1';

const APP_ASSETS = [
  '/index.html',
  '/styles.css',
  '/main.js',
  '/site.webmanifest',
  '/favicon.ico',
  '/bailey-exchange-icon-180.png',
  '/bailey-exchange-icon-192.png',
  '/bailey-exchange-icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(cache => cache.addAll(APP_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys
        .filter(k => ![SHELL_CACHE, API_CACHE].includes(k))
        .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 1) Top-level navigations: network-first, fallback to cached index.html
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        return await fetch(req);
      } catch {
        // Serve your app shell when offline (works for / and /?from=GBP&to=USD etc.)
        const cache = await caches.open(SHELL_CACHE);
        return (await cache.match('/index.html')) || Response.error();
      }
    })());
    return;
  }

  // 2) Frankfurter API: network-first with cache fallback
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
        return new Response(JSON.stringify({ error: 'Offline and no cached rate' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    })());
    return;
  }

  // 3) Same-origin static assets: cache-first
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then(cached => cached || fetch(req))
    );
  }
});
