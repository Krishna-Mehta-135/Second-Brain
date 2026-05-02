"use client";
import { useEffect, useState } from "react";
import { Button } from "@repo/ui";
import { X } from "lucide-react";

/**
 * UpdatePrompt is shown when a new Service Worker version is waiting.
 * User must explicitly confirm to avoid interrupting active work.
 */
export function UpdatePrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = () => {
      console.log("[UpdatePrompt] New Service Worker version detected");
      setVisible(true);
    };
    window.addEventListener("sw-update-available", handler);
    return () => window.removeEventListener("sw-update-available", handler);
  }, []);

  if (!visible) return null;

  const applyUpdate = () => {
    // Tell the waiting SW to activate
    navigator.serviceWorker.getRegistration().then((registration) => {
      if (registration?.waiting) {
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
      }
      // Reload the page to take control with the new SW
      window.location.reload();
    });
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-5 bg-primary text-primary-foreground rounded-xl px-5 py-3 shadow-2xl border border-primary/20 backdrop-blur-sm">
        <span className="text-sm font-medium">Update available</span>

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="secondary"
            onClick={applyUpdate}
            className="h-8 px-3 font-bold"
          >
            Reload to update
          </Button>

          <button
            onClick={() => setVisible(false)}
            className="p-1 hover:bg-primary-foreground/10 rounded-full transition-colors"
            aria-label="Dismiss"
          >
            <X className="size-4 opacity-50 hover:opacity-100" />
          </button>
        </div>
      </div>
    </div>
  );
}
