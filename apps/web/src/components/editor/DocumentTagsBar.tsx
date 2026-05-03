"use client";

import { Hash, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useDocuments } from "@/lib/documents/useDocuments";

export function DocumentTagsBar({ docId }: { docId: string }) {
  const { documents, updateDocument } = useDocuments();
  const docMeta = documents.find((d) => d.id === docId);
  const [draft, setDraft] = useState("");
  const tags = docMeta?.tags ?? [];

  useEffect(() => {
    setDraft("");
  }, [docId]);

  async function add() {
    const t = draft.trim().replace(/^#+/, "").replace(/\s+/g, "-");
    if (!t || tags.includes(t)) return;
    await updateDocument(docId, { tags: [...tags, t] });
    setDraft("");
  }

  async function remove(tag: string) {
    await updateDocument(docId, {
      tags: tags.filter((x) => x !== tag),
    });
  }

  return (
    <div className="flex flex-wrap gap-2 mb-10 items-center">
      {tags.map((tag) => (
        <button
          type="button"
          key={tag}
          onClick={() => remove(tag)}
          className="group px-2 py-0.5 rounded border border-[hsl(var(--sb-border))] bg-[hsl(var(--sb-bg))] text-xs font-medium text-[hsl(var(--sb-text-muted))] hover:text-white hover:border-[hsl(var(--sb-accent))] transition-colors flex items-center gap-1"
        >
          <Hash size={11} className="text-[hsl(var(--sb-accent))]" />
          <span>{tag}</span>
          <X
            size={11}
            className="opacity-0 group-hover:opacity-70 text-[hsl(var(--sb-text-faint))]"
          />
        </button>
      ))}
      <span className="flex items-center gap-1 px-2 py-0.5 rounded border border-dashed border-[hsl(var(--sb-border))] bg-[hsl(var(--sb-bg))/0.5] focus-within:border-[hsl(var(--sb-accent))]/50">
        <Plus size={12} className="text-[hsl(var(--sb-text-faint))] shrink-0" />
        <input
          type="text"
          value={draft}
          placeholder="tag-name"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void add();
            }
          }}
          className="bg-transparent text-xs text-[hsl(var(--sb-text))] outline-none placeholder:text-[hsl(var(--sb-text-faint))] w-28 max-w-[50vw]"
        />
      </span>
    </div>
  );
}
