import { NextResponse } from "next/server";

const protectedRoutes = ["/admin", "/events", "/profile", "/my-events", "/create-organisation"];
const ownerRoutes = ["/owner"];

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const OWNER_EMAIL = process.env.NEXT_PUBLIC_OWNER_EMAIL?.toLowerCase?.();

// Safe path match
function match(pathname, base) {
  return pathname === base || pathname.startsWith(`${base}/`);
}

// Base64url-safe JWT email decode
function decodeEmailFromJWT(token) {
  try {
    const payload = token.split(".")[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "===".slice((base64.length + 3) % 4);
    const json = JSON.parse(atob(padded));
    return (json.email || json.userEmail || "").toLowerCase();
  } catch {
    return null;
  }
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
  if (pathname.startsWith("/forgot-password") || pathname.startsWith("/reset-password")) {
    return NextResponse.next();
  }

  // Owner-only routes
  const isOwnerRoute = ownerRoutes.some((r) => match(pathname, r));
  if (isOwnerRoute) {
    if (!token) return NextResponse.redirect(new URL("/login", request.url));

    // Fast path: JWT email match
    const email = decodeEmailFromJWT(token);
    if (OWNER_EMAIL && email && email === OWNER_EMAIL) {
      return NextResponse.next();
    }

    // Fallback: verify via backend (cookie forwarded)
    try {
      // Try common endpoints; keep logic lenient to not break existing APIs
      let res = await fetch(`${API_BASE}/user/me`, {
        headers: { cookie: request.headers.get("cookie") || "" },
        cache: "no-store",
      });
      if (res.status === 404) {
        res = await fetch(`${API_BASE}/auth/me`, {
          headers: { cookie: request.headers.get("cookie") || "" },
          cache: "no-store",
        });
      }
      if (res.status !== 200) return NextResponse.redirect(new URL("/", request.url));
      const data = await res.json().catch(() => ({}));
      const backendEmail = (data?.user?.email || data?.email || "").toLowerCase();
      if (OWNER_EMAIL && backendEmail === OWNER_EMAIL) return NextResponse.next();
      return NextResponse.redirect(new URL("/", request.url));
    } catch {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // Admin routes (org owners/admins) — keep existing logic
  const isAdminRoute = match(pathname, "/admin");
  if (isAdminRoute) {
    if (!token) return NextResponse.redirect(new URL("/login", request.url));
    try {
      const res = await fetch(`${API_BASE}/org-admin/organisation/is-member`, {
        headers: { cookie: request.headers.get("cookie") || "" },
        cache: "no-store",
      });
      if (res.status === 401) return NextResponse.redirect(new URL("/login", request.url));
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.orgAdmin) {
        return NextResponse.redirect(new URL("/", request.url));
      }
    } catch {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // Other protected routes: login required
  const isProtected =
    !isAdminRoute && !isOwnerRoute && protectedRoutes.some((r) => match(pathname, r));
  if (isProtected && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/owner/:path*",
    "/admin/:path*",
    "/events/:path*",
    "/profile/:path*",
    "/my-events/:path*",
    "/event-analytics/:path*",
    "/create-organisation",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password/:path*",
    "/",
  ],
};
