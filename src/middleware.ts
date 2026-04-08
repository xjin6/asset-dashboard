import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PASSWORD = process.env.DASHBOARD_PASSWORD;

export function middleware(request: NextRequest) {
  // Skip auth for API routes (they're server-side only anyway)
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // If no password configured, allow access
  if (!PASSWORD || PASSWORD === "your_password_here") {
    return NextResponse.next();
  }

  // Check cookie
  const auth = request.cookies.get("dashboard-auth")?.value;
  if (auth === PASSWORD) {
    return NextResponse.next();
  }

  // Show login page for non-authenticated requests
  const url = request.nextUrl.clone();
  if (url.pathname === "/login") {
    return NextResponse.next();
  }

  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
