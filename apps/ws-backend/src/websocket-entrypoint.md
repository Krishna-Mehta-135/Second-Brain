# WebSocket Entry Point Notes

## Why post-connection auth has a race condition

If authentication happens after the WebSocket is already established, the server has a window where the socket exists but the async token check has not finished yet. During that window, the client can send frames immediately. That creates a race where unauthorized messages can reach application handlers before auth resolves, especially under event-loop pressure or slow dependency calls.

Performing auth inside the HTTP upgrade path closes that gap. The server either rejects the upgrade with an HTTP status line or finishes authentication before `handleUpgrade` is ever called, so no application bytes flow on an unauthenticated socket.

## Why warm-up belongs in the upgrade handler

Document warm-up is part of connection admission, not room membership. The client needs the `Y.Doc` ready before the socket is considered open, otherwise the server can accept the connection and only then begin waiting on document hydration. That produces a connected client with no state ready to sync against, which is exactly the wrong side of the boundary for a collaborative editor.

Keeping warm-up in the upgrade handler makes the latency invisible to the client because the handshake is still in progress. By the time the connection is emitted to downstream handlers, the document is already resident in memory and ready for the sync handshake.

## How zombie connections corrupt TTL eviction

Zombie sockets keep room membership alive after the client is actually gone. If those stale members are never removed, `clientCount` on the document never reaches zero. Once that happens, the eviction timer is never scheduled, the `Y.Doc` remains pinned in memory, and the registry leaks hot state indefinitely.

That leak is worse than just extra memory use. A stale non-zero client count also breaks lifecycle assumptions for reconnect behavior, dirty flush timing, and capacity planning because the server believes documents are actively in use when they are not.

## Why mobile networks produce zombies

Mobile networks often drop idle TCP state at the carrier NAT or radio boundary without delivering a clean FIN or RST back to the server. The client disappears from the network path, but the server-side socket can remain open until it next tries to use it and notices the peer is gone.

That is why heartbeat-based liveness detection is required. The watchdog periodically forces traffic on the connection and terminates sockets that stop answering pings, which is the only reliable way to clear dead mobile sessions in the absence of a proper TCP shutdown signal.
