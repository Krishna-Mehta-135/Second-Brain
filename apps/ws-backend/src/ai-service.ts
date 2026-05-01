import * as Y from "yjs";
import { DocumentManager } from "./document-manager.js";
import { GoogleGenerativeAI, type Content, type Part } from "@google/generative-ai";

export interface AIWritingRequest {
    docId: string;
    prompt: string;
    insertPosition:
        | { type: "cursor"; offset: number }
        | { type: "append" }
        | { type: "replace"; startOffset: number; endOffset: number };
    requestId: string;
    userId: string;
}

export interface AIChunk {
    requestId: string;
    text: string;
    update: Uint8Array;
    isDone: boolean;
}

export interface AIService {
    startWriting(request: AIWritingRequest): AsyncGenerator<AIChunk>;
    cancelWriting(requestId: string): void;
}

export class GeminiAIService implements AIService {
    private readonly activeStreams = new Map<string, AbortController>();
    private readonly documentManager: DocumentManager;
    private readonly genAI: GoogleGenerativeAI;

    // Concurrency tracking (Rate limiting)
    private readonly docActiveRequests = new Map<string, number>();
    private readonly userActiveRequests = new Map<string, number>();

    public constructor(documentManager: DocumentManager) {
        this.documentManager = documentManager;
        // Use GEMINI_API_KEY from environment
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");
    }

    public cancelWriting(requestId: string): void {
        const controller = this.activeStreams.get(requestId);
        if (controller) {
            controller.abort();
            this.activeStreams.delete(requestId);
        }
    }

    public async *startWriting(request: AIWritingRequest): AsyncGenerator<AIChunk> {
        // 1. Rate Limiting Checks
        const docCount = this.docActiveRequests.get(request.docId) ?? 0;
        if (docCount >= 1) {
            throw new Error("RATE_LIMITED: Max 1 concurrent AI request per document");
        }

        const userCount = this.userActiveRequests.get(request.userId) ?? 0;
        if (userCount >= 3) {
            throw new Error("RATE_LIMITED: Max 3 concurrent AI requests per user");
        }

        // Increment tracking
        this.docActiveRequests.set(request.docId, docCount + 1);
        this.userActiveRequests.set(request.userId, userCount + 1);

        const controller = new AbortController();
        this.activeStreams.set(request.requestId, controller);

        try {
            // 2. Get the current document text for context
            const entry = await this.documentManager.getOrCreate(request.docId);
            const yText = entry.doc.getText("content");
            const currentContent = yText.toString();

            // 3. Initialize Gemini Model
            const model = this.genAI.getGenerativeModel({ 
                model: "gemini-1.5-flash",
                systemInstruction: "You are a writing assistant. Generate only the requested content, no preamble."
            });

            // 4. Stream from Gemini API
            const prompt = `Current document context:\n\n${currentContent}\n\nTask: ${request.prompt}`;
            const result = await model.generateContentStream(prompt);

            let insertOffset = 0;

            // Handle the initial position and potential replace operation
            if (request.insertPosition.type === "replace") {
                const start = Math.min(request.insertPosition.startOffset, yText.length);
                const end = Math.min(request.insertPosition.endOffset, yText.length);

                if (end > start) {
                    const stateBefore = Y.encodeStateVector(entry.doc);
                    entry.doc.transact(() => {
                        yText.delete(start, end - start);
                    });
                    const update = Y.encodeStateAsUpdate(entry.doc, stateBefore);
                    entry.isDirty = true;
                    // Yield the deletion update as the first CRDT chunk
                    yield { requestId: request.requestId, text: "", update, isDone: false };
                }
                insertOffset = start;
            } else if (request.insertPosition.type === "cursor") {
                insertOffset = Math.min(request.insertPosition.offset, yText.length);
            } else {
                insertOffset = yText.length;
            }

            // 5. For each chunk: insert into Y.Doc, encode the diff, yield
            for await (const responseChunk of result.stream) {
                // Check if aborted mid-stream
                if (controller.signal.aborted) {
                    break;
                }

                const token = responseChunk.text();
                if (!token) continue;

                // Capture state before insert
                const stateBefore = Y.encodeStateVector(entry.doc);

                // Insert token at current position. doc.transact batches the Y.js internal operations.
                entry.doc.transact(() => {
                    yText.insert(insertOffset, token);
                });
                
                insertOffset += token.length;

                // Encode only the diff (not the full document)
                const update = Y.encodeStateAsUpdate(entry.doc, stateBefore);
                entry.isDirty = true;

                yield { requestId: request.requestId, text: token, update, isDone: false };
            }

            yield { requestId: request.requestId, text: "", update: new Uint8Array(0), isDone: true };
        } catch (error: unknown) {
            if (error instanceof Error && error.name === "AbortError") {
                // Ignore AbortError, user cancelled. Partial document state is valid.
                yield { requestId: request.requestId, text: "", update: new Uint8Array(0), isDone: true };
            } else {
                throw error;
            }
        } finally {
            // Clean up state
            this.activeStreams.delete(request.requestId);

            const finalDocCount = this.docActiveRequests.get(request.docId) ?? 1;
            if (finalDocCount <= 1) {
                this.docActiveRequests.delete(request.docId);
            } else {
                this.docActiveRequests.set(request.docId, finalDocCount - 1);
            }

            const finalUserCount = this.userActiveRequests.get(request.userId) ?? 1;
            if (finalUserCount <= 1) {
                this.userActiveRequests.delete(request.userId);
            } else {
                this.userActiveRequests.set(request.userId, finalUserCount - 1);
            }
        }
    }
}
