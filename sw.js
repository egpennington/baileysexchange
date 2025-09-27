// --- Bailey's Exchange service worker (v3) ---
const SHELL = 'bailey-fx-shell-v4';
const API   = 'bailey-fx-api-v1';

// Detect base path from registration scope (works for root or /fx/)
const BASE = new URL(self.registration.scope).pathname.replace(/\/$/, '');

// List ONLY files that actually exist on your site
const RAW_ASSETS = [
  'index.html',
  'styles.css',
  'main.js',
  'site.webmanifest',
  'favicon.ico',
  // keep only the icon sizes you have uploaded
  'bailey-exchange-icon-192.png',
  'bailey-exchange-icon-512.png'
];

const APP_ASSETS = RAW_ASSETS.map(p => `${BASE}/${p}`);

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL);
    // Add each asset individually so one 404 doesn’t kill the whole install
    for (const url of APP_ASSETS) {
      try {
        await cache.add(url);
      } catch (e) {
        console.warn('[SW] precache skipped:', url, e?.message || e);
      }
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => ![SHELL, API].includes(k)).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 1) Navigations: network-first, fallback to cached index.html (handles / and /?from=…)
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        return await fetch(req);
      } catch {
        const cache = await caches.open(SHELL);
        return (await cache.match(`${BASE}/index.html`)) || Response.error();
      }
    })());
    return;
  }

  // 2) Frankfurter API: network-first with cache fallback
  if (url.origin === 'https://api.frankfurter.dev') {
    event.respondWith((async () => {
      try {
        const netRes = await fetch(req);
        const cache = await caches.open(API);
        cache.put(req, netRes.clone());
        return netRes;
      } catch {
        const cache = await caches.open(API);
        const cached = await cache.match(req);
        if (cached) return cached;
        return new Response(JSON.stringify({ error: 'Offline and no cached rate' }), {
          status: 503, headers: { 'Content-Type': 'application/json' }
        });
      }
    })());
    return;
  }

  // 3) Same-origin static files: cache-first
  if (url.origin === self.location.origin) {
    event.respondWith(caches.match(req).then(cached => cached || fetch(req)));
  }
});

