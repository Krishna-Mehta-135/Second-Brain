"use client";
import { useDocument } from "@/lib/sync/SyncContext";
import { useEffect, useState, useCallback } from "react";
import type { UserPresence } from "@/lib/sync/awareness";

export function CollaboratorBar() {
  const { awareness } = useDocument();
  const [collaborators, setCollaborators] = useState<UserPresence[]>([]);

  const updateCollaborators = useCallback(() => {
    if (!awareness) return;

    const states = awareness.getStates();
    const now = Date.now();
    const list: UserPresence[] = [];

    states.forEach((state) => {
      if (!state) return;
      const presence = state as UserPresence;
      // Filter by active in last 30s
      if (presence.userId && now - (presence.lastSeen || 0) < 30_000) {
        list.push(presence);
      }
    });

    setCollaborators(list.sort((a, b) => a.name.localeCompare(b.name)));
  }, [awareness]);

  useEffect(() => {
    if (!awareness) return;

    awareness.on("change", updateCollaborators);
    updateCollaborators();

    const timer = setInterval(updateCollaborators, 10_000);

    return () => {
      awareness.off("change", updateCollaborators);
      clearInterval(timer);
    };
  }, [awareness, updateCollaborators]);

  return (
    <div className="flex -space-x-2 overflow-hidden">
      {collaborators.map((c) => (
        <div
          key={c.userId}
          className="inline-block h-7 w-7 rounded-full ring-2 ring-background flex items-center justify-center text-[10px] font-bold text-white uppercase shadow-sm"
          style={{ backgroundColor: c.color }}
          title={c.name}
        >
          {c.name.charAt(0)}
        </div>
      ))}
    </div>
  );
}
