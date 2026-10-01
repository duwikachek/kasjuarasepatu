// Service Worker untuk Kas Juara Sepatu PWA
// Auto-generated via vite-plugin-pwa (dikelola oleh Workbox)

const CACHE_NAME = 'kas-juara-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/assets/logo-juara.png',
  '/assets/logonobackground-min.png',
];

// Install event - cache semua asset statis
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - hapus cache lama
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - Network First strategy (data selalu fresh, fallback ke cache jika offline)
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests dan Chrome extensions
  if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension')) {
    return;
  }
  // Skip Google APIs & Fonts (selalu ambil dari network)
  if (
    event.request.url.includes('googleapis.com') ||
    event.request.url.includes('gstatic.com') ||
    event.request.url.includes('fonts.google')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Simpan response ke cache jika berhasil
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Jika offline, ambil dari cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          // Fallback ke halaman utama jika route tidak ada di cache
          return caches.match('/');
        });
      })
  );
});
