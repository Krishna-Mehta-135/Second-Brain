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
    <div className="flex items-center gap-4 px-6 py-2 border-t border-[hsl(var(--sb-border))] bg-black text-[10px] font-bold text-white uppercase tracking-widest">
      <div className="flex items-center gap-1.5">
        <span>{words.toLocaleString()} words</span>
      </div>

      <span className="text-white/40">|</span>

      <div className="flex items-center gap-1.5">
        <span>{characters.toLocaleString()} characters</span>
      </div>

      <span className="text-white/40 ml-auto">|</span>

      <div className="flex items-center gap-1.5">
        <span>{readingTimeMinutes} min read</span>
      </div>
    </div>
  );
}
