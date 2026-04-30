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

## Service Worker and WebSockets

The Service Worker is responsible for caching the **App Shell** (HTML, JS, CSS, assets) so the application itself loads offline.

**Why the Service Worker does NOT intercept WebSockets:**
- **Fetch vs. Socket:** Service Workers are designed to intercept `fetch` and `navigation` requests, which follow a Request/Response pattern.
- **Protocol:** WebSockets use a completely different protocol (`ws://`) that doesn't pass through the Service Worker's `fetch` event.
- **Responsibility:** WebSocket reconnection and data synchronization are the responsibility of the `DocumentSyncManager` in the application logic, not the Service Worker.
