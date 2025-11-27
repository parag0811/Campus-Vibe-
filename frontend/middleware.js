import { NextResponse } from "next/server";

const protectedRoutes = ["/admin", "/events", "/profile", "/my-events", "/create-organisation"];
const ownerRoutes = ["/owner"];
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// Safe path match
function match(pathname, base) {
  return pathname === base || pathname.startsWith(`${base}/`);
}

async function isOrgAdmin(cookieHeader) {
  const endpoints = [
    "/org/organisationAdminOwner/is-member",
    "/org/organisationAdmin/organisation/is-member",
    "/org/organisationAdmin/is-member",
    "/org-admin/organisation/is-member",
    "/organisation-admin/is-member",
  ];
  const headers = { cookie: cookieHeader || "" };

  for (const path of endpoints) {
    try {
      const res = await fetch(`${API_BASE}${path}`, {
        headers,
        cache: "no-store",
      });
      if (res.status === 401) return false; // not logged in
      if (!res.ok) continue;
      const data = await res.json().catch(() => ({}));
      // Accept any of these flags as “is admin/member”
      const ok =
        data?.orgAdmin ||
        data?.isMember ||
        data?.member ||
        data?.isAdmin ||
        data?.admin ||
        data?.owner ||
        data?.isOwner;
      if (ok) return true;
    } catch {
      //  next endpoint
    }
  }
  return false;
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

  // Owner-only: only require login here (backend fetches owner)
  const isOwnerRoute = ownerRoutes.some((r) => match(pathname, r));
  if (isOwnerRoute) {
    if (!token) return NextResponse.redirect(new URL("/login", request.url));
    return NextResponse.next();
  }

  // Admin (org owners/admins)
  const isAdminRoute = match(pathname, "/admin");
  if (isAdminRoute) {
    if (!token) return NextResponse.redirect(new URL("/login", request.url));
    const ok = await isOrgAdmin(request.headers.get("cookie") || "");
    if (!ok) return NextResponse.redirect(new URL("/", request.url));
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
