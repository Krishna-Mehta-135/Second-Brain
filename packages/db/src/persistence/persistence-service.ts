import { DocumentRepository } from "./repository.js";

const DEBOUNCE_MS = 2_000;
const MAX_RETRY_ATTEMPTS = 3;
const INITIAL_RETRY_DELAY_MS = 1_000;

export interface PersistenceLogger {
    info(ctx: Record<string, unknown>, msg: string): void;
    warn(ctx: Record<string, unknown>, msg: string): void;
    error(ctx: Record<string, unknown>, msg: string): void;
}

export class PersistenceService {
    private readonly timers = new Map<string, NodeJS.Timeout>();
    private readonly dirtyDocs = new Set<string>();
    private readonly repository: DocumentRepository;
    private readonly logger: PersistenceLogger;

    constructor(repository: DocumentRepository, logger: PersistenceLogger) {
        this.repository = repository;
        this.logger = logger;
    }

    public scheduleWrite(docId: string, getState: () => Uint8Array): void {
        this.dirtyDocs.add(docId);
        
        const existing = this.timers.get(docId);
        if (existing) {
            clearTimeout(existing);
        }

        this.timers.set(
            docId,
            setTimeout(async () => {
                await this.flush(docId, getState);
            }, DEBOUNCE_MS)
        );
    }

    public async flush(docId: string, getState: () => Uint8Array): Promise<void> {
        const state = getState();
        const updatedAt = Date.now();
        this.clearTracking(docId);
        await this.saveWithRetry(docId, state, updatedAt);
    }

    public async flushAll(getState: (docId: string) => Uint8Array | null): Promise<void> {
        const pending = Array.from(this.dirtyDocs);
        this.logger.info({ count: pending.length }, "persistence:flush-all-start");

        await Promise.allSettled(
            pending.map((docId) => {
                const stateGetter = () => getState(docId) ?? new Uint8Array();
                return this.flush(docId, stateGetter);
            })
        );

        this.logger.info({}, "persistence:flush-all-complete");
    }

    private clearTracking(docId: string): void {
        const timer = this.timers.get(docId);
        if (timer) {
            clearTimeout(timer);
            this.timers.delete(docId);
        }
        this.dirtyDocs.delete(docId);
    }

    private async saveWithRetry(
        docId: string,
        state: Uint8Array,
        updatedAt: number,
        attempts = MAX_RETRY_ATTEMPTS
    ): Promise<void> {
        for (let i = 0; i < attempts; i++) {
            try {
                await this.repository.save(docId, state, updatedAt);
                this.logger.info({ docId, attempt: i + 1 }, "persistence:saved");
                return;
            } catch (err) {
                this.logger.warn({ docId, attempt: i + 1, error: String(err) }, "persistence:retry");
                
                if (i === attempts - 1) {
                    this.logger.error({ docId, error: String(err) }, "persistence:failed-all-attempts");
                    return;
                }

                const delay = Math.pow(2, i) * INITIAL_RETRY_DELAY_MS;
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
    }
}
