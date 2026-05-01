import { openDB, type DBSchema, type IDBPDatabase } from "idb";

interface SecondBrainDB extends DBSchema {
  documents: {
    key: string; // docId
    value: {
      docId: string;
      state: Uint8Array; // Y.encodeStateAsUpdate(doc) — full snapshot
      stateVector: Uint8Array; // Y.encodeStateVector(doc)
      updatedAt: number;
    };
  };
  pendingUpdates: {
    key: number; // autoincrement
    value: {
      id?: number;
      docId: string;
      update: Uint8Array; // incremental update to send when reconnected
      createdAt: number;
    };
    indexes: { "by-docId": string };
  };
}

const DB_NAME = "second-brain-persistence";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<SecondBrainDB>> | null = null;

export const getDB = () => {
  if (typeof window === "undefined") return null;

  if (!dbPromise) {
    dbPromise = openDB<SecondBrainDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Full document snapshots for fast local restore
        if (!db.objectStoreNames.contains("documents")) {
          db.createObjectStore("documents", { keyPath: "docId" });
        }

        // Pending updates queue for reliable sync on reconnect
        if (!db.objectStoreNames.contains("pendingUpdates")) {
          const store = db.createObjectStore("pendingUpdates", {
            keyPath: "id",
            autoIncrement: true,
          });
          store.createIndex("by-docId", "docId");
        }
      },
    });
  }
  return dbPromise;
};

export const saveDocumentState = async (
  docId: string,
  state: Uint8Array,
  stateVector: Uint8Array,
) => {
  const db = await getDB();
  if (!db) return;

  try {
    await db.put("documents", {
      docId,
      state,
      stateVector,
      updatedAt: Date.now(),
    });
  } catch (error) {
    console.error("Failed to save document state to IndexedDB:", error);
    // Storage quota errors should be handled gracefully
  }
};

export const getDocumentState = async (docId: string) => {
  const db = await getDB();
  if (!db) return null;
  return db.get("documents", docId);
};

export const queueUpdate = async (docId: string, update: Uint8Array) => {
  const db = await getDB();
  if (!db) return;

  try {
    await db.add("pendingUpdates", {
      docId,
      update,
      createdAt: Date.now(),
    });
  } catch (error) {
    console.error("Failed to queue update in IndexedDB:", error);
  }
};

export const getPendingUpdates = async (docId: string) => {
  const db = await getDB();
  if (!db) return [];
  return db.getAllFromIndex("pendingUpdates", "by-docId", docId);
};

export const deletePendingUpdate = async (id: number) => {
  const db = await getDB();
  if (!db) return;
  await db.delete("pendingUpdates", id);
};
