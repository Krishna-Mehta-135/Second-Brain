import { useState, useEffect, useCallback } from "react";

export interface Backlink {
  id: string;
  title: string;
}

export function useBacklinks(docId: string) {
  const [backlinks, setBacklinks] = useState<Backlink[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBacklinks = useCallback(async () => {
    if (!docId) return;
    try {
      setIsLoading(true);
      const res = await fetch(`/api/documents/${docId}/backlinks`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setBacklinks(data.data || []);
    } catch (error) {
      console.error("Failed to fetch backlinks:", error);
    } finally {
      setIsLoading(false);
    }
  }, [docId]);

  const updateLinks = useCallback(
    async (links: string[]) => {
      if (!docId) return;
      try {
        await fetch(`/api/documents/${docId}/links`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ links }),
          credentials: "include",
        });
      } catch (error) {
        console.error("Failed to update document links:", error);
      }
    },
    [docId],
  );

  useEffect(() => {
    fetchBacklinks();
  }, [fetchBacklinks]);

  return { backlinks, isLoading, updateLinks, fetchBacklinks };
}
