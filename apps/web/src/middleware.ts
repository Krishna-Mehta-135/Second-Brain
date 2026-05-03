import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get("session")?.value;

  // Do not touch static assets, WebSocket, or API paths
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/ws/") ||
    pathname.includes(".") // images, icons, etc.
  ) {
    return NextResponse.next();
  }

  // Protected routes: redirect to /login if no session
  if (pathname.startsWith("/documents")) {
    if (!sessionToken) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      if (loginUrl.pathname !== pathname) {
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  // Auth routes: redirect to /documents if already logged in
  if ((pathname === "/login" || pathname === "/register") && sessionToken) {
    const url = new URL("/documents", request.url);
    if (url.pathname !== pathname) {
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|sw.js).*)"],
};
