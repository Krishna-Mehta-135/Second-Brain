"use client";

import * as Y from "yjs";
import { useEffect, useRef, useState } from "react";
import { useSyncManager } from "@/lib/sync/SyncContext";

interface EditorTitleProps {
  docId: string;
  placeholder?: string;
}

/**
 * EditorTitle provides a collaboratively editable document title.
 * The title is stored in Y.Doc as a separate Y.Text field 'title'.
 * It also syncs to the database via a debounced API call.
 */
export function EditorTitle({
  docId,
  placeholder = "Untitled",
}: EditorTitleProps) {
  const manager = useSyncManager();
  const [title, setTitle] = useState("");
  const titleRef = useRef<HTMLHeadingElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const yTitle = manager.doc.getText("title");

    // Sync initial value
    setTitle(yTitle.toString());

    // Watch for changes from other collaborators
    const observer = (_?: unknown, transaction?: Y.Transaction) => {
      // ONLY update state if change is from remote (collaboration)
      // Local changes are already reflected in the contentEditable
      // transaction is undefined on initial call
      if (!transaction || transaction.origin !== null) {
        const newTitle = yTitle.toString();
        setTitle(newTitle);
        // Update the page title (browser tab)
        document.title = newTitle || "Untitled — Knowdex";
      }
    };

    yTitle.observe(observer);
    observer();

    return () => {
      yTitle.unobserve(observer);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [manager.doc]);

  // Update Y.Doc and schedule API save
  function handleInput() {
    const newTitle = titleRef.current?.textContent ?? "";
    const yTitle = manager.doc.getText("title");

    // Update Y.Doc — this broadcasts to other clients automatically
    manager.doc.transact(() => {
      if (yTitle.toString() !== newTitle) {
        yTitle.delete(0, yTitle.length);
        yTitle.insert(0, newTitle);
      }
    });

    // Debounce API save — update document metadata in DB
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/documents/${docId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: newTitle }),
        });

        if (!response.ok) {
          console.warn("[EditorTitle] Failed to sync title to API");
        }
      } catch (err) {
        console.error("[EditorTitle] API error:", err);
      }
    }, 1_000);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    // Enter should move focus to editor, not insert newline in title
    if (e.key === "Enter") {
      e.preventDefault();
      // Focus the Tiptap editor
      const editor = document.querySelector(
        ".ProseMirror",
      ) as HTMLElement | null;
      editor?.focus();
    }
  }

  return (
    <h1
      ref={titleRef}
      contentEditable
      suppressContentEditableWarning
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      data-placeholder={placeholder}
      className={`
        text-5xl font-bold text-white mb-4 leading-tight tracking-tight
        outline-none focus:outline-none
        empty:before:content-[attr(data-placeholder)]
        empty:before:text-[hsl(var(--sb-text-faint))]
        cursor-text
        transition-colors
      `}
    >
      {title}
    </h1>
  );
}
