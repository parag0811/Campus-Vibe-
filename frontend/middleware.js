import { NextResponse } from "next/server";

const protectedRoutes = ["/admin", "/events", "/profile", "/my-events", "/create-organisation"];
const ownerRoutes = ["/owner"];
const API_BASE = process.env.NEXT_PUBLIC_API_URL;

function match(pathname, base) {
  return pathname === base || pathname.startsWith(`${base}/`);
}

async function fetchWithAuth(path, cookieHeader) {
  return await fetch(`${API_BASE}${path}`, {
    method: "GET",
    cache: "no-store",
    headers: {
      Cookie: cookieHeader || "",
      "User-Agent": "next-middleware",
    },
  });
}

// Check org admin status
async function isOrgAdmin(cookieHeader) {
  const endpoints = [
    "/org/organisationAdminOwner/is-member",
    "/org/organisationAdmin/organisation/is-member",
    "/org/organisationAdmin/is-member",
    "/org-admin/organisation/is-member",
    "/organisation-admin/is-member",
  ];

  for (const path of endpoints) {
    try {
      const res = await fetchWithAuth(path, cookieHeader);

      if (res.status === 401) return false; // not logged in
      if (!res.ok) continue;

      const data = await res.json().catch(() => ({}));

      const ok =
        data?.orgAdmin ||
        data?.isMember ||
        data?.member ||
        data?.isAdmin ||
        data?.admin ||
        data?.owner ||
        data?.isOwner;

      if (ok) return true;
    } catch (err) {
      // try next endpoint
    }
  }

  return false;
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get("token")?.value;
  const cookieHeader = request.headers.get("cookie") || "";

  // Public auth pages
  if (pathname.startsWith("/login") || pathname.startsWith("/register")) {
    if (token) return NextResponse.redirect(new URL("/", request.url));
    return NextResponse.next();
  }

  // Public password reset pages
  if (pathname.startsWith("/forgot-password") || pathname.startsWith("/reset-password")) {
    return NextResponse.next();
  }

  // Owner routes 
  const isOwnerRoute = ownerRoutes.some((r) => match(pathname, r));
  if (isOwnerRoute) {
    if (!token) return NextResponse.redirect(new URL("/login", request.url));
    return NextResponse.next();
  }

  // Admin dashboard
  const isAdminRoute = match(pathname, "/admin");
  if (isAdminRoute) {
    if (!token) return NextResponse.redirect(new URL("/login", request.url));

    const ok = await isOrgAdmin(cookieHeader);
    if (!ok) return NextResponse.redirect(new URL("/", request.url));
  }

  // All other protected routes
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
