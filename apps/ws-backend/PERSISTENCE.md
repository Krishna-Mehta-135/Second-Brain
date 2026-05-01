# Persistence Layer Architecture

## Design Decisions

### 1. Flush-Time State Capture (Avoiding Stale Closures)
`PersistenceService.scheduleWrite` takes a `getState` callback rather than the `Uint8Array` state itself.
- **Why:** If we captured the state at the time of scheduling (e.g., when a user types 'A'), and the debounce timer is 2 seconds, and the user continues typing 'BC', the scheduled write would save 'A' instead of 'ABC'.
- **Solution:** By calling `getState()` only when the timer expires (at flush time), we ensure that the most recent document state is persisted, regardless of how many updates occurred during the debounce window.

### 2. The Offline Sync Safety Net
The system is designed to be resilient even in the event of a `SIGKILL` or power failure that results in data loss (up to 2 seconds).
- **Client Resilience:** Every client maintains the full CRDT state in their local IndexedDB.
- **Two-Phase Handshake:** On reconnect, the server and client exchange state vectors. If the server is "behind" because its last 2 seconds of edits were not flushed before a crash, the client's sync step will identify the missing blocks and send them to the server.
- **Result:** The server "heals" its state using the client's data.

### 3. Debounce Strategy: 2s vs 5s
We use a **2-second debounce** interval (shorter than the common 5s).
- **Trade-off:** Shorter intervals increase the number of database writes but ensure that the persisted state is fresher.
- **Reconnect Performance:** When a client reconnects (especially an "offline reconnect"), the server needs to load the document from the DB. A fresher DB state means the client has to send fewer catch-up updates, leading to a faster "warm-up" and better user experience.

### 4. Next Evolution: Write-Ahead Log (WAL)
While the current system is highly resilient, the next step for zero-data-loss guarantees is a WAL.
- **Current Limitation:** A crash during the debounce window loses in-memory updates.
- **WAL Benefit:** Every incoming update would be appended to a fast, durable log (like Redis AOF or a local file) before being applied to the in-memory Y.Doc.
- **Recovery:** On restart, the server would load the last snapshot from the DB and then "replay" all updates from the WAL that are newer than the snapshot.

## Data Loss Analysis Summary
- **Graceful Shutdown (SIGTERM/SIGINT):** 0 data loss (all documents flushed).
- **Process Crash (SIGKILL/OOM):** Up to 2 seconds of edits lost in the DB.
- **Mitigation:** Self-healing via client-side CRDT state.
