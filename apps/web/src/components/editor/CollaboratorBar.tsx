"use client";
import { useDocument } from "@/lib/sync/SyncContext";
import { useEffect, useState } from "react";

interface Collaborator {
  id: string;
  name: string;
  color: string;
}

export function CollaboratorBar() {
  const { awareness } = useDocument();
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);

  useEffect(() => {
    function updateCollaborators() {
      const states = awareness.getStates();
      const list: Collaborator[] = [];

      states.forEach((state: Record<string, unknown>, clientId) => {
        const user = state.user as { name: string; color: string } | undefined;
        if (user) {
          list.push({
            id: clientId.toString(),
            name: user.name,
            color: user.color,
          });
        }
      });

      setCollaborators(list);
    }

    awareness.on("change", updateCollaborators);
    updateCollaborators();

    return () => {
      awareness.off("change", updateCollaborators);
    };
  }, [awareness]);

  return (
    <div className="flex -space-x-2 overflow-hidden">
      {collaborators.map((c) => (
        <div
          key={c.id}
          className="inline-block h-7 w-7 rounded-full ring-2 ring-background flex items-center justify-center text-[10px] font-bold text-white uppercase"
          style={{ backgroundColor: c.color }}
          title={c.name}
        >
          {c.name.charAt(0)}
        </div>
      ))}
    </div>
  );
}
