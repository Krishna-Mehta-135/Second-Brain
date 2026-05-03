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

  const [manager, setManager] = useState<SyncManager | null>(null);
  const managerRef = useRef<SyncManager | null>(null);
  const amRef = useRef<AwarenessManager | null>(null);

  useEffect(() => {
    // 1. Initialize or replace manager when docId changes
    if (managerRef.current && managerRef.current.docId !== docId) {
      managerRef.current.destroy();
      managerRef.current = null;
    }

    if (!managerRef.current) {
      const newManager = new SyncManager(docId, getToken);
      managerRef.current = newManager;
      setManager(newManager);
    }

    const currentManager = managerRef.current;
    const unsub = currentManager.onStatusChange(setStatus);
    currentManager.init();

    return () => {
      unsub();
      // Only destroy if docId changes, handled by the next effect run
      // Or when component unmounts (handled by the cleanup effect below)
    };
  }, [docId, getToken]);

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      if (managerRef.current) {
        managerRef.current.destroy();
        managerRef.current = null;
      }
      if (amRef.current) {
        amRef.current.destroy();
        amRef.current = null;
      }
    };
  }, []);

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

  if (!manager) {
    return null; // Wait for manager to initialize
  }

  return (
    <SyncContext.Provider
      value={{
        manager,
        doc: manager.doc,
        docId: manager.docId,
        awareness,
        status,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
}
