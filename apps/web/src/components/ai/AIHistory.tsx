"use client";

import { useState, useEffect } from "react";

interface Prompt {
  text: string;
  usedAt: number;
}

interface AIHistoryProps {
  onReuse: (prompt: string) => void;
}

const STORAGE_KEY = "sb_ai_history";

export function AIHistory({ onReuse }: AIHistoryProps) {
  const [history, setHistory] = useState<Prompt[]>([]);

  // Load from session storage if possible, or just keep in memory for the session
  // The prompt asked for session-only history
  useEffect(() => {
    const load = () => {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          setHistory(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to parse AI history", e);
        }
      }
    };

    load();
    window.addEventListener("ai-history-updated", load);
    return () => window.removeEventListener("ai-history-updated", load);
  }, []);

  if (history.length === 0) {
    return (
      <div className="py-4 text-center">
        <p className="text-xs text-white/70">
          Your recent prompts will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-bold text-white/70 uppercase tracking-wider">
        Recent
      </p>
      <div className="space-y-1">
        {history.slice(0, 5).map((item, i) => (
          <button
            key={i}
            onClick={() => onReuse(item.text)}
            className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-[hsl(var(--sb-bg-hover))] text-white/90 hover:text-white transition-colors whitespace-pre-wrap line-clamp-3"
          >
            {item.text}
          </button>
        ))}
      </div>
    </div>
  );
}

// Utility to add to history (would be called from AIPanel or hook)
export function addToHistory(prompt: string) {
  if (typeof window === "undefined") return;
  const saved = sessionStorage.getItem(STORAGE_KEY);
  let history: Prompt[] = [];
  if (saved) {
    try {
      history = JSON.parse(saved);
    } catch {
      // Ignore invalid JSON in session storage
    }
  }

  // Don't add duplicates consecutively
  if (history[0]?.text === prompt) return;

  const newHistory = [{ text: prompt, usedAt: Date.now() }, ...history].slice(
    0,
    10,
  );
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));

  // Trigger a custom event to notify listeners in the same tab
  window.dispatchEvent(new CustomEvent("ai-history-updated"));
}
