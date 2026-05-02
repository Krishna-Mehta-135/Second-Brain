"use client";

import { useEffect, useState } from "react";
import { Button } from "@repo/ui";
import { X } from "lucide-react";

/**
 * UpdatePrompt notifies the user when a new Service Worker version is available.
 * It allows the user to refresh the page to apply the update.
 */
export function UpdatePrompt() {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = () => {
      console.log("[UpdatePrompt] Show prompt");
      setShowPrompt(true);
    };
    window.addEventListener("sw-update-available", handler);
    return () => window.removeEventListener("sw-update-available", handler);
  }, []);

  if (!showPrompt) return null;

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
      <div className="bg-primary text-primary-foreground shadow-2xl rounded-lg px-5 py-4 flex items-center gap-6 border border-primary/20 backdrop-blur-sm">
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-semibold">New version available</p>
          <p className="text-xs opacity-90">
            Refresh to get the latest features.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="secondary"
            onClick={applyUpdate}
            className="h-8 px-3 font-bold"
          >
            Update now
          </Button>

          <button
            onClick={() => setShowPrompt(false)}
            className="p-1 hover:bg-primary-foreground/10 rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
