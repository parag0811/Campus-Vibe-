import { NextResponse } from "next/server";

const protectedRoutes = ["/admin", "/events", "/profile", "/my-events", "/create-organisation"];

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function match(pathname, base) {
  return pathname === base || pathname.startsWith(`${base}/`);
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("token")?.value;

  // Public auth pages
  if (pathname.startsWith("/login") || pathname.startsWith("/register")) {
    if (token) return NextResponse.redirect(new URL("/", request.url));
    return NextResponse.next();
  }

  // Public recovery pages
  if (
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password")
  ) {
    return NextResponse.next();
  }

  // Restrict /admin to org owners or assigned admins
  const isAdminRoute = match(pathname, "/admin");
  if (isAdminRoute) {
    if (!token) return NextResponse.redirect(new URL("/login", request.url));

    try {
      const res = await fetch(
        `${API_BASE}/org-admin/organisation/is-member`,
        {
          headers: { cookie: request.headers.get("cookie") || "" },
          cache: "no-store",
        }
      );

      if (res.status === 401) {
        return NextResponse.redirect(new URL("/login", request.url));
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.orgAdmin) {
        // Not an org owner/admin -> block /admin
        return NextResponse.redirect(new URL("/", request.url));
      }
    } catch {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // Other protected routes require login only
  const isProtected =
    !isAdminRoute && protectedRoutes.some((r) => match(pathname, r));
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
