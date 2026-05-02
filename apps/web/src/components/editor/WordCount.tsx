"use client";

import { useSyncManager } from "@/lib/sync/SyncContext";
import { useWordCount } from "./hooks/useWordCount";

/**
 * WordCount displays real-time statistics about the document content.
 * It shows word count, character count, and estimated reading time.
 */
export function WordCount() {
  const manager = useSyncManager();
  const { words, characters, readingTimeMinutes } = useWordCount(manager.doc);

  return (
    <div className="flex items-center gap-6 px-6 py-2 border-t border-border bg-surface/50 text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
      <div className="flex items-center gap-1.5">
        <span className="text-foreground">{words.toLocaleString()}</span>
        <span>words</span>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-foreground">{characters.toLocaleString()}</span>
        <span>characters</span>
      </div>

      <div className="flex items-center gap-1.5 ml-auto">
        <span className="text-foreground">{readingTimeMinutes}</span>
        <span>min read</span>
      </div>
    </div>
  );
}
