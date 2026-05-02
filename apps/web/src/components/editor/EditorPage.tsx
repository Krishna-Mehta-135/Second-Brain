"use client";
import { useDocument } from "@/lib/sync/useDocument";
import { EditorContent } from "./EditorContent";
import { CollaboratorBar } from "./CollaboratorBar";
import { AIPanel } from "@/components/ai/AIPanel";
import { ConnectionStatus } from "@/components/status/ConnectionStatus";
import { OfflineBanner } from "@/components/status/OfflineBanner";
import { PendingSyncBadge } from "@/components/status/PendingSyncBadge";
import { WordCount } from "./WordCount";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";

export function EditorPage() {
  const { doc } = useDocument();

  useKeyboardShortcuts([
    {
      key: "k",
      meta: true,
      action: () => console.log("Command palette requested"),
      description: "Open command palette",
    },
    {
      key: "/",
      meta: true,
      action: () => console.log("AI panel requested"),
      description: "Toggle AI panel",
    },
  ]);

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      <OfflineBanner />

      {/* Top bar */}
      <div className="flex items-center justify-between h-12 px-4 border-b border-border shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <ConnectionStatus />
            <CollaboratorBar />
          </div>
          <PendingSyncBadge />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <EditorContent doc={doc} />
          <WordCount />
        </div>
        <AIPanel />
      </div>
    </div>
  );
}
