"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "knowdex-starred-docs";

export function useStarredDocs() {
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setStarredIds(new Set(JSON.parse(stored) as string[]));
    } catch (e) {
      console.error("Failed to load starred docs", e);
    }
  }, []);

  const toggleStar = useCallback((docId: string) => {
    setStarredIds((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      } catch (e) {
        console.error("Failed to save starred docs", e);
      }
      return next;
    });
  }, []);

  const isStarred = useCallback(
    (docId: string) => starredIds.has(docId),
    [starredIds],
  );

  return { starredIds, toggleStar, isStarred };
}
