const CACHE_NAME = 'carouselforge-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Nunca cachear o endpoint de dados nem uploads (sempre rede)
  if (url.pathname.includes('/data') || event.request.method !== 'GET') {
    event.respondWith(fetch(event.request).catch(() => {
      if (url.pathname.includes('/data')) {
        return new Response(JSON.stringify({ carousels: [], updatedAt: 0 }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return caches.match('/index.html');
    }));
    return;
  }

  // Para o resto: cache-first com fallback de rede
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) return response;
        return fetch(event.request).then(networkResponse => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        }).catch(() => caches.match('/index.html'));
      })
  );
});