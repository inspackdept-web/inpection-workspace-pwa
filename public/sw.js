const CACHE_NAME = 'inspection-workspace-v8';
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
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        SHELL_ASSETS.map((url) =>
          fetch(url, { cache: 'no-cache', credentials: 'same-origin' })
            .then((res) => (res && res.ok ? cache.put(url, res) : null))
            .catch(() => {})
        )
      )
    )
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

  if (req.method !== 'GET' || url.pathname.startsWith('/api/')) {
    return;
  }

  // Gunakan req.url (string) untuk same-origin agar tidak terkena TypeError pada req.mode === 'navigate'
  const fetchPromise = url.origin === self.location.origin
    ? fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' })
    : fetch(req);

  event.respondWith(
    fetchPromise
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
