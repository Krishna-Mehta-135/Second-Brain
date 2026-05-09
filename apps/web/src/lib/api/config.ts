/**
 * Centralized API URL configuration.
 *
 * Two distinct concerns:
 *
 * 1. `API_BASE_URL` — The backend origin **without** the `/api/v1` prefix.
 *    Used by server-side proxy routes that already hard-code the versioned path
 *    in their fetch calls (e.g. `${API_BASE_URL}/api/v1/auth/me`).
 *    Resolved from `API_BASE_URL` → `NEXT_PUBLIC_API_BASE_URL` → localhost fallback.
 *
 * 2. `NEXT_PUBLIC_API_URL` — The fully qualified API root **with** `/api/v1`.
 *    Baked into the client bundle at build time for direct browser-to-backend
 *    calls (e.g. OAuth redirects: `${NEXT_PUBLIC_API_URL}/auth/github`).
 */

/**
 * Server-side only: backend origin without /api/v1.
 * All proxy route handlers import this.
 */
export const API_BASE_URL: string =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://127.0.0.1:8000";
