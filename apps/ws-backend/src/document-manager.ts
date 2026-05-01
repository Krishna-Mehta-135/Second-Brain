    import * as Y from "yjs";
    import { mergeUpdates, applyUpdateSafe } from "@repo/crdt";

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
        onUpdate?: (docId: string) => void;
        evictionTtlMs?: number;
        logger?: (entry: StructuredLogEntry) => void;
        onError?: (error: CRDTError) => void;
        now?: () => number;
    }

    export class DocumentManager {
        private readonly registry: DocRegistry = new Map<string, DocEntry>();
        private readonly contentMemoryEstimateBytes = new Map<string, number>();
        private readonly loadSnapshot: DocumentManagerOptions["loadSnapshot"];
        private readonly flushSnapshot: DocumentManagerOptions["flushSnapshot"];
        private readonly onUpdate: DocumentManagerOptions["onUpdate"];
        private readonly evictionTtlMs: number;
        private readonly logger: NonNullable<DocumentManagerOptions["logger"]>;
        private readonly onError: NonNullable<DocumentManagerOptions["onError"]>;
        private readonly now: NonNullable<DocumentManagerOptions["now"]>;

        public constructor(options: DocumentManagerOptions) {
            this.loadSnapshot = options.loadSnapshot;
            this.flushSnapshot = options.flushSnapshot;
            this.onUpdate = options.onUpdate;
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
                // PRODUCTION SAFETY: Invalid Y.js binary is dangerous.
                // Silent corruption can occur if errors are not caught here.
                const result = applyUpdateSafe(entry.doc, update);
                if (!result.ok) {
                    throw new Error(result.error);
                }
            } catch (error: unknown) {
                const invalidUpdateError: CRDTError = {
                    code: "DOCUMENT_UPDATE_FAILED",
                    message: `Malformed CRDT update for document "${docId}".`,
                    cause: error,
                };
                
                this.log("document:update-failed", docId, entry);
                this.onError(invalidUpdateError);

                return err(invalidUpdateError);
            }

            entry.isDirty = true;
            entry.lastAccessed = this.now();
            this.contentMemoryEstimateBytes.set(
                docId,
                (this.contentMemoryEstimateBytes.get(docId) ?? 0) + update.byteLength,
            );
            this.log("document:update-applied", docId, entry);

            if (this.onUpdate) {
                this.onUpdate(docId);
            }

            return ok(undefined);
        }

        public async getUpdateSince(docId: string, stateVector: Uint8Array): Promise<Result<Uint8Array, CRDTError>> {
            let entry: DocEntry;

            try {
                entry = await this.getOrCreate(docId);
            } catch (error: unknown) {
                return err(this.normalizeError(error, "DOCUMENT_LOAD_FAILED", docId));
            }

            try {
                return ok(Y.encodeStateAsUpdate(entry.doc, stateVector));
            } catch (error: unknown) {
                const stateError: CRDTError = {
                    code: "DOCUMENT_STATE_ENCODE_FAILED",
                    message: `Failed to encode update for document "${docId}" since provided state vector.`,
                    cause: error,
                };

                this.onError(stateError);
                return err(stateError);
            }
        }

        public getState(docId: string): Result<Uint8Array, CRDTError> {
            const entryResult = this.getLoadedEntry(docId);
            if (!entryResult.ok) {
                return entryResult;
            }

            const entry = entryResult.value;
            entry.lastAccessed = this.now();

            try {
                const state = Y.encodeStateAsUpdate(entry.doc);
                this.contentMemoryEstimateBytes.set(docId, state.byteLength);

                return ok(state);
            } catch (error: unknown) {
                const stateError: CRDTError = {
                    code: "DOCUMENT_STATE_ENCODE_FAILED",
                    message: `Failed to encode state for document "${docId}".`,
                    cause: error,
                };

                this.onError(stateError);
                return err(stateError);
            }
        }

        public getStateVector(docId: string): Result<Uint8Array, CRDTError> {
            const entryResult = this.getLoadedEntry(docId);
            if (!entryResult.ok) {
                return entryResult;
            }

            const entry = entryResult.value;
            entry.lastAccessed = this.now();

            try {
                return ok(Y.encodeStateVector(entry.doc));
            } catch (error: unknown) {
                const stateError: CRDTError = {
                    code: "DOCUMENT_STATE_ENCODE_FAILED",
                    message: `Failed to encode state vector for document "${docId}".`,
                    cause: error,
                };

                this.onError(stateError);
                return err(stateError);
            }
        }

        public has(docId: string): boolean {
            return this.registry.has(docId);
        }

        public async incrementClients(docId: string): Promise<Result<void, CRDTError>> {
            let entry: DocEntry;

            try {
                entry = await this.getOrCreate(docId);
            } catch (error: unknown) {
                return err(this.normalizeError(error, "DOCUMENT_LOAD_FAILED", docId));
            }

            entry.clientCount += 1;
            entry.lastAccessed = this.now();

            if (entry.evictionTimer) {
                clearTimeout(entry.evictionTimer);
                entry.evictionTimer = null;
                this.log("document:eviction-cancelled", docId, entry);
            }

            return ok(undefined);
        }

        public async decrementClients(docId: string): Promise<Result<void, CRDTError>> {
            const entry = this.registry.get(docId);
            if (!entry) {
                return err({
                    code: "DOCUMENT_NOT_FOUND",
                    message: `Document "${docId}" is not present in the registry.`,
                });
            }

            if (entry.loadPromise) {
                try {
                    await entry.loadPromise;
                } catch (error: unknown) {
                    return err(this.normalizeError(error, "DOCUMENT_LOAD_FAILED", docId));
                }
            }

            if (entry.clientCount === 0) {
                const underflowError: CRDTError = {
                    code: "DOCUMENT_CLIENT_COUNT_UNDERFLOW",
                    message: `Document "${docId}" client count cannot go below zero.`,
                };

                this.onError(underflowError);
                return err(underflowError);
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

            return ok(undefined);
        }

        public async destroy(docId: string): Promise<Result<void, CRDTError>> {
            const existing = this.registry.get(docId);
            if (!existing) {
                return ok(undefined);
            }

            if (existing.loadPromise) {
                try {
                    await existing.loadPromise;
                } catch (error: unknown) {
                    return err(this.normalizeError(error, "DOCUMENT_LOAD_FAILED", docId));
                }
            }

            const entry = this.registry.get(docId);
            if (!entry) {
                return ok(undefined);
            }

            if (entry.evictionTimer) {
                clearTimeout(entry.evictionTimer);
                entry.evictionTimer = null;
            }

            if (entry.isDirty) {
                const flushResult = await this.flushEntry(docId, entry);
                if (!flushResult.ok) {
                    this.onError(flushResult.error);
                    return flushResult;
                }
            }

            // Y.Doc retains observers internally; explicit destruction is required to release them on eviction.
            entry.doc.destroy();
            this.registry.delete(docId);
            this.contentMemoryEstimateBytes.delete(docId);
            this.log("document:destroyed", docId, entry);

            return ok(undefined);
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
                    this.log("document:update-failed", docId, entry);

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
            this.contentMemoryEstimateBytes.set(docId, snapshot?.byteLength ?? 0);
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
            this.contentMemoryEstimateBytes.set(docId, state.byteLength);
            return ok(undefined);
        }

        private async handleEvictionTimer(docId: string, expectedEntry: DocEntry): Promise<void> {
            const current = this.registry.get(docId);
            if (!current || current !== expectedEntry || current.loadPromise || current.clientCount !== 0) {
                return;
            }

            current.evictionTimer = null;
            const destroyResult = await this.destroy(docId);
            if (destroyResult.ok && !this.registry.has(docId)) {
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
            let contentBytes = 0;

            for (const bytes of this.contentMemoryEstimateBytes.values()) {
                contentBytes += bytes;
            }

            return this.registry.size * BASE_DOC_MEMORY_BYTES + contentBytes;
        }

        private cleanupFailedLoad(docId: string, entry: DocEntry): void {
            const current = this.registry.get(docId);
            if (current === entry) {
                this.registry.delete(docId);
            }

            this.contentMemoryEstimateBytes.delete(docId);
            entry.doc.destroy();
        }

        private getLoadedEntry(docId: string): Result<DocEntry, CRDTError> {
            const entry = this.registry.get(docId);
            if (!entry) {
                return err({
                    code: "DOCUMENT_NOT_FOUND",
                    message: `Document "${docId}" is not present in the registry.`,
                });
            }

            if (entry.loadPromise) {
                return err({
                    code: "DOCUMENT_STILL_LOADING",
                    message: `Document "${docId}" is still loading.`,
                });
            }

            return ok(entry);
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
