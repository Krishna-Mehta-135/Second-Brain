"use client";

import { useDocuments } from "@/lib/documents/useDocuments";
import type { Editor } from "@tiptap/react";
import { FileText } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDocument } from "@/lib/sync/useDocument";

type PickerState = {
  anchor: number;
  head: number;
  query: string;
};

export function WikiLinkAutocomplete({ editor }: { editor: Editor | null }) {
  const { docId } = useDocument();
  const { documents } = useDocuments();
  const [pick, setPick] = useState<PickerState | null>(null);
  const [hi, setHi] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  const scan = useCallback(() => {
    if (!editor) {
      setPick(null);
      return;
    }
    const { head } = editor.state.selection;
    const start = Math.max(0, head - 200);
    const textBefore = editor.state.doc.textBetween(start, head, "\n", "\n");
    const m = textBefore.match(/\[\[([^\]\n]*)$/);
    if (!m) {
      setPick(null);
      return;
    }
    const query = (m[1] ?? "").toLowerCase();
    const anchor = head - (2 + (m[1]?.length ?? 0));
    setPick({ anchor, head, query });
    setHi(0);
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    editor.on("transaction", scan);
    editor.on("selectionUpdate", scan);
    scan();
    return () => {
      editor.off("transaction", scan);
      editor.off("selectionUpdate", scan);
    };
  }, [editor, scan]);

  const matches = useMemo(() => {
    if (!pick) return [];
    const others = documents.filter(
      (d) => d.id !== docId && (d.title ?? "").trim(),
    );
    if (!pick.query) return others.slice(0, 10);
    return others
      .filter((d) => (d.title ?? "").toLowerCase().includes(pick.query))
      .slice(0, 10);
  }, [documents, docId, pick]);

  useEffect(() => {
    setHi((h) => Math.min(h, Math.max(matches.length - 1, 0)));
  }, [matches.length]);

  const coords = pick && editor?.view.coordsAtPos(pick.head);

  const apply = useCallback(
    (title: string) => {
      if (!editor || !pick) return;
      editor
        .chain()
        .focus()
        .deleteRange({ from: pick.anchor, to: pick.head })
        .insertContentAt(pick.anchor, [
          {
            type: "wikiLink",
            attrs: { title },
          },
          { type: "text", text: " " },
        ])
        .run();
      setPick(null);
    },
    [editor, pick],
  );

  useEffect(() => {
    if (!pick) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setPick(null);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHi((v) => Math.min(v + 1, matches.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHi((v) => Math.max(v - 1, 0));
      }
      if (e.key === "Enter") {
        if (matches.length === 0) return;
        e.preventDefault();
        const sel = matches[hi];
        if (sel?.title) apply(sel.title);
      }
    }

    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [pick, matches, hi, apply]);

  if (!pick || coords == null || !editor) {
    return null;
  }

  if (matches.length === 0) {
    return (
      <div
        ref={boxRef}
        className="fixed z-[80] rounded-lg border border-[hsl(var(--sb-border))] bg-[hsl(var(--sb-bg-panel))] px-3 py-2 text-xs text-[hsl(var(--sb-text-muted))] shadow-xl"
        style={{
          left: coords.left + window.scrollX,
          top: coords.bottom + window.scrollY + 4,
        }}
      >
        No notes match &quot;{pick.query}&quot;. Create one first or keep
        typing.
      </div>
    );
  }

  return (
    <div
      ref={boxRef}
      className="fixed z-[80] w-64 rounded-xl border border-[hsl(var(--sb-accent))]/25 bg-[hsl(var(--sb-bg-panel))] shadow-xl overflow-hidden"
      style={{
        left: coords.left + window.scrollX,
        top: coords.bottom + window.scrollY + 4,
      }}
    >
      <div className="px-2 py-1.5 text-[10px] font-semibold text-[hsl(var(--sb-text-faint))] uppercase tracking-wide border-b border-[hsl(var(--sb-border))]">
        Link note
      </div>
      <div className="py-1 max-h-52 overflow-y-auto">
        {matches.map((m, i) => (
          <button
            type="button"
            key={m.id}
            onMouseDown={(e) => {
              e.preventDefault();
              apply(m.title || "Untitled");
            }}
            onMouseEnter={() => setHi(i)}
            className={`w-full text-left px-2.5 py-2 flex items-center gap-2 text-[13px] ${
              i === hi
                ? "bg-[hsl(var(--sb-accent))]/18 text-[hsl(var(--sb-accent))]"
                : "text-[hsl(var(--sb-text))] hover:bg-[hsl(var(--sb-bg-hover))]"
            }`}
          >
            <FileText size={13} className="shrink-0 opacity-80" />
            <span className="truncate">{m.title}</span>
          </button>
        ))}
      </div>
      <div className="px-2 py-1 text-[10px] text-[hsl(var(--sb-text-faint))] border-t border-[hsl(var(--sb-border))]">
        ↑↓ move · Enter select · Esc close
      </div>
    </div>
  );
}
