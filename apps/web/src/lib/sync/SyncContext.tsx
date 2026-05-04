"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import { SyncManager, type ConnectionStatus } from "./SyncManager";
import { useWsToken } from "@/lib/auth/useWsToken";
import { useAuth } from "@/lib/auth/useAuth";
import { AwarenessManager } from "./awareness";
import { getCursorColor } from "@/lib/utils/color";
import type { Awareness } from "y-protocols/awareness";

interface SyncContextValue {
  manager: SyncManager;
  doc: SyncManager["doc"];
  docId: string;
  awareness: Awareness | null;
  status: ConnectionStatus;
}

export const SyncContext = createContext<SyncContextValue | null>(null);

export function useSyncManager(): SyncManager {
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
  const auth = useAuth();
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [awareness, setAwareness] = useState<Awareness | null>(null);

  const amRef = useRef<AwarenessManager | null>(null);
  const [manager] = useState(() => new SyncManager(docId, getToken));

  useEffect(() => {
    const unsub = manager.onStatusChange(setStatus);
    manager.init();

    return () => {
      unsub();
      manager.destroy();
    };
  }, [manager]);

  // Initialize AwarenessManager when auth is ready
  useEffect(() => {
    if (auth.status === "authenticated" && manager && !amRef.current) {
      const am = new AwarenessManager(manager.doc, manager, {
        userId: auth.session.user.id,
        name: auth.session.user.name,
        color: getCursorColor(auth.session.user.id),
      });
      amRef.current = am;
      setAwareness(am.awareness);

      return () => {
        am.destroy();
        amRef.current = null;
        setAwareness(null);
      };
    }
  }, [auth, manager]);

  const contextValue = React.useMemo(
    () => ({
      manager,
      doc: manager.doc,
      docId: manager.docId,
      awareness,
      status,
    }),
    [manager, awareness, status],
  );

  return (
    <SyncContext.Provider value={contextValue}>{children}</SyncContext.Provider>
  );
}
