"use client";

import { useEffect, useState, useCallback } from "react";
import { useSyncManager } from "@/lib/sync/SyncContext";
import { UserAvatar } from "@repo/ui";
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui";
import type { UserPresence } from "@/lib/sync/awareness";

const MAX_VISIBLE_AVATARS = 4;

/**
 * CollaboratorBar displays avatars of users currently active in the document.
 */
export function CollaboratorBar() {
  const manager = useSyncManager();
  const [activeUsers, setActiveUsers] = useState<UserPresence[]>([]);

  const updateActiveUsers = useCallback(() => {
    if (!manager.awareness) return;

    // We need to reach into the states of awareness or use our AwarenessManager if we had it in context
    // Since AwarenessManager is not in context yet, we'll implement the logic here
    // or better, I should have put getActiveUsers in a place where we can access it.
    // For now, let's use the awareness states directly.
    const states = manager.awareness.getStates();
    const now = Date.now();

    const users = Array.from(states.values())
      .filter((s): s is UserPresence => {
        if (!s) return false;
        const presence = s as UserPresence;
        return !!presence.userId && now - (presence.lastSeen || 0) < 30_000;
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    setActiveUsers(users);
  }, [manager.awareness]);

  useEffect(() => {
    const awareness = manager.awareness;
    if (!awareness) return;

    awareness.on("change", updateActiveUsers);
    updateActiveUsers();

    // Also update on a timer to catch the 30s timeout even if no one moves
    const timer = setInterval(updateActiveUsers, 10_000);

    return () => {
      awareness.off("change", updateActiveUsers);
      clearInterval(timer);
    };
  }, [manager.awareness, updateActiveUsers]);

  if (activeUsers.length === 0) return null;

  const visible = activeUsers.slice(0, MAX_VISIBLE_AVATARS);
  const overflow = activeUsers.length - MAX_VISIBLE_AVATARS;

  return (
    <div className="flex items-center gap-3">
      <div className="flex -space-x-2">
        {visible.map((user) => (
          <Tooltip key={user.userId}>
            <TooltipTrigger asChild>
              <div className="ring-2 ring-background rounded-full">
                <UserAvatar name={user.name} userId={user.userId} size="sm" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {user.name}
            </TooltipContent>
          </Tooltip>
        ))}

        {overflow > 0 && (
          <div className="z-10 flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[10px] font-medium ring-2 ring-background">
            +{overflow}
          </div>
        )}
      </div>

      {activeUsers.length > 1 && (
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          {activeUsers.length} editing
        </span>
      )}
    </div>
  );
}
