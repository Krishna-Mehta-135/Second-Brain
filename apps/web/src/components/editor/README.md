# Tiptap + Y.js Integration

This directory contains the real-time collaborative rich text editor integrated with Y.js.

## Mandatory Configurations

### 1. `immediatelyRender: false`

**Why:** Next.js uses Server-Side Rendering (SSR). Y.js `Y.Doc` and many Tiptap extensions rely on browser-only APIs. If the editor tries to render on the server, it will crash or produce HTML that doesn't match the client-side render, leading to hydration errors. Setting `immediatelyRender: false` ensures the editor only initializes on the client.

### 2. `history: false` in StarterKit

**Why:** Tiptap's built-in history extension stores ProseMirror transactions. In a collaborative environment, reversing a ProseMirror transaction creates a _new_ Y.js operation. Other clients see this "undo" as a new edit, not an undo, which breaks the CRDT logic.
**Solution:** Use `Y.UndoManager`, which is CRDT-aware and reverses the Y.js operations themselves.

### 3. `captureTimeout: 500` in `Y.UndoManager`

**Why:** Without a capture timeout, every single character typed would be a separate item on the undo stack. Users expect `Cmd+Z` to undo a word or a phrase. A 500ms timeout groups edits made in quick succession into a single natural undo step.

### 4. `doc` in `useEditor` dependency array

**Why:** If a user switches between documents, the `doc` (Y.Doc) reference changes. If `doc` is not in the dependency array, the editor will continue to be bound to the old Y.Doc instance, leading to data being synced to the wrong document or not syncing at all.

### 5. `field: 'content'` matching

**Why:** The `Collaboration` extension must track the same `Y.XmlFragment` (e.g., `'content'`) that the backend and the `Y.UndoManager` are using. If these don't match, sync or undo/redo will be broken.
