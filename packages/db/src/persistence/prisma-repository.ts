import { prisma } from "../index.js";
import { DocumentRepository } from "./repository.js";

export class PrismaRepository implements DocumentRepository {
    public async save(docId: string, state: Uint8Array, updatedAt: number): Promise<void> {
        const updatedAtDate = new Date(updatedAt);

        await prisma.document.upsert({
            where: { id: docId },
            create: {
                id: docId,
                state: Buffer.from(state),
                updatedAt: updatedAtDate,
            },
            update: {
                state: Buffer.from(state),
                updatedAt: updatedAtDate,
            },
        });
    }

    public async load(docId: string): Promise<{ state: Uint8Array; updatedAt: number } | null> {
        const doc = await prisma.document.findUnique({
            where: { id: docId },
        });

        if (!doc) {
            return null;
        }

        return {
            state: new Uint8Array(doc.state),
            updatedAt: doc.updatedAt.getTime(),
        };
    }
}
