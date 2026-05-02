# Document Synchronization Engine

This document explains the technical architecture and design decisions of the collaborative synchronization engine.

## 1. Echo Loop Prevention via `remote` Origin

In Y.js, every document update can be tagged with an **origin**. Without this, the system cannot distinguish between a change the user just typed and a change that arrived from the server.

- **The Loop**: Server sends update → Client applies it → Y.Doc emits an 'update' event → Client (thinking it's a new local change) sends it back to the server → Server broadcasts it again.
- **The Fix**: By tagging server updates with the `remote` origin, the `SyncManager`'s update listener can explicitly skip them:
  ```typescript
  this.doc.on("update", (update, origin) => {
    if (origin === "remote") return; // Break the cycle
    // ... send to server
  });
  ```

## 2. Local-First: IndexedDB Restore

On slow connections (3G/4G), the WebSocket handshake can take 300ms to 1500ms.

- **Problem**: Users see a blank screen while waiting for the network.
- **Solution**: We restore the last known state from IndexedDB _before_ connecting. This allows the document to be rendered in **<50ms**.
- **Consistency**: The WebSocket handshake then reconciles the local state with the server's authoritative state, filling in any missing updates.

## 3. Two-Phase Handshake

`flushPendingUpdates` only runs after the handshake is complete (`sync-step-2`).

- **Phase 1**: Client sends `stateVector`. Server responds with missing updates.
- **Phase 2**: Client applies server updates and sets `syncComplete = true`.
- **Why wait?**: If we flush pending updates before the handshake, we risk sending updates the server already has (e.g., from a previous session). Waiting ensures we only push unique offline deltas, saving bandwidth and preventing redundant broadcasts.

## 4. The `destroyed` Flag Pattern

JavaScript is asynchronous, and React's `useEffect` cleanup can run while async tasks are pending.

- **The Race**: A component unmounts and calls `destroy()`, but an earlier `connect()` call is still awaiting a token. Without a guard, `connect()` would proceed and open an orphaned WebSocket.
- **The Guard**: The `destroyed` flag acts as a circuit breaker. Every asynchronous step in the manager checks this flag. If it's set to `true`, the operation aborts immediately, preventing memory leaks and ghost connections.

## 5. IndexedDB Durability

We use a debounced snapshot pattern (2s) to persist the full Y.Doc state to IndexedDB. Individual updates are queued immediately in the `pendingUpdates` store. This ensures that even if the tab is closed suddenly, the user's work is safe and will be synced upon their next visit.

## 6. Real-time Presence (Awareness)

Presence tracking (cursors, active users) is implemented using the **Y.js Awareness Protocol**. This is a separate, ephemeral communication channel that operates independently of the permanent CRDT document state.

### Ephemeral by Design

Presence data is **never persisted** to the database or IndexedDB.

- **Why?**: Document state is intended to be permanent, while presence is transient. Merging them would result in every cursor movement being saved forever, bloating the document and leaking privacy.
- **Lifecycle**: When a user disconnects, their presence disappears. This is handled by setting the local state to `null` on cleanup, which broadcasts a removal signal to all other clients.

### Heartbeat and Timeouts

To handle "ghost users" caused by unexpected network drops or backgrounded tabs:

- **Heartbeat (15s)**: Every client broadcasts a `lastSeen` timestamp every 15 seconds.
- **Active Window (30s)**: Clients filter the collaborator list to only show users who have been seen in the last 30 seconds. This ensures the UI remains accurate even if a client fails to send a clean disconnect signal.

### Architecture

- **AwarenessManager**: A dedicated class that manages the local presence state and links the Awareness protocol to the `SyncManager` transport.
- **Binary Encoding**: Presence updates are binary-encoded using `y-protocols/awareness` to minimize network overhead during high-frequency events like typing or cursor movement.

## 7. Collaborative Document Title

The document title is not just a database field; it is a first-class CRDT citizen.

### Why in Y.Doc?

Storing the title in the Y.Doc (as a `Y.Text` field named 'title') ensures that if two users edit the title simultaneously, their changes are merged according to standard CRDT rules. If the title were only in the database, the last write would always win, potentially erasing a collaborator's work.

### Why contentEditable?

We use a `contentEditable` `h1` element instead of a standard `input`. This allows the title to wrap naturally like a document heading and provides a more immersive "document-first" feel.

## 8. Real-time Statistics and Deep Observation

Word and character counts are computed in real-time by traversing the `Y.XmlFragment` that stores the document content.

### Deep Observation

Because Tiptap stores content as a nested tree of XML elements and text nodes, a shallow `observe` call on the fragment would only trigger when direct children (like paragraphs) are added or removed. To catch text edits _inside_ those paragraphs, we use `observeDeep`, which recursively monitors the entire content tree.
