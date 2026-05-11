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
    <div className="flex items-center gap-2 sm:gap-4 text-[9px] sm:text-[10px] font-bold text-white/70 uppercase tracking-widest whitespace-nowrap overflow-hidden">
      <div className="flex items-center gap-1">
        <span>
          {words.toLocaleString()}{" "}
          <span className="hidden xs:inline">words</span>
          <span className="xs:hidden">w</span>
        </span>
      </div>

      <span className="text-white/20">|</span>

      <div className="flex items-center gap-1">
        <span>
          {characters.toLocaleString()}{" "}
          <span className="hidden xs:inline">characters</span>
          <span className="xs:hidden">c</span>
        </span>
      </div>

      <span className="text-white/20 hidden sm:inline">|</span>

      <div className="hidden sm:flex items-center gap-1">
        <span>{readingTimeMinutes} min read</span>
      </div>
    </div>
  );
}
