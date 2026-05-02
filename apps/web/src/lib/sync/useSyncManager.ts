"use client";

import { useContext } from "react";
import { SyncContext } from "./SyncContext";
import type { SyncManager } from "./SyncManager";

export function useSyncManager(): SyncManager {
  const ctx = useContext(SyncContext);
  if (!ctx)
    throw new Error("useSyncManager must be used within a SyncProvider");
  return ctx.manager;
}
