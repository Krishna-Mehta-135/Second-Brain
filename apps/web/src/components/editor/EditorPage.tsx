"use client";

import { useDocument } from "@/lib/sync/useDocument";
import { useEffect, useRef } from "react";
import { useEditor, AnyExtension } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Link from "@tiptap/extension-link";
import CharacterCount from "@tiptap/extension-character-count";
import { Markdown } from "tiptap-markdown";
import { WikiLink } from "./extensions/WikiLink";
import * as awarenessProtocol from "y-protocols/awareness";
import * as Y from "yjs";
import { useAuth } from "@/lib/auth/useAuth";
import { User } from "@/lib/auth/types";
import { getCursorColor } from "@/lib/utils/color";

import { EditorContent } from "./EditorContent";
import { EditorSkeleton } from "./EditorSkeleton";
import { CollaboratorBar } from "./CollaboratorBar";
import { WordCount } from "./WordCount";
import { EditorToolbar } from "./EditorToolbar";

import { AIPanel } from "@/components/ai/AIPanel";
import { useBacklinks } from "@/lib/documents/useBacklinks";
import { useDocuments } from "@/lib/documents/useDocuments";
import { useRecentDocs } from "@/lib/documents/useRecentDocs";
import { WikiLinkAutocomplete } from "./WikiLinkAutocomplete";

export function EditorPage() {
  const { doc, awareness } = useDocument();
  const auth = useAuth();

  if (auth.status !== "authenticated" || !doc || !awareness) {
    return <EditorSkeleton />;
  }

  return (
    <EditorContentWrapper
      doc={doc}
      awareness={awareness}
      user={auth.session.user}
    />
  );
}

function EditorContentWrapper({
  doc,
  awareness,
  user,
}: {
  doc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  user: User;
}) {
  const { docId } = useDocument();
  const { documents } = useDocuments();
  const { updateLinks } = useBacklinks(docId);
  const { addRecent } = useRecentDocs();
  const linkSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Register this document as recently visited
  useEffect(() => {
    if (docId) addRecent(docId);
  }, [docId, addRecent]);

  useEffect(() => {
    return () => {
      if (linkSaveTimerRef.current) clearTimeout(linkSaveTimerRef.current);
    };
  }, []);

  const editor = useEditor(
    {
      extensions: [
        (StarterKit as AnyExtension).configure({ history: false }),
        Collaboration.configure({ document: doc, field: "content" }),
        CollaborationCursor.configure({
          provider: { awareness, document: doc },
          user: {
            name: user.name?.trim() ? user.name : "You",
            color: getCursorColor(user.id),
          },
        }),
        Placeholder.configure({
          placeholder: ({ node }) =>
            node.type.name === "heading"
              ? "Heading..."
              : "Write something, or press Space to use AI...",
          showOnlyCurrent: true,
        }),
        CharacterCount.configure({ limit: 50000 }),
        TaskList,
        TaskItem.configure({ nested: true }),
        Link.configure({
          openOnClick: false,
          HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
        }),
        Markdown.configure({
          html: false,
          tightLists: true,
          linkify: true,
          transformPastedText: true,
        }),
        WikiLink,
      ],
      editorProps: {
        attributes: {
          class:
            "prose prose-invert prose-sm sm:prose-base lg:prose-lg focus:outline-none max-w-none min-h-[500px] text-[15px] leading-relaxed text-[hsl(var(--sb-text))]",
          spellcheck: "true",
        },
      },
      immediatelyRender: false,
      onUpdate: ({ editor }) => {
        const json = editor.getJSON();
        const titles = new Set<string>();

        const extractTitles = (node: Record<string, unknown>) => {
          if (
            node.type === "wikiLink" &&
            typeof (node.attrs as Record<string, unknown>)?.title === "string"
          ) {
            titles.add((node.attrs as Record<string, unknown>).title as string);
          }
          if (Array.isArray(node.content)) {
            node.content.forEach(extractTitles);
          }
        };

        extractTitles(json as Record<string, unknown>);

        const ids = Array.from(titles)
          .map((title) => {
            const d = documents.find(
              (x) => (x.title ?? "").toLowerCase() === title.toLowerCase(),
            );
            return d?.id;
          })
          .filter(Boolean) as string[];

        if (linkSaveTimerRef.current) clearTimeout(linkSaveTimerRef.current);
        linkSaveTimerRef.current = setTimeout(() => {
          void updateLinks(ids).then(() => {
            window.dispatchEvent(
              new CustomEvent("knowdex:backlinks-changed", {
                detail: { toDocIds: ids },
              }),
            );
          });
        }, 450);
      },
    },
    [doc, awareness, documents, updateLinks],
  );

  useEffect(() => {
    if (!editor) return;

    function onExportRequest(e: Event) {
      if (!editor) return;
      const ev = e as CustomEvent<{ docId?: string }>;
      if (ev.detail?.docId && ev.detail.docId !== docId) return;
      try {
        const stor = editor.storage as {
          markdown?: { getMarkdown: () => string };
        };
        const md =
          typeof stor.markdown?.getMarkdown === "function"
            ? stor.markdown.getMarkdown()
            : editor.getText();
        window.dispatchEvent(
          new CustomEvent("knowdex-export-markdown-result", {
            detail: { markdown: md, docId },
          }),
        );
      } catch {
        window.dispatchEvent(
          new CustomEvent("knowdex-export-markdown-result", {
            detail: { markdown: editor.getText(), docId },
          }),
        );
      }
    }

    window.addEventListener(
      "knowdex-export-markdown-request",
      onExportRequest as EventListener,
    );
    return () => {
      window.removeEventListener(
        "knowdex-export-markdown-request",
        onExportRequest as EventListener,
      );
    };
  }, [editor, docId]);

  return (
    <div className="flex flex-col h-full bg-transparent text-[hsl(var(--sb-text))]">
      {/* Toolbar */}
      <EditorToolbar editor={editor} />

      {/* Editor + AI panel */}
      <div className="flex flex-1 overflow-hidden relative">
        <div className="flex flex-col flex-1 overflow-hidden">
          <EditorContent editor={editor} />
        </div>

        <WikiLinkAutocomplete editor={editor} />

        <AIPanel editor={editor} />
      </div>

      {/* Footer info: word count + live collaborators */}
      <div className="h-8 px-4 flex items-center justify-between border-t border-[hsl(var(--sb-border))] bg-[hsl(var(--sb-bg-panel))] shrink-0">
        <WordCount />
        <CollaboratorBar />
      </div>
    </div>
  );
}
