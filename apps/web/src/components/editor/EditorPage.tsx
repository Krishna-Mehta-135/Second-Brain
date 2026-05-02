"use client";
import { useDocument } from "@/lib/sync/SyncContext";
import { EditorContent } from "./EditorContent";
import { CollaboratorBar } from "./CollaboratorBar";
import { StatusDot } from "@/components/ui/StatusDot";
import { AIPanel } from "@/components/ai/AIPanel";
import { OfflineBanner } from "@/components/status/OfflineBanner";

export function EditorPage() {
  const { doc, status, isOffline } = useDocument();

  // Show skeleton while Y.Doc is being restored from IndexedDB
  // For returning users, IndexedDB restore means doc has content instantly
  // but we might want a small delay or check if sync-step-2 is done for fresh data

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      {/* Top bar */}
      <div className="flex items-center justify-between h-12 px-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <StatusDot status={status === "connected" ? "online" : status} />
          <CollaboratorBar />
        </div>

        <OfflineBanner isOffline={isOffline} />
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <EditorContent doc={doc} />
        </div>
        <AIPanel />
      </div>
    </div>
  );
}
