import { NextResponse } from "next/server";

const protectedRoutes = ["/admin", "/events", "/profile", "/my-events"];

function match(pathname, base) {
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("token")?.value;

  if (pathname.startsWith("/login") || pathname.startsWith("/register")) {
    if (token) return NextResponse.redirect(new URL("/", request.url));
    return NextResponse.next();
  }

  if (
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password")
  ) {
    return NextResponse.next();
  }

  const isProtected = protectedRoutes.some((r) => match(pathname, r));
  if (isProtected && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/events/:path*",
    "/profile/:path*",
    "/my-events/:path*",
    "/event-analytics/:path*",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password/:path*",
    "/",
  ],
};
