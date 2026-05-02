"use client";
import { WifiOff } from "lucide-react";

export function OfflineBanner({ isOffline }: { isOffline: boolean }) {
  if (!isOffline) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded-full text-xs font-medium">
      <WifiOff className="h-3.5 w-3.5" />
      Working Offline
    </div>
  );
}
