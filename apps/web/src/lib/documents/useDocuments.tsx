"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { Document } from "@repo/types";

interface DocumentsContextType {
  documents: Document[];
  isLoading: boolean;
  error: string | null;
  createDocument: () => Promise<void>;
  deleteDocument: (docId: string) => Promise<void>;
}

const DocumentsContext = createContext<DocumentsContextType | undefined>(
  undefined,
);

export function DocumentsProvider({ children }: { children: ReactNode }) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch("/api/documents", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load documents");
      const docs: Document[] = await res.json();
      setDocuments(docs.sort((a, b) => b.updatedAt - a.updatedAt));
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const createDocument = useCallback(async () => {
    // Optimistic: add placeholder immediately
    const tempId = `temp-${Date.now()}`;
    const tempDoc: Document = {
      id: tempId,
      title: "Untitled",
      ownerId: "", // Will be set by server
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setDocuments((prev) => [tempDoc, ...prev]);

    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled" }),
      });

      if (!res.ok) throw new Error("Failed to create");
      const doc: Document = await res.json();

      // Replace temp with real document
      setDocuments((prev) => prev.map((d) => (d.id === tempId ? doc : d)));
      router.push(`/documents/${doc.id}`);
    } catch (err) {
      // Remove temp on failure
      setDocuments((prev) => prev.filter((d) => d.id !== tempId));
      console.error("Failed to create document:", err);
    }
  }, [router]);

  const deleteDocument = useCallback(
    async (docId: string) => {
      const previousDocs = [...documents];
      // Optimistic remove
      setDocuments((prev) => prev.filter((d) => d.id !== docId));

      try {
        const res = await fetch(`/api/documents/${docId}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to delete");
      } catch (err) {
        // Rollback on failure
        setDocuments(previousDocs);
        console.error("Failed to delete document:", err);
      }
    },
    [documents],
  );

  return (
    <DocumentsContext.Provider
      value={{ documents, isLoading, error, createDocument, deleteDocument }}
    >
      {children}
    </DocumentsContext.Provider>
  );
}

export function useDocuments() {
  const context = useContext(DocumentsContext);
  if (context === undefined) {
    throw new Error("useDocuments must be used within a DocumentsProvider");
  }
  return context;
}
