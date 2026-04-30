# High-Performance Y.js Sync Protocol

This document details the architectural decisions and protocol specifications for the Second Brain realtime synchronization engine.

## Binary Protocol & Framing

To minimize garbage collection pressure and serialization overhead, we use a custom binary protocol instead of JSON. 

**Frame Structure:**
`[1 byte: MessageType Enum] [Remaining: Payload]`

By avoiding `JSON.parse` and `JSON.stringify` on every message, we keep the event loop free for CRDT computation and I/O.

## Two-Phase Sync Handshake

We use a two-phase state vector exchange to ensure that synchronization is both complete and efficient.

1.  **Step 1 (State Vector Exchange):** Both parties exchange their current `State Vector`. A state vector is a compact summary of all known clocks in a Y.js document.
2.  **Step 2 (Targeted Diff):** Each party computes the exact binary diff required to bring the other party up to date using `Y.encodeStateAsUpdate(doc, remoteStateVector)`.

**Critical Performance Rule:** Never send a full document dump (sending an update without a state vector). This prevents O(N^2) bandwidth usage where N is the document size.

## Update Coalescing

The `CoalesceBufferManager` is the most critical performance feature in the system.

### Why 16ms?
16ms corresponds to one frame at 60fps (the refresh rate of most monitors). Human persistence of vision is roughly in this range. Updates faster than 16ms are invisible to the user but generate significant network and CPU overhead. By "snapping" updates to 16ms frames, we achieve:
- **Batching:** Multiple characters typed in a burst are sent as one packet.
- **Merge Efficiency:** `Y.mergeUpdates` combines multiple small updates into a single, more compressed binary blob.

### Bandwidth Math
- **Without Coalescing:** 60 updates/s * 10 clients in a room * 50 bytes/msg = **30KB/s per active typist.**
- **With Coalescing (16ms):** 4 updates/s * 10 clients * (~150 bytes merged) = **~6KB/s per active typist.**
- **Message Count:** 600 WebSocket sends/s vs 40 WebSocket sends/s. A **93% reduction** in message overhead.

## CRDT Order-Independence

Traditional synchronization requires sequence numbers or global locks to handle conflicts. Y.js CRDTs are **order-independent (commutative)** and **idempotent**. 
- We **do not** add sequence numbers because they are redundant and would break under offline-editing scenarios.
- The system converges regardless of the arrival order of updates, provided they are all eventually delivered.

## Network Resilience & Backpressure

### Head-of-Line (HOL) Blocking
In a collaborative environment, the server must broadcast updates to many clients simultaneously. A traditional approach using sequential sends or `Promise.all` suffers from HOL blocking: if one client has a slow connection, the server's outgoing queue for that room stalls, increasing latency for everyone.

Our `RoomManager` solves this by:
1.  **Concurrent Broadcasting:** Using `Promise.allSettled` so that one failed or slow send doesn't stop others.
2.  **Backpressure Awareness:** Monitoring the OS-level TCP send buffer via `ws.bufferedAmount`.

### The `bufferedAmount` Metric
`ws.bufferedAmount` measures the number of bytes currently queued in the kernel's send buffer. 
- **High value (>1MB):** Indicates a congested client. The network cannot keep up with the update frequency.
- **Action:** We skip sending the update to that specific client.

### Backpressure + Coalescing
Skipping an update is safe because of our **CRDT-First** design and **Update Coalescing**:
- Y.js updates are idempotent and commutative.
- When a congested client's buffer clears, they will receive a merged update in the next 16ms window that contains the entire missing state.
- This "jump-ahead" mechanism ensures that slow clients don't degrade the experience for the rest of the room while still eventually converging to the same state.

## AI Integration

AI updates are treated as first-class CRDT clients.
- AI writes flow through the same `CoalesceBufferManager`.
- No special-case logic exists for AI writes, ensuring that the system remains DRY and maintainable.
- The `requestId` in `AIUpdate` is purely for client-side UI tracking (e.g., showing which AI request is currently "typing").

## Horizontal Scalability

To support multiple backend instances, we use Redis Pub/Sub as a message bridge.

### Why In-Memory Maps Fail
In a single-instance setup, the `RoomManager` maintains an in-memory registry of all clients. In a distributed setup, clients in the same "room" (document) may be connected to different physical servers. Without a bridge, their `Y.Doc` instances would diverge as updates are only broadcast to local peers.

### Redis Pub/Sub Architecture
We use a **Fire-and-Forget** Pub/Sub model:
1. **Local Update:** A client sends an update to Instance A.
2. **Local Apply:** Instance A applies the update to its local `Y.Doc` and broadcasts it to other local clients.
3. **Redis Publish:** Instance A publishes the update to a Redis channel `crdt:updates:{docId}`.
4. **Remote Receive:** Instance B (subscribed to the same channel) receives the update, applies it to its local `Y.Doc`, and broadcasts it to its local clients.

**Performance Note:** Publishing to Redis is fire-and-forget. We do not await the Redis acknowledgement in the WebSocket handler to avoid adding 5-15ms of latency to the critical path.

### Failure Recovery
If Instance B is offline when Instance A publishes, B will miss that specific update. However, the system remains eventually consistent because:
- When Instance B restarts or a new client connects, it performs a **Two-Phase Sync Handshake**.
- This handshake exchanges state vectors and fetches all missing data, including updates missed during the downtime.

### Redis Streams Migration Path
If missed updates during brief instance restarts cause visible "flicker" or performance issues due to heavy handshake recovery, we can migrate from Pub/Sub to **Redis Streams**.
- **Streams Advantages:** Message persistence, consumer groups, and replay capabilities.
- **Trigger:** Visible document gaps during instance rolling updates or high message loss in Redis.
- **Migration:** Replace `pub.publish` with `XADD` and use `XREADGROUP` to ensure no updates are missed during transient connection losses.

