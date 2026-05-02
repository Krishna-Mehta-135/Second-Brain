"use client";

import { useEffect } from "react";

/**
 * ServiceWorkerRegistration handles the registration and update lifecycle
 * of the application's Service Worker.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Register the service worker
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        console.log("[SW] Registered:", registration.scope);

        // Check for updates every 60 seconds when the page is visible
        const updateInterval = setInterval(() => {
          if (document.visibilityState === "visible") {
            registration.update();
          }
        }, 60_000);

        // Listen for the updatefound event to detect when a new SW is installing
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            // When the new worker is installed (but waiting), notify the UI
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              console.log("[SW] New version available");
              window.dispatchEvent(new CustomEvent("sw-update-available"));
            }
          });
        });

        return () => clearInterval(updateInterval);
      })
      .catch((err) => {
        console.error("[SW] Registration failed:", err);
      });
  }, []);

  return null;
}
