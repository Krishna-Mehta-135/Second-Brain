"use client";
import { useEffect, useState } from "react";
import * as Y from "yjs";

interface WordCountStats {
  words: number;
  characters: number;
  charactersNoSpaces: number;
  readingTimeMinutes: number;
}

/**
 * useWordCount extracts text from a Y.XmlFragment and computes document statistics.
 * Uses observeDeep to react to changes in nested elements.
 */
export function useWordCount(doc: Y.Doc): WordCountStats {
  const [stats, setStats] = useState<WordCountStats>({
    words: 0,
    characters: 0,
    charactersNoSpaces: 0,
    readingTimeMinutes: 0,
  });

  useEffect(() => {
    const yContent = doc.getXmlFragment("content");

    function compute() {
      // Extract plain text from Y.XmlFragment
      const text = xmlFragmentToText(yContent);
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      const characters = text.length;
      const charactersNoSpaces = text.replace(/\s/g, "").length;

      setStats({
        words,
        characters,
        charactersNoSpaces,
        readingTimeMinutes: Math.ceil(words / 200), // avg reading speed
      });
    }

    // observeDeep is required because Tiptap uses nested Y.XmlElements/Y.XmlTexts
    yContent.observeDeep(compute);
    compute();

    return () => yContent.unobserveDeep(compute);
  }, [doc]);

  return stats;
}

/**
 * Recursively extracts plain text from Y.XmlFragment/Y.XmlElement.
 */
function xmlFragmentToText(fragment: Y.XmlFragment | Y.XmlElement): string {
  let text = "";
  fragment.forEach((node) => {
    if (node instanceof Y.XmlText) {
      text += node.toString();
    } else if (node instanceof Y.XmlElement) {
      // Recursively process children
      text += xmlFragmentToText(node) + "\n";
    }
  });
  return text;
}
