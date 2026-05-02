"use client";
import { useEditor, EditorContent as TiptapEditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Link from "@tiptap/extension-link";
import CharacterCount from "@tiptap/extension-character-count";
import type * as Y from "yjs";
import * as awarenessProtocol from "y-protocols/awareness";
import { useUser } from "@/lib/auth/useAuth";
import { useDocument } from "@/lib/sync/useDocument";
import { getCursorColor } from "@/lib/utils/color";
import { EditorToolbar } from "./EditorToolbar";
import { EditorSkeleton } from "./EditorSkeleton";
import { EditorTitle } from "./EditorTitle";

interface EditorContentProps {
  doc: Y.Doc;
}

export function EditorContent({ doc }: EditorContentProps) {
  const user = useUser();
  const { docId } = useDocument();

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          undoRedo: false, // MANDATORY: Y.UndoManager handles this (Tiptap 3)
        }),

        Collaboration.configure({
          document: doc,
          field: "content", // Y.XmlFragment key — must match backend exactly
        }),

        CollaborationCursor.configure({
          provider: {
            // We implement our own awareness via WebSocket messages
            // This shim satisfies Tiptap's interface
            awareness: {
              getLocalState: () => ({
                user: { name: user.name, color: getCursorColor(user.id) },
              }),
              on: () => {},
              off: () => {},
              setLocalStateField: () => {},
            } as unknown as awarenessProtocol.Awareness,
          },
          user: { name: user.name, color: getCursorColor(user.id) },
        }),

        Placeholder.configure({
          placeholder: ({ node }) => {
            if (node.type.name === "heading") return "Heading...";
            return "Write something, or press Space to use AI...";
          },
          showOnlyCurrent: true,
        }),

        Typography, // auto smart quotes, em dashes

        CharacterCount.configure({
          limit: 10000,
        }),

        TaskList,
        TaskItem.configure({ nested: true }),

        Link.configure({
          openOnClick: false,
          HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
        }),
      ],

      editorProps: {
        attributes: {
          class:
            "prose prose-sm sm:prose-base lg:prose-lg xl:prose-2xl focus:outline-none max-w-none px-4 py-8 min-h-[500px]",
          spellcheck: "true",
        },
      },

      // MANDATORY for Next.js — Y.Doc does not exist on the server
      immediatelyRender: false,

      onUpdate: () => {
        // Title sync: extract first heading as document title
        // debounce and send to API to update document metadata
      },
    },
    [doc], // Recreate editor if doc changes (tab switch)
  );

  if (!editor) return <EditorSkeleton />;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <EditorToolbar editor={editor} />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto py-12 px-4 flex flex-col gap-8">
          <EditorTitle docId={docId} />
          <TiptapEditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
