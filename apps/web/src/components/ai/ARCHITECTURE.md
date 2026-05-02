# AI Writing Architecture

The AI writing panel is designed to provide a low-latency, collaborative writing experience. Below is the technical rationale for the architectural choices made.

## 1. WebSocket-based Communication

AI requests and updates flow through the existing WebSocket connection (`SyncManager`) rather than a standard HTTP endpoint.

- **Sequential Consistency:** By using the same channel as CRDT updates, AI-generated content arrives in the correct sequence relative to other user edits.
- **Zero-Config Authentication:** The WebSocket is already authenticated. Using it avoids repeating auth headers or managing separate session tokens for AI.
- **Native Streaming:** WebSockets are inherently bi-directional and long-lived, making them ideal for streaming tokens from LLMs without the overhead of Server-Sent Events (SSE) or long-polling.
- **Infrastructure Simplicity:** No additional CORS configuration or API gateway routing is needed for the AI service.

## 2. Server-Side Cancellation

When a user clicks "Cancel" in the UI, an `ai-cancel` message is sent to the backend.

- **Cost Efficiency:** AI providers (like Anthropic) charge per token. Stopping the stream at the source prevents generating unnecessary tokens that would never be seen.
- **Bandwidth Conservation:** Without server-side cancellation, the backend would continue broadcasting `ai-update` messages to all collaborators, wasting egress bandwidth.
- **Document Integrity:** Immediate cancellation prevents the AI from continuing to append content to the Y.Doc after the user has decided to stop, reducing noise in the document history.

## 3. Request Tracking with `requestId`

Every AI request is tagged with a unique `requestId` (UUID v4).

- **Concurrency Control:** The `useAIWriter` hook uses the `requestId` to filter incoming `ai-update` messages. This ensures that if a user rapidly triggers multiple requests (despite UI guards), the hook only reacts to the correct stream.
- **Conflict Resolution:** If multiple AI agents were to write to the same document, `requestId` allows the backend and frontend to distinguish between their individual streams.
- **Resource Cleanup:** It allows the server to identify exactly which generation process to terminate when a specific `ai-cancel` is received.
