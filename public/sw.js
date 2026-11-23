const CACHE_NAME = 'inspection-workspace-v9';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Pass-through fetch listener: tetap memenuhi syarat install PWA,
// tetapi membiarkan browser memuat halaman & iframe secara langsung tanpa error redirect/cache SW.
self.addEventListener('fetch', () => {});
