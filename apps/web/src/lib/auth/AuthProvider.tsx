"use client";
import React, { createContext, useEffect, useState } from "react";

import type { AuthState, Session } from "./types";

export const AuthContext = createContext<AuthState>({ status: "loading" });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    // Fetch session from API — cookie is sent automatically if it's not httpOnly
    // But since it IS httpOnly, we need an endpoint that validates it and returns user data
    fetch("/api/auth/me")
      .then((r) => (r.ok ? (r.json() as Promise<Session>) : null))
      .then((session) => {
        setState(
          session
            ? { status: "authenticated", session }
            : { status: "unauthenticated" },
        );
      })
      .catch(() => setState({ status: "unauthenticated" }));
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
