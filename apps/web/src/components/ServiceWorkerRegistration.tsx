"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("SW registered: ", registration);
          })
          .catch((registrationError) => {
            console.log("SW registration failed: ", registrationError);
          });
      });
    } else if ("serviceWorker" in navigator) {
      // Register in dev for testing if needed, or just keep it production only
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => console.log("SW registered in dev:", reg.scope));
    }
  }, []);

  return null;
}
