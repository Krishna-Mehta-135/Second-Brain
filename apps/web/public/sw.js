// public/sw.js
// Version this cache — increment when deploying breaking changes
const CACHE_VERSION = "v1";
const SHELL_CACHE = `second-brain-shell-${CACHE_VERSION}`;
const API_CACHE = `second-brain-api-${CACHE_VERSION}`;

// App shell files to cache on install
const SHELL_URLS = ["/", "/documents", "/signin", "/signup"];

// Install — cache app shell immediately
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then(async (cache) => {
        // addAll fails if ANY request fails — use individual adds for resilience
        await Promise.allSettled(
          SHELL_URLS.map((url) =>
            cache
              .add(url)
              .catch((err) => console.warn(`SW: Failed to cache ${url}:`, err)),
          ),
        );
      })
      .then(() => {
        // In a multi-tab scenario this can cause issues — we let the user trigger it via SKIP_WAITING
        // but we can also skipWaiting here if we want immediate takeover.
        // For now, we'll wait for the message from the UI.
      }),
  );
});

// Activate — clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      // Delete caches from old versions
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SHELL_CACHE && key !== API_CACHE)
            .map((key) => {
              console.log(`SW: Deleting old cache: ${key}`);
              return caches.delete(key);
            }),
        ),
      ),
      // Take control of all open tabs immediately
      self.clients.claim(),
    ]),
  );
});

// Message handler for updates
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Fetch — intercept HTTP requests
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // NEVER intercept:
  // 1. WebSocket connections (ws:// or wss://) — not fetch, so never hits here
  // 2. Chrome extensions
  // 3. Non-GET methods (POST, PUT, DELETE — these are mutations)
  if (request.method !== "GET") return;
  if (!url.protocol.startsWith("http")) return;

  // API calls — network first, fall back to cache
  if (url.pathname.includes("/api/")) {
    event.respondWith(networkFirstWithCache(request, API_CACHE));
    return;
  }

  // Next.js internal paths — network only (/_next/webpack-hmr, etc.)
  if (url.pathname.startsWith("/_next/webpack")) return;

  // Next.js static assets (_next/static) — cache first (content-hashed, safe to cache forever)
  if (url.pathname.includes("/_next/static/")) {
    event.respondWith(cacheFirstWithNetwork(request, SHELL_CACHE));
    return;
  }

  // App pages — cache first for instant load, network to update cache (stale-while-revalidate)
  event.respondWith(staleWhileRevalidate(request, SHELL_CACHE));
});

// Cache strategies

async function cacheFirstWithNetwork(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("Offline", { status: 503 });
  }
}

async function networkFirstWithCache(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: "Offline" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  // Revalidate in background regardless of whether we have cache
  const networkFetch = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  // Return cache immediately if available, else wait for network
  return (
    cached ?? (await networkFetch) ?? new Response("Offline", { status: 503 })
  );
}
