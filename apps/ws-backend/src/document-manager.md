# Document Manager Notes

## Why in-memory storage fails horizontally

An in-memory `Y.Doc` registry only works when every client for a document is pinned to the same process. The moment two backend instances accept traffic for the same `docId`, each process builds its own `Y.Doc` and each copy advances independently. Without a shared coordination layer, the instances diverge because updates applied on instance A never become visible to instance B until some later persistence round-trip, and by then each side may already have accepted further edits against stale state.

That means the registry in this process can only be the source of truth for a single-node deployment. A production multi-instance topology needs cross-instance state propagation or a shared warm-cache layer so the local `Y.Doc` does not become a fork.

## Thundering herd and the in-flight promise guard

The thundering herd appears when many clients connect to the same document before the first load from persistence finishes. If every request sees a missing registry entry and independently calls the database, the backend creates redundant `Y.Doc` instances, performs duplicate I/O, and races to decide which copy becomes canonical in memory.

The fix is to insert a placeholder entry into the registry before any asynchronous load begins. That placeholder owns a `loadPromise`, and every concurrent caller awaits the same promise instead of issuing a second load. Once hydration completes, the promise is cleared and the fully-loaded `DocEntry` becomes the reusable singleton for that `docId` inside the process.

## Memory sizing and eviction tuning

`Y.Doc` memory usage is not just the serialized document bytes. A practical planning estimate is roughly `~2 MB` of runtime overhead per live document plus the encoded CRDT content and index structures that scale with document history. This matters because a registry with even a few hundred mostly-idle documents can consume hundreds of megabytes before user payload size becomes the dominant factor.

That is why the eviction timer exists. The `45s` grace period is long enough to absorb refreshes, mobile reconnects, and tab switches without thrashing persistence, but short enough to stop idle documents from occupying memory indefinitely. Production tuning should be driven by reconnect behavior, document cardinality, and observed process RSS.

## What production adds

A single-process in-flight promise guard only prevents duplicate loads inside one Node.js instance. In production, a horizontally scaled system usually adds a Redis `SETNX`-style distributed lock before the database load path so only one instance performs cold hydration for a document at a time.

Many deployments also keep Redis-backed `Y.Doc` snapshots or encoded updates as a warm cache. That gives new instances a fast cross-instance hydration path and reduces direct database pressure while still letting the process-local registry serve hot documents with low latency.
