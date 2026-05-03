"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "knowdex-recent-docs";
const MAX_RECENT = 10;

export function useRecentDocs() {
  const [recentIds, setRecentIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setRecentIds(JSON.parse(stored) as string[]);
    } catch (e) {
      console.error("Failed to load recent docs", e);
    }
  }, []);

  const addRecent = useCallback((docId: string) => {
    setRecentIds((prev) => {
      const filtered = prev.filter((id) => id !== docId);
      const next = [docId, ...filtered].slice(0, MAX_RECENT);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        console.error("Failed to save recent docs", e);
      }
      return next;
    });
  }, []);

  return { recentIds, addRecent };
}
