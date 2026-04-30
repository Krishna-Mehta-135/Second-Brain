const CACHE_NAME = 'second-brain-v1';
const APP_SHELL = [
  '/',
  '/index.html',
  '/signin',
  '/signup',
  '/dashboard',
  '/globals.css',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL);
    })
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Ensure that the service worker takes control of the page immediately
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only cache GET requests
  if (request.method !== 'GET') return;

  // Never cache API calls or WebSocket upgrades
  if (url.pathname.includes('/api/') || url.pathname.includes('/ws/')) return;

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then((response) => {
        // Don't cache if not a success response or not from our origin
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });

        return response;
      }).catch(() => {
        // If fetch fails (offline) and no cache, we might want to return an offline page
        if (request.mode === 'navigate') {
          return caches.match('/');
        }
      });
    })
  );
});
