# Offline Editing Architecture

This document explains the implementation of offline editing support in the Second Brain collaborative editor.

## Why Y.js Makes Offline Merge Trivial

Y.js uses Conflict-free Replicated Data Types (CRDTs). CRDTs are mathematically designed to ensure that concurrent operations can be merged in any order and eventually converge to the same state across all clients.

Key properties:

- **Commutativity:** The order in which updates are applied doesn't matter. `A + B = B + A`.
- **Idempotency:** Applying the same update multiple times has no effect beyond the first application.
- **Merge-ability:** Offline edits are just concurrent edits from the perspective of the server. When a client reconnects and sends its offline updates, Y.js merges them seamlessly with any updates that happened on the server while the client was away.

## Persistence Strategy: Snapshots vs. Incremental Updates

We use two distinct storage mechanisms in IndexedDB:

1.  **Full State Snapshots (`documents` store):**
    - **Why:** To enable "Instant Load". When the app opens, we can restore the entire document state from a single binary blob before even attempting to connect to the network.
    - **Optimization:** We debounce these writes (e.g., every 2 seconds) to avoid excessive disk I/O on every keystroke.

2.  **Incremental Pending Updates (`pendingUpdates` store):**
    - **Why:** For reliable synchronization. Every local edit is immediately queued as a small incremental update. If the network is down, these stay in the queue.
    - **Reconnect Flow:** Upon reconnection, we flush this queue to the server. This is more efficient than sending the entire state and ensures that no individual edit is lost.

## Browser Storage Quotas

Browser storage (IndexedDB) is not unlimited:

- **General Limit:** Most modern browsers allow up to 60-80% of total disk space for a given origin.
- **Safari:** More restrictive; it might prompt the user for permission or clear "stale" data after 7 days of inactivity if the app isn't added to the home screen.
- **Handling Limits:** Our persistence layer includes try/catch blocks for `QuotaExceededError`. In such cases, the app still works in-memory, but offline persistence for that session may be compromised.

## Service Worker and App Shell

The Service Worker (`public/sw.js`) is responsible for making the application loadable with zero network connection. It follows a **Cache-First** strategy for the app shell and static assets, while using **Network-First** for dynamic API data.

### 1. File Placement (`public/sw.js`)

The Service Worker is placed in the `public/` directory rather than `src/` because:

- **Direct Access:** Next.js serves files in `public/` at the root path (`/sw.js`), which is required for the Service Worker to have the correct scope control over the entire application.
- **No Bundling:** Service Workers are standalone scripts that run in a separate thread; keeping it in `public/` prevents it from being bundled with the main application JS, avoiding potential environment mismatches.

### 2. Caching Strategies

- **Stale-While-Revalidate (App Pages):** For HTML pages like `/` and `/documents`, we serve the cached version instantly but trigger a background network request to update the cache. This provides an "instant-on" user experience.
- **Cache-First (Static Assets):** Content-hashed files in `/_next/static/` are cached permanently. Since their names change on every build, we never risk serving outdated assets.
- **Network-First (API):** For `/api/` calls, we always attempt to fetch fresh data. If the network is down, we fall back to the last cached response to provide graceful degradation.

### 3. Update Lifecycle

- **No-Cache Header:** `sw.js` is served with `Cache-Control: no-cache`. This ensures the browser always checks for a new Service Worker script on the server.
- **Background Checks:** The `ServiceWorkerRegistration` component checks for updates every 60 seconds when the page is visible.
- **Manual Takeover:** When a new version is detected, the `UpdatePrompt` UI appears. Clicking "Update now" sends a `SKIP_WAITING` message to the new Service Worker and reloads the page to activate it immediately.
- **Session Safety:** We never auto-reload the page; updates must be user-confirmed to prevent data loss during active editing sessions.
