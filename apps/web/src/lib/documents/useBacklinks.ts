import { useState, useEffect, useCallback } from "react";

export interface Backlink {
  id: string;
  title: string;
}

/** Normalize API payloads: `{ data: [...] }`, raw arrays, or `{ data: { data: ... } }`. */
function extractBacklinkRows(json: unknown): Backlink[] {
  if (Array.isArray(json)) {
    return normalizeRows(json);
  }
  if (!json || typeof json !== "object") return [];
  const o = json as Record<string, unknown>;
  let raw: unknown = o.data;
  if (raw && typeof raw === "object" && !Array.isArray(raw) && "data" in raw) {
    const inner = (raw as { data?: unknown }).data;
    if (Array.isArray(inner)) raw = inner;
  }
  if (!Array.isArray(raw)) return [];
  return normalizeRows(raw);
}

function normalizeRows(raw: unknown[]): Backlink[] {
  return raw
    .filter(
      (row): row is { id: string; title?: unknown } =>
        row !== null &&
        typeof row === "object" &&
        typeof (row as { id?: unknown }).id === "string",
    )
    .map((row) => ({
      id: row.id,
      title:
        typeof row.title === "string" && row.title.trim()
          ? row.title
          : "Untitled",
    }));
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
      const json: unknown = await res.json();
      const list = extractBacklinkRows(json);
      setBacklinks(list);
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

  useEffect(() => {
    function onInvalidate(e: Event) {
      const ids = (e as CustomEvent<{ toDocIds?: string[] }>).detail?.toDocIds;
      if (!ids?.length || !docId) return;
      if (ids.includes(docId)) void fetchBacklinks();
    }
    window.addEventListener(
      "knowdex:backlinks-changed",
      onInvalidate as EventListener,
    );
    return () =>
      window.removeEventListener(
        "knowdex:backlinks-changed",
        onInvalidate as EventListener,
      );
  }, [docId, fetchBacklinks]);

  return { backlinks, isLoading, updateLinks, fetchBacklinks };
}
