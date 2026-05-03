"use client";

import { useContext } from "react";
import { SyncContext } from "./SyncContext";

export function useDocument() {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error("useDocument must be used within a SyncProvider");

  return {
    docId: ctx.docId,
    doc: ctx.doc,
    awareness: ctx.awareness,
    status: ctx.status,
    isOffline: ctx.status === "offline",
    isSyncing: ctx.status === "syncing",
    isConnected: ctx.status === "connected",
  };
}
