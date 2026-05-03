"use client";
import { useEffect, useState } from "react";
import { useDocument } from "@/lib/sync/useDocument";
import { type ConnectionStatus as Status } from "@/lib/sync/SyncManager";

/**
 * ConnectionStatus shows a minimal dot + label in the editor toolbar.
 * The "Live" label fades out after 3 seconds to reduce visual noise.
 */
export function ConnectionStatus() {
  const { status } = useDocument();
  const [showConnected, setShowConnected] = useState(false);

  useEffect(() => {
    if (status === "connected") {
      setShowConnected(true);
      // Auto-hide 'Live' label after 3 seconds — it is the expected state
      const t = setTimeout(() => setShowConnected(false), 3_000);
      return () => clearTimeout(t);
    }
  }, [status]);

  const configs: Record<Status, { dot: string; label: string; show: boolean }> =
    {
      connecting: {
        dot: "bg-yellow-400 animate-ping",
        label: "Connecting...",
        show: true,
      },
      syncing: {
        dot: "bg-blue-500 animate-pulse",
        label: "Syncing",
        show: true,
      },
      connected: { dot: "bg-green-500", label: "Live", show: showConnected },
      offline: { dot: "bg-slate-400", label: "Offline", show: true },
      error: { dot: "bg-red-500", label: "Disconnected", show: true },
    };

  const config = configs[status as Status];

  if (!config.show) return null;

  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground transition-opacity duration-300">
      <span className="relative flex h-2 w-2">
        <span
          className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${config.dot}`}
        />
        <span
          className={`relative inline-flex h-2 w-2 rounded-full ${config.dot.replace("animate-ping", "").replace("animate-pulse", "")}`}
        />
      </span>
      {config.label}
    </span>
  );
}
