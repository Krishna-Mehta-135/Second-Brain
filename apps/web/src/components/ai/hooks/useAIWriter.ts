"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useSyncManager } from "@/lib/sync/SyncContext";
import type { InsertPosition, WSMessage } from "@repo/types";

export type AIStatus = "idle" | "writing" | "done" | "error" | "cancelled";

interface WriteOptions {
  prompt: string;
  insertPosition: InsertPosition;
}

export function useAIWriter() {
  const manager = useSyncManager();
  const [status, setStatus] = useState<AIStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const currentRequestId = useRef<string | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const startWriting = useCallback(
    async (options: WriteOptions): Promise<void> => {
      // Cancel any in-progress request before starting new one
      if (currentRequestId.current) {
        manager.send({
          type: "ai-cancel",
          requestId: currentRequestId.current,
        });
      }

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
          if (msg.isDone) {
            cleanup();
            currentRequestId.current = null;
            setStatus("done");
            resolve();
          }
        });

        const unsubError = manager.onMessage("error", (msg: WSMessage) => {
          if (msg.type !== "error") return;
          if (msg.code !== "AI_UNAVAILABLE" && msg.code !== "AI_RATE_LIMITED")
            return;
          cleanup();
          currentRequestId.current = null;
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
