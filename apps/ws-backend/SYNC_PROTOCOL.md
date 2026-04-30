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

## AI Integration

AI updates are treated as first-class CRDT clients.
- AI writes flow through the same `CoalesceBufferManager`.
- No special-case logic exists for AI writes, ensuring that the system remains DRY and maintainable.
- The `requestId` in `AIUpdate` is purely for client-side UI tracking (e.g., showing which AI request is currently "typing").
