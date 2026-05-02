"use client";
import { useDocument } from "@/lib/sync/useDocument";

/**
 * OfflineBanner is shown below the toolbar when the connection is lost.
 * It uses a CSS transition on max-height to slide in/out without layout shift.
 */
export function OfflineBanner() {
  const { isOffline } = useDocument();

  return (
    <div
      className={`
        overflow-hidden transition-all duration-300 ease-in-out
        ${isOffline ? "max-h-12 opacity-100" : "max-h-0 opacity-0"}
      `}
    >
      <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 border-b border-yellow-200 text-sm text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-900/30 dark:text-yellow-200">
        <span role="img" aria-label="offline">
          ⚡
        </span>
        You are offline. Keep editing — your changes will sync automatically
        when you reconnect.
      </div>
    </div>
  );
}
