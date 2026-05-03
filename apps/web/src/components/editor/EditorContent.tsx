"use client";
import {
  EditorContent as TiptapEditorContent,
  type Editor,
} from "@tiptap/react";
import { useDocument } from "@/lib/sync/useDocument";
import { EditorSkeleton } from "./EditorSkeleton";
import { EditorTitle } from "./EditorTitle";
import { BacklinksPanel } from "./BacklinksPanel";

interface EditorContentProps {
  editor: Editor | null;
}

export function EditorContent({ editor }: EditorContentProps) {
  const { docId } = useDocument();

  if (!editor) return <EditorSkeleton />;

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar relative scroll-smooth">
      <div className="max-w-3xl mx-auto px-10 py-16">
        <EditorTitle docId={docId} />

        <div className="flex flex-wrap gap-2 mb-10">
          <div className="px-2 py-0.5 rounded border border-[hsl(var(--sb-border))] bg-[hsl(var(--sb-bg))] text-xs font-medium text-[hsl(var(--sb-text-muted))] hover:text-white hover:border-[hsl(var(--sb-accent))] cursor-pointer transition-colors flex items-center gap-1">
            <span className="text-[hsl(var(--sb-accent))]">#</span>design
          </div>
          <div className="px-2 py-0.5 rounded border border-[hsl(var(--sb-border))] bg-[hsl(var(--sb-bg))] text-xs font-medium text-[hsl(var(--sb-text-muted))] hover:text-white hover:border-[hsl(var(--sb-accent))] cursor-pointer transition-colors flex items-center gap-1">
            <span className="text-[hsl(var(--sb-accent))]">#</span>architecture
          </div>
        </div>

        <div className="prose prose-invert max-w-none">
          <TiptapEditorContent editor={editor} />
        </div>

        <BacklinksPanel docId={docId} />

        <div className="h-32" />
      </div>
    </div>
  );
}
