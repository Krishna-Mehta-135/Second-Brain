export interface DocumentRepository {
    save(docId: string, state: Uint8Array, updatedAt: number): Promise<void>;
    load(docId: string): Promise<{ state: Uint8Array; updatedAt: number } | null>;
}
