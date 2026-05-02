"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/sync/db";
import { useDocument } from "@/lib/sync/useDocument";

/**
 * PendingSyncBadge shows how many local changes are waiting to sync.
 * It only polls IndexedDB when the user is offline.
 */
export function PendingSyncBadge() {
  const { isOffline, docId } = useDocument();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isOffline) {
      setCount(0);
      return;
    }

    // Poll pending count every 2 seconds while offline
    async function check() {
      try {
        const pending = await db.getPendingUpdates(docId);
        setCount(pending.length);
      } catch (err) {
        console.error("[PendingSyncBadge] Failed to check pending:", err);
      }
    }

    check();
    const interval = setInterval(check, 2_000);
    return () => clearInterval(interval);
  }, [isOffline, docId]);

  if (!isOffline || count === 0) return null;

  return (
    <span className="text-[10px] font-bold text-yellow-700 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full px-2 py-0.5 uppercase tracking-tight">
      {count} change{count !== 1 ? "s" : ""} pending
    </span>
  );
}
