"use client";

import { cn } from "./utils/utils";

export type Status = "online" | "syncing" | "offline" | "error" | "connecting";

const STATUS_MAP: Record<
  Status,
  { color: string; pulse: boolean; label: string }
> = {
  connecting: { color: "bg-yellow-400", pulse: true, label: "Connecting" },
  syncing: { color: "bg-blue-500", pulse: true, label: "Syncing" },
  online: { color: "bg-green-500", pulse: false, label: "Live" },
  offline: { color: "bg-slate-400", pulse: false, label: "Offline" },
  error: { color: "bg-red-500", pulse: false, label: "Error" },
};

export function StatusDot({
  status,
  className,
}: {
  status: Status;
  className?: string;
}) {
  const config = STATUS_MAP[status];
  return (
    <span className={cn("flex items-center gap-1.5", className)}>
      <span className="relative flex h-2 w-2">
        {config.pulse && (
          <span
            className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
              config.color,
            )}
          />
        )}
        <span
          className={cn(
            "relative inline-flex h-2 w-2 rounded-full",
            config.color,
          )}
        />
      </span>
      <span className="text-xs text-muted-foreground">{config.label}</span>
    </span>
  );
}
