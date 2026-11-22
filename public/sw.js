const CACHE_NAME = 'inspection-workspace-v1';
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/daily-report.html',
  '/pwa-bridge.js',
  '/manifest.json',
  '/icon.svg'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)).catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Jangan pernah cache panggilan API database Google Apps Script
  if (req.method !== 'GET' || url.pathname.startsWith('/api/')) {
    return;
  }

  // Network-first untuk HTML & JS agar update dari Vercel selalu langsung masuk, fallback ke cache jika offline
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200 && url.origin === self.location.origin) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, clone)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
