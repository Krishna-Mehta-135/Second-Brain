// public/sw.js
// Version this cache — increment when deploying breaking changes
const CACHE_VERSION = "v3";
const SHELL_CACHE = `second-brain-shell-${CACHE_VERSION}`;
const API_CACHE = `second-brain-api-${CACHE_VERSION}`;

// App shell files to cache on install
const SHELL_URLS = ["/documents"];

// Install — cache app shell immediately
self.addEventListener("install", (event) => {
  self.skipWaiting(); // Force immediate activation
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

  // Handle navigation requests separately to manage redirects correctly
  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
    return;
  }

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
  // EXCEPT for the root path ('/'), which we always fetch fresh to avoid hydration "ghosting"
  // AND for auth pages which should also be fresh to avoid stale session state UI
  if (
    url.pathname === "/" ||
    url.pathname === "" ||
    url.pathname === "/login" ||
    url.pathname === "/register"
  ) {
    return; // Let browser handle these normally via network
  }

  // For /documents, we cache the shell for instant UI loading
  if (url.pathname.startsWith("/documents")) {
    event.respondWith(staleWhileRevalidate(request, SHELL_CACHE));
    return;
  }

  // Default fetch behavior for other requests
  // ...
});

async function handleNavigation(request) {
  try {
    // For navigation requests, we fetch and allow the browser to handle redirects
    // if we return an opaqueredirect. Or we can follow them ourselves.
    // The simplest is to use staleWhileRevalidate but handle the redirect case.
    const cache = await caches.open(SHELL_CACHE);
    const cached = await cache.match(request);

    const networkFetch = fetch(request).then((response) => {
      // If the response is redirected, don't cache it
      if (response.ok && !response.redirected) {
        cache.put(request, response.clone());
      }
      return response;
    });

    // If it's a navigation, we want to return the redirected response to the browser
    // so it can follow it, BUT if the browser's redirect mode is 'manual',
    // we must return the opaqueredirect response.
    // fetch(request) does this automatically if request.redirect is 'manual'.

    return cached ?? (await networkFetch);
  } catch {
    return caches.match(request) || new Response("Offline", { status: 503 });
  }
}

// Cache strategies

async function cacheFirstWithNetwork(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    // Cannot cache a redirected response if we want to return it as a FetchEvent result
    // for a navigation request (where redirect mode is often 'manual')
    if (response.ok && !response.redirected) {
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
    if (response.ok && !response.redirected) {
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
      // Don't cache redirected responses for navigation requests
      if (
        response.ok &&
        !response.redirected &&
        response.type !== "opaqueredirect"
      ) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch((err) => {
      console.warn("SW: Background revalidate failed", err);
      return null;
    });

  // Return cache immediately if available, else wait for network
  const response = cached ?? (await networkFetch);
  return response ?? new Response("Offline", { status: 503 });
}
