"use client";
import { useContext } from "react";
import { AuthContext } from "./AuthProvider";
import type { AuthState } from "./types";

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function useUser() {
  const auth = useAuth();
  if (auth.status !== "authenticated") {
    throw new Error("useUser called outside authenticated context");
  }
  return auth.session.user;
}
