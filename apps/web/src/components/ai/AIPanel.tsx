"use client";
import { Sparkles } from "lucide-react";

export function AIPanel() {
  return (
    <div className="w-80 border-l border-border bg-surface/30 hidden lg:flex flex-col">
      <div className="h-12 px-4 border-b border-border flex items-center gap-2 font-medium">
        <Sparkles className="h-4 w-4 text-brand" />
        AI Assistant
      </div>
      <div className="flex-1 p-4 text-sm text-muted-foreground">
        AI is ready to help. Select text or press Space to trigger commands.
      </div>
    </div>
  );
}
