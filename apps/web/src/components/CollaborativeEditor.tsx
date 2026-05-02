"use client";

import React, { useEffect, useState, useRef } from "react";
import * as Y from "yjs";
import { useDocument } from "@/lib/sync/useDocument";
import { StatusDot } from "@repo/ui";

interface CollaborativeEditorProps {
  docId: string;
}

export const CollaborativeEditor: React.FC<CollaborativeEditorProps> = () => {
  const { doc, status } = useDocument();
  const [text, setText] = useState<string>("");
  const yTextRef = useRef<Y.Text | null>(null);

  useEffect(() => {
    const yText = doc.getText("content");
    yTextRef.current = yText;

    // Set initial text
    setText(yText.toString());

    // Listen for changes from Y.js (local or remote)
    const observer = () => {
      setText(yText.toString());
    };
    yText.observe(observer);

    return () => {
      yText.unobserve(observer);
    };
  }, [doc]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    const yText = yTextRef.current;
    if (!yText) return;

    // Simple diffing for demo purposes
    // We clear and re-insert (NOT efficient, but shows CRDT convergence)
    doc.transact(() => {
      const currentText = yText.toString();
      yText.delete(0, currentText.length);
      yText.insert(0, newText);
    });
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex justify-between items-center p-4 border-b border-border">
        <h2 className="text-lg font-semibold">Collaborative Editor</h2>
        <StatusDot status={status === "connected" ? "online" : status} />
      </div>

      <div className="flex-1 p-4">
        <textarea
          value={text}
          onChange={handleChange}
          className="w-full h-full p-4 bg-surface border border-border rounded-lg focus:ring-2 focus:ring-brand outline-none resize-none"
          placeholder="Start collaborating..."
        />
      </div>

      <div className="p-2 text-[10px] text-muted-foreground bg-surface border-t border-border px-4">
        {status === "offline"
          ? "Offline: Changes saved to IndexedDB"
          : "Syncing in real-time"}
      </div>
    </div>
  );
};
