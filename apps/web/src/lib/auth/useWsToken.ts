"use client";
import { useCallback, useRef } from "react";

// WebSocket connections need a separate short-lived token
// because browsers (especially Safari) do not reliably send
// httpOnly cookies on WebSocket upgrade requests.
// This token expires in 15 minutes — fetch fresh one per connection.

export function useWsToken() {
  const tokenRef = useRef<{ token: string; expiresAt: number } | null>(null);

  const getToken = useCallback(async (): Promise<string> => {
    const now = Date.now();

    // Reuse cached token if still valid (with 30 second buffer)
    if (tokenRef.current && tokenRef.current.expiresAt - 30_000 > now) {
      return tokenRef.current.token;
    }

    const res = await fetch("/api/auth/ws-token", {
      method: "POST",
    });

    if (!res.ok) throw new Error("Failed to get WebSocket token");

    const { token, expiresAt } = await res.json();
    tokenRef.current = { token, expiresAt };
    return token;
  }, []);

  return { getToken };
}
