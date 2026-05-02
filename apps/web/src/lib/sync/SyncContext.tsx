"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { SyncManager, type ConnectionStatus } from "./SyncManager";
import { useWsToken } from "@/lib/auth/useWsToken";

interface SyncContextValue {
  docId: string;
  manager: SyncManager;
  doc: SyncManager["doc"];
  awareness: SyncManager["awareness"];
  status: ConnectionStatus;
  isOffline: boolean;
}

export const SyncContext = createContext<SyncContextValue | null>(null);

export function useSyncManager() {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error("useSyncManager must be used within a SyncProvider");
  }
  return context.manager;
}

export function SyncProvider({
  docId,
  children,
}: {
  docId: string;
  children: React.ReactNode;
}) {
  const { getToken } = useWsToken();
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [manager, setManager] = useState<SyncManager | null>(null);

  useEffect(() => {
    const newManager = new SyncManager(docId, getToken);
    setManager(newManager);

    const unsub = newManager.onStatusChange(setStatus);
    newManager.init();

    return () => {
      unsub();
      newManager.destroy();
      setManager(null);
    };
  }, [docId, getToken]);

  if (!manager) return null;

  return (
    <SyncContext.Provider
      value={{
        docId,
        manager,
        doc: manager.doc,
        awareness: manager.awareness,
        status,
        isOffline: status === "offline",
      }}
    >
      {children}
    </SyncContext.Provider>
  );
}
