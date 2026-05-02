import { useEffect, useRef, useState } from "react";
import * as Y from "yjs";

// CRITICAL: Never use Tiptap's built-in history extension alongside Y.js
// Tiptap history stores ProseMirror transactions — these conflict with Y.js CRDT operations
// Y.UndoManager is CRDT-aware — it undoes Y.js operations, not PM transactions
// This means undo works correctly across collaborative sessions

export interface UndoManagerState {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
}

export function useUndoManager(doc: Y.Doc): UndoManagerState {
  const ref = useRef<Y.UndoManager | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  useEffect(() => {
    // Track the same Y.XmlFragment that Tiptap's Collaboration extension uses
    const yFragment = doc.getXmlFragment("content");

    const manager = new Y.UndoManager(yFragment, {
      captureTimeout: 500, // Group edits within 500ms into one undo step
      // Without this every character is a separate undo step
    });

    ref.current = manager;

    function sync() {
      setCanUndo(manager.canUndo());
      setCanRedo(manager.canRedo());
    }

    manager.on("stack-item-added", sync);
    manager.on("stack-item-popped", sync);
    sync();

    return () => {
      manager.destroy();
      ref.current = null;
    };
  }, [doc]);

  return {
    canUndo,
    canRedo,
    undo: () => ref.current?.undo(),
    redo: () => ref.current?.redo(),
  };
}
