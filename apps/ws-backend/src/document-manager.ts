    import * as Y from "yjs";

    const DEFAULT_EVICTION_TTL_MS = 45_000;
    const BASE_DOC_MEMORY_BYTES = 2 * 1024 * 1024;

    export interface DocEntry {
        doc: Y.Doc;
        clientCount: number;
        evictionTimer: NodeJS.Timeout | null;
        lastAccessed: number;
        isDirty: boolean;
        loadPromise: Promise<DocEntry> | null;
    }

    export type DocRegistry = Map<string, DocEntry>;

    export type Result<T, E> =
        | { ok: true; value: T }
        | { ok: false; error: E };

    export interface CRDTError {
        code:
            | "DOCUMENT_LOAD_FAILED"
            | "DOCUMENT_NOT_FOUND"
            | "DOCUMENT_STILL_LOADING"
            | "DOCUMENT_STATE_ENCODE_FAILED"
            | "DOCUMENT_UPDATE_FAILED"
            | "DOCUMENT_FLUSH_FAILED"
            | "DOCUMENT_CLIENT_COUNT_UNDERFLOW";
        message: string;
        // External libraries can throw non-Error values, so the cause must preserve the original payload.
        cause?: unknown;
    }

    type DocumentEvent =
        | "document:created"
        | "document:loaded"
        | "document:update-applied"
        | "document:update-failed"
        | "document:eviction-scheduled"
        | "document:eviction-cancelled"
        | "document:eviction-executed"
        | "document:destroyed";

    interface StructuredLogEntry {
        event: DocumentEvent;
        docId: string;
        clientCount: number;
        registrySize: number;
        memoryEstimateBytes: number;
        timestamp: string;
    }

    export interface DocumentManagerOptions {
        loadSnapshot: (docId: string) => Promise<Uint8Array | null>;
        flushSnapshot: (docId: string, state: Uint8Array) => Promise<void>;
        evictionTtlMs?: number;
        logger?: (entry: StructuredLogEntry) => void;
        onError?: (error: CRDTError) => void;
        now?: () => number;
    }

    export class DocumentManager {
        private readonly registry: DocRegistry = new Map<string, DocEntry>();
        private readonly loadSnapshot: DocumentManagerOptions["loadSnapshot"];
        private readonly flushSnapshot: DocumentManagerOptions["flushSnapshot"];
        private readonly evictionTtlMs: number;
        private readonly logger: NonNullable<DocumentManagerOptions["logger"]>;
        private readonly onError: NonNullable<DocumentManagerOptions["onError"]>;
        private readonly now: NonNullable<DocumentManagerOptions["now"]>;

        public constructor(options: DocumentManagerOptions) {
            this.loadSnapshot = options.loadSnapshot;
            this.flushSnapshot = options.flushSnapshot;
            this.evictionTtlMs = options.evictionTtlMs ?? DEFAULT_EVICTION_TTL_MS;
            this.logger = options.logger ?? ((entry) => console.log(JSON.stringify(entry)));
            this.onError = options.onError ?? (() => undefined);
            this.now = options.now ?? (() => Date.now());
        }

        public async getOrCreate(docId: string): Promise<DocEntry> {
            const existing = this.registry.get(docId);
            if (existing) {
                existing.lastAccessed = this.now();

                if (existing.loadPromise) {
                    return existing.loadPromise;
                }

                return existing;
            }

            const placeholder = this.createEmptyEntry();
            const loadPromise = this.loadDocument(docId, placeholder);

            placeholder.loadPromise = loadPromise;
            this.registry.set(docId, placeholder);

            return loadPromise;
        }

        public async applyUpdate(docId: string, update: Uint8Array): Promise<Result<void, CRDTError>> {
            let entry: DocEntry;

            try {
                entry = await this.getOrCreate(docId);
            } catch (error: unknown) {
                return err(this.normalizeError(error, "DOCUMENT_LOAD_FAILED", docId));
            }

            try {
                // A malformed update must be isolated to the call site instead of surfacing as an unhandled
                // exception that can poison the connection lifecycle around the shared in-memory document.
                Y.applyUpdate(entry.doc, update);
            } catch (error: unknown) {
                this.log("document:update-failed", docId, entry);

                return err({
                    code: "DOCUMENT_UPDATE_FAILED",
                    message: `Failed to apply update for document "${docId}".`,
                    cause: error,
                });
            }

            entry.isDirty = true;
            entry.lastAccessed = this.now();
            this.log("document:update-applied", docId, entry);

            return ok(undefined);
        }

        public getState(docId: string): Uint8Array | null {
            const entry = this.registry.get(docId);
            if (!entry || entry.loadPromise) {
                return null;
            }

            entry.lastAccessed = this.now();

            try {
                return Y.encodeStateAsUpdate(entry.doc);
            } catch (error: unknown) {
                this.onError({
                    code: "DOCUMENT_STATE_ENCODE_FAILED",
                    message: `Failed to encode state for document "${docId}".`,
                    cause: error,
                });

                return null;
            }
        }

        public getStateVector(docId: string): Uint8Array | null {
            const entry = this.registry.get(docId);
            if (!entry || entry.loadPromise) {
                return null;
            }

            entry.lastAccessed = this.now();

            try {
                return Y.encodeStateVector(entry.doc);
            } catch (error: unknown) {
                this.onError({
                    code: "DOCUMENT_STATE_ENCODE_FAILED",
                    message: `Failed to encode state vector for document "${docId}".`,
                    cause: error,
                });

                return null;
            }
        }

        public incrementClients(docId: string): void {
            const entry = this.registry.get(docId);
            if (!entry || entry.loadPromise) {
                return;
            }

            entry.clientCount += 1;
            entry.lastAccessed = this.now();

            if (entry.evictionTimer) {
                clearTimeout(entry.evictionTimer);
                entry.evictionTimer = null;
                this.log("document:eviction-cancelled", docId, entry);
            }

        }

        public decrementClients(docId: string): void {
            const entry = this.registry.get(docId);
            if (!entry || entry.loadPromise) {
                return;
            }

            if (entry.clientCount === 0) {
                this.onError({
                    code: "DOCUMENT_CLIENT_COUNT_UNDERFLOW",
                    message: `Document "${docId}" client count cannot go below zero.`,
                });

                return;
            }

            entry.clientCount -= 1;
            entry.lastAccessed = this.now();

            if (entry.clientCount === 0 && !entry.evictionTimer) {
                // The grace window absorbs fast reconnects so short network blips do not force a reload/writeback cycle.
                entry.evictionTimer = setTimeout(() => {
                    void this.handleEvictionTimer(docId, entry);
                }, this.evictionTtlMs);

                this.log("document:eviction-scheduled", docId, entry);
            }

        }

        public async destroy(docId: string): Promise<void> {
            const existing = this.registry.get(docId);
            if (!existing) {
                return;
            }

            if (existing.loadPromise) {
                await existing.loadPromise;
            }

            const entry = this.registry.get(docId);
            if (!entry) {
                return;
            }

            if (entry.evictionTimer) {
                clearTimeout(entry.evictionTimer);
                entry.evictionTimer = null;
            }

            if (entry.isDirty) {
                const flushResult = await this.flushEntry(docId, entry);
                if (!flushResult.ok) {
                    this.onError(flushResult.error);
                    return;
                }
            }

            // Y.Doc retains observers internally; explicit destruction is required to release them on eviction.
            entry.doc.destroy();
            this.registry.delete(docId);
            this.log("document:destroyed", docId, entry);
        }

        private async loadDocument(docId: string, entry: DocEntry): Promise<DocEntry> {
            let snapshot: Uint8Array | null;

            try {
                snapshot = await this.loadSnapshot(docId);
            } catch (error: unknown) {
                const loadError = this.normalizeError(error, "DOCUMENT_LOAD_FAILED", docId);
                this.cleanupFailedLoad(docId, entry);
                this.onError(loadError);
                throw loadError;
            }

            if (snapshot) {
                try {
                    Y.applyUpdate(entry.doc, snapshot);
                } catch (error: unknown) {
                    const hydrateError: CRDTError = {
                        code: "DOCUMENT_LOAD_FAILED",
                        message: `Failed to hydrate document "${docId}" from persisted state.`,
                        cause: error,
                    };

                    this.cleanupFailedLoad(docId, entry);
                    this.onError(hydrateError);
                    throw hydrateError;
                }
            }

            entry.loadPromise = null;
            entry.lastAccessed = this.now();
            this.log(snapshot ? "document:loaded" : "document:created", docId, entry);

            return entry;
        }

        private async flushEntry(docId: string, entry: DocEntry): Promise<Result<void, CRDTError>> {
            let state: Uint8Array;

            try {
                state = Y.encodeStateAsUpdate(entry.doc);
            } catch (error: unknown) {
                return err({
                    code: "DOCUMENT_STATE_ENCODE_FAILED",
                    message: `Failed to encode state for document "${docId}" before flush.`,
                    cause: error,
                });
            }

            try {
                await this.flushSnapshot(docId, state);
            } catch (error: unknown) {
                return err({
                    code: "DOCUMENT_FLUSH_FAILED",
                    message: `Failed to flush document "${docId}" to persistence.`,
                    cause: error,
                });
            }

            entry.isDirty = false;
            return ok(undefined);
        }

        private async handleEvictionTimer(docId: string, expectedEntry: DocEntry): Promise<void> {
            const current = this.registry.get(docId);
            if (!current || current !== expectedEntry || current.loadPromise || current.clientCount !== 0) {
                return;
            }

            current.evictionTimer = null;
            await this.destroy(docId);
            if (!this.registry.has(docId)) {
                this.log("document:eviction-executed", docId, current);
            }
        }

        private createEmptyEntry(): DocEntry {
            return {
                doc: new Y.Doc(),
                clientCount: 0,
                evictionTimer: null,
                lastAccessed: this.now(),
                isDirty: false,
                loadPromise: null,
            };
        }

        private log(event: DocumentEvent, docId: string, entry: DocEntry): void {
            this.logger({
                event,
                docId,
                clientCount: entry.clientCount,
                registrySize: this.registry.size,
                memoryEstimateBytes: this.estimateRegistryMemoryBytes(),
                timestamp: new Date(this.now()).toISOString(),
            });
        }

        private estimateRegistryMemoryBytes(): number {
            let total = 0;

            for (const entry of this.registry.values()) {
                total += BASE_DOC_MEMORY_BYTES;

                if (entry.loadPromise) {
                    continue;
                }

                try {
                    total += Y.encodeStateAsUpdate(entry.doc).byteLength;
                } catch {
                    total += 0;
                }
            }

            return total;
        }

        private cleanupFailedLoad(docId: string, entry: DocEntry): void {
            const current = this.registry.get(docId);
            if (current === entry) {
                this.registry.delete(docId);
            }

            entry.doc.destroy();
        }

        private normalizeError(
            error: unknown,
            code: CRDTError["code"],
            docId: string,
        ): CRDTError {
            if (error instanceof Error && error.message.length > 0) {
                return {
                    code,
                    message: error.message,
                    cause: error,
                };
            }

            return {
                code,
                message: `Document "${docId}" failed with code ${code}.`,
                cause: error,
            };
        }

    }

    function ok<T>(value: T): Result<T, never> {
        return { ok: true, value };
    }

    function err<E>(error: E): Result<never, E> {
        return { ok: false, error };
    }
