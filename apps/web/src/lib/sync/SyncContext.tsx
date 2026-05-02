"use client";

import React, { createContext, useEffect, useState } from "react";
import { SyncManager, type ConnectionStatus } from "./SyncManager";
import { useWsToken } from "@/lib/auth/useWsToken";

interface SyncContextValue {
  manager: SyncManager;
  doc: SyncManager["doc"];
  awareness: SyncManager["awareness"];
  status: ConnectionStatus;
}

export const SyncContext = createContext<SyncContextValue | null>(null);

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
        manager,
        doc: manager.doc,
        awareness: manager.awareness,
        status,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
}
