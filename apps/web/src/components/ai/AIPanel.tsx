"use client";

import { useState, useCallback } from "react";
import { AIPromptForm } from "./AIPromptForm";
import { AIStatusBar } from "./AIStatusBar";
import { AIHistory, addToHistory } from "./AIHistory";
import { useAIWriter } from "./hooks/useAIWriter";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sparkles, X, History, Wand2 } from "lucide-react";
import type { InsertPosition } from "@repo/types";

export function AIPanel() {
  const [isOpen, setIsOpen] = useState(true);
  const [reusePrompt, setReusePrompt] = useState<string | undefined>(undefined);
  const { status, error, startWriting, cancelWriting, reset } = useAIWriter();

  const handleSubmit = useCallback(
    async (options: { prompt: string; insertPosition: InsertPosition }) => {
      addToHistory(options.prompt);
      try {
        await startWriting(options);
      } catch (err) {
        console.error("AI Writing failed:", err);
      }
    },
    [startWriting],
  );

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 shadow-lg gap-2 bg-surface hover:bg-surface-hover border-brand/20 text-brand z-50"
      >
        <Sparkles className="h-4 w-4" />✦ AI Write
      </Button>
    );
  }

  return (
    <div className="w-80 shrink-0 border-l border-border hidden lg:flex flex-col bg-surface shadow-lg animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-border bg-surface/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="bg-brand/10 p-1.5 rounded-lg">
            <Wand2 className="h-4 w-4 text-brand" />
          </div>
          <div>
            <h3 className="font-bold text-sm leading-none">AI Writing</h3>
            <p className="text-[10px] text-muted-foreground mt-1">
              Powered by Anthropic
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1.5 rounded-full hover:bg-surface-hover text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close AI panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Prompt Form Section */}
          <div className="space-y-3">
            <AIPromptForm
              status={status}
              onSubmit={handleSubmit}
              onCancel={cancelWriting}
              initialPrompt={reusePrompt}
            />

            {error && (
              <div className="flex gap-2 p-3 text-[11px] text-destructive bg-destructive/5 rounded-lg border border-destructive/10">
                <div className="shrink-0 mt-0.5">⚠️</div>
                <div>{error}</div>
              </div>
            )}

            {(status === "done" || status === "cancelled") && (
              <div className="flex items-center justify-center gap-2 py-2">
                <span className="text-[11px] text-muted-foreground">
                  {status === "done"
                    ? "✓ Finished writing"
                    : "↩ Generation stopped"}
                </span>
                <button
                  onClick={() => {
                    reset();
                    setReusePrompt(undefined);
                  }}
                  className="text-[11px] text-brand hover:underline font-medium"
                >
                  Start over
                </button>
              </div>
            )}
          </div>

          <Separator className="opacity-50" />

          {/* History Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-muted-foreground px-1">
              <History className="h-3.5 w-3.5" />
              <span className="text-xs font-semibold uppercase tracking-wider">
                Session History
              </span>
            </div>
            <AIHistory
              onReuse={(prompt) => {
                setReusePrompt(prompt);
                reset();
              }}
            />
          </div>
        </div>
      </ScrollArea>

      {/* Footer / Status Bar */}
      <div className="p-3 border-t border-border bg-surface/30">
        <AIStatusBar status={status} />
      </div>
    </div>
  );
}
