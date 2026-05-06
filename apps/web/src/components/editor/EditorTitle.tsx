"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useSyncManager } from "@/lib/sync/SyncContext";
import { useDocuments } from "@/lib/documents/useDocuments";

interface EditorTitleProps {
  docId: string;
  placeholder?: string;
}

function normalizeTitle(raw: string): string {
  const value = raw.trim();
  if (!value || value.toLowerCase() === "undefined") return "";
  return value;
}

function notifyTitle(docId: string, raw: string) {
  const t = raw.trim() ? raw.trim() : "Untitled";
  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("doc:title:changed", {
          detail: { docId, title: t },
        }),
      );
    }
  } catch {
    /* ignore */
  }
  if (typeof document !== "undefined") {
    document.title = t === "Untitled" ? "Untitled — Knowdex" : `${t} — Knowdex`;
  }
}

export function EditorTitle({
  docId,
  placeholder = "Untitled",
}: EditorTitleProps) {
  const manager = useSyncManager();
  const { documents } = useDocuments();
  const initialDoc = documents.find((d) => d.id === docId);

  const [title, setTitle] = useState(() =>
    normalizeTitle(initialDoc?.title ?? ""),
  );
  const titleRef = useRef<HTMLHeadingElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const yTitle = manager.doc.getText("title");

    if (yTitle.length > 0) {
      const initial = normalizeTitle(yTitle.toString());
      setTitle(initial);
      notifyTitle(docId, initial);
    }

    const observer = () => {
      const normalized = normalizeTitle(yTitle.toString());
      setTitle(normalized);
      notifyTitle(docId, normalized);
    };

    yTitle.observe(observer);

    return () => {
      yTitle.unobserve(observer);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [manager.doc, docId]);

  useLayoutEffect(() => {
    const el = titleRef.current;
    if (!el || document.activeElement === el) return;
    const next = title;
    if (el.textContent !== next) {
      el.textContent = next;
    }
  }, [title, docId]);

  function handleInput() {
    const newTitle = titleRef.current?.textContent ?? "";
    const normalized = normalizeTitle(newTitle);
    const yTitle = manager.doc.getText("title");

    manager.doc.transact(() => {
      if (yTitle.toString() !== normalized) {
        yTitle.delete(0, yTitle.length);
        yTitle.insert(0, normalized);
      }
    });

    setTitle(normalized);
    notifyTitle(docId, normalized);

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await fetch(`/api/documents/${docId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: normalized || "Untitled",
          }),
        });
      } catch (err) {
        console.error("[EditorTitle] API error:", err);
      }
    }, 800);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      const ed = document.querySelector(".ProseMirror") as HTMLElement | null;
      ed?.focus();
    }
  }

  return (
    <h1
      ref={titleRef}
      key={docId}
      contentEditable
      suppressContentEditableWarning
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      data-placeholder={placeholder}
      className={`
        text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 leading-tight tracking-tight
        outline-none focus:outline-none
        empty:before:content-[attr(data-placeholder)]
        empty:before:text-[hsl(var(--sb-text-faint))]
        cursor-text
        transition-colors
      `}
    />
  );
}
