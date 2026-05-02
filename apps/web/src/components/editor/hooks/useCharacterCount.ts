import { useState, useEffect } from "react";
import type { Editor } from "@tiptap/react";

export function useCharacterCount(editor: Editor | null) {
  const [characters, setCharacters] = useState(0);
  const [words, setWords] = useState(0);

  useEffect(() => {
    if (!editor) return;

    const update = () => {
      setCharacters(editor.storage.characterCount.characters());
      setWords(editor.storage.characterCount.words());
    };

    editor.on("update", update);
    update();

    return () => {
      editor.off("update", update);
    };
  }, [editor]);

  return { characters, words };
}
