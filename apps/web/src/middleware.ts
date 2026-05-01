// This runs at the edge before any page renders
// Protected routes redirect to login if no session cookie exists
// Auth routes redirect to /dashboard if already logged in

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/login", "/register", "/api/"];
const AUTH_ROUTES = ["/login", "/register"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get("session")?.value;

  const isPublic = PUBLIC_ROUTES.some(
    (r) => pathname === r || pathname.startsWith("/api/"),
  );
  const isAuth = AUTH_ROUTES.some((r) => pathname === r);

  // Already logged in and hitting auth pages — redirect to app
  if (isAuth && sessionToken) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Not logged in and hitting protected page — redirect to login
  if (!isPublic && !sessionToken && pathname !== "/") {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw.js).*)"],
};
