# AI Collaboration Architecture

The AI writing layer is integrated into the collaborative document editor strictly as a **CRDT Client**. The AI does not modify the raw text directly; instead, it generates token-by-token `Y.js` CRDT updates that are broadcasted and applied by human clients just like any other user edit.

## Design Decisions

### 1. AI Writes through Y.js (CRDT Client)
**Why not a direct string patch?**
If the AI updated the raw text (e.g., via an API call that returns a final string), any concurrent edits made by human users during the AI generation would be overwritten or lead to merge conflicts. 
By treating the AI as a CRDT client:
- **Conflict-Free:** The AI's token insertions are mathematically merged with human edits in real time.
- **Undoable:** Users can undo AI insertions step-by-step or in chunks because the history is preserved in the Y.js state.
- **Real-Time Visibility:** Clients see the AI "typing" character by character natively, rather than waiting for a massive block of text to suddenly appear.

### 2. Transaction per Token (`doc.transact()`)
**Why use `doc.transact()`?**
Each token streamed from the Anthropic API is inserted into the Y.js text object within a `doc.transact()` block. 
- Y.js tracks updates using internal vector clocks and state vectors.
- Running operations inside a transaction batches these internal updates. This is significantly more efficient than raw inserts, yielding smaller CRDT binary diffs (`Y.encodeStateAsUpdate`) per token.
- It prevents fragmented history events for every single character.

### 3. Handling Concurrent Edits
**Scenario:** A human user edits position 100 while the AI is streaming tokens at position 50.
- Because the AI insertions and human edits are both valid CRDT operations (represented as relative insertions rather than absolute indices), Y.js automatically resolves the offset adjustments.
- The user's cursor at position 100 is correctly preserved and pushed forward as the AI inserts text earlier in the document. No manual offset math is required by the backend.

### 4. Rate Limiting (Max 1 AI request per document)
**Why limit to 1 concurrent request per document?**
- Two AIs generating text at the same position simultaneously would create interleaved text (e.g., AI 1 writes "Hello", AI 2 writes "World", resulting in "HWeolrllod"). 
- While this is a perfectly valid CRDT state (no crashes or conflicts), it is an unusable and chaotic UX.
- The `GeminiAIService` enforces an in-memory lock restricting a document to 1 active AI generation stream at a time.

## Architecture

1. **Request:** Client sends `AIRequest` containing the prompt and desired `insertPosition`.
2. Context: The server pulls the latest Y.Doc text and feeds it into the Gemini prompt.
3. Stream: The Gemini API streams tokens back.
4. CRDT Diff: For each token, the server inserts it into the Y.Text object, computes the Y.encodeStateAsUpdate diff, and pushes it to the CoalesceBuffer.
5. Broadcast: The Coalesce buffer batches these AI updates (alongside concurrent human updates) and broadcasts them to all clients.

