"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useSyncManager } from "@/lib/sync/SyncContext";
import type { InsertPosition, WSMessage } from "@repo/types";
import type { Editor } from "@tiptap/react";

export type AIStatus = "idle" | "writing" | "done" | "error" | "cancelled";

interface WriteOptions {
  prompt: string;
  insertPosition: InsertPosition;
  editor: Editor | null;
}

/**
 * Manages the AI writing flow.
 *
 * Token accumulation strategy:
 * Instead of applying raw Y.Doc binary updates server-side (which would insert
 * unformatted plain text like "## Heading" literally), the server streams raw
 * Markdown text tokens. We accumulate them here and on completion insert the
 * full Markdown string through the Tiptap editor, which runs it through the
 * tiptap-markdown extension — preserving headings, bold, lists, etc. The
 * resulting ProseMirror transaction is picked up by the Collaboration extension
 * and propagated to all other connected clients via Y.Doc sync.
 */
export function useAIWriter() {
  const manager = useSyncManager();
  const [status, setStatus] = useState<AIStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const currentRequestId = useRef<string | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const accumulatedText = useRef<string>("");

  const startWriting = useCallback(
    async (options: WriteOptions): Promise<void> => {
      // Cancel any in-progress request before starting new one
      if (currentRequestId.current) {
        manager.send({
          type: "ai-cancel",
          requestId: currentRequestId.current,
        });
      }

      accumulatedText.current = "";

      const requestId = manager.sendAIRequest(
        options.prompt,
        options.insertPosition,
      );
      currentRequestId.current = requestId;
      setStatus("writing");
      setError(null);

      return new Promise<void>((resolve, reject) => {
        const unsubUpdate = manager.onMessage("ai-update", (msg: WSMessage) => {
          if (msg.type !== "ai-update" || msg.requestId !== requestId) return;

          if (!msg.isDone) {
            // Accumulate raw Markdown token
            accumulatedText.current += msg.text;
            return;
          }

          // Stream complete — insert full Markdown via Tiptap
          cleanup();
          currentRequestId.current = null;

          const fullMarkdown = accumulatedText.current;
          accumulatedText.current = "";

          if (fullMarkdown.trim() && options.editor) {
            insertMarkdown(
              options.editor,
              fullMarkdown,
              options.insertPosition,
            );
          }

          setStatus("done");
          resolve();
        });

        const unsubError = manager.onMessage("error", (msg: WSMessage) => {
          if (msg.type !== "error") return;
          cleanup();
          currentRequestId.current = null;
          accumulatedText.current = "";
          setStatus("error");
          setError(msg.message);
          reject(new Error(msg.message));
        });

        function cleanup() {
          unsubUpdate();
          unsubError();
          cleanupRef.current = null;
        }

        cleanupRef.current = cleanup;
      });
    },
    [manager],
  );

  const cancelWriting = useCallback(() => {
    if (!currentRequestId.current) return;
    manager.send({ type: "ai-cancel", requestId: currentRequestId.current });
    cleanupRef.current?.();
    currentRequestId.current = null;
    accumulatedText.current = "";
    setStatus("cancelled");
  }, [manager]);

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentRequestId.current) {
        manager.send({
          type: "ai-cancel",
          requestId: currentRequestId.current,
        });
      }
      cleanupRef.current?.();
    };
  }, [manager]);

  return { status, error, startWriting, cancelWriting, reset };
}

/**
 * Inserts a Markdown string into the Tiptap editor at the specified position.
 * The `insertContent` command runs the text through the active Markdown extension
 * which converts it to proper ProseMirror nodes (headings, bold, lists, etc.)
 * before applying to the document.
 */
function insertMarkdown(
  editor: Editor,
  markdown: string,
  position: InsertPosition,
): void {
  if (position.type === "replace") {
    editor
      .chain()
      .focus()
      .deleteRange({ from: position.startOffset, to: position.endOffset })
      .insertContentAt(position.startOffset, markdown, {
        parseOptions: { preserveWhitespace: false },
      })
      .run();
    return;
  }

  if (position.type === "append") {
    const end = editor.state.doc.content.size;
    editor
      .chain()
      .focus()
      .insertContentAt(end, markdown, {
        parseOptions: { preserveWhitespace: false },
      })
      .run();
    return;
  }

  // cursor
  editor
    .chain()
    .focus()
    .insertContentAt(position.offset, markdown, {
      parseOptions: { preserveWhitespace: false },
    })
    .run();
}
