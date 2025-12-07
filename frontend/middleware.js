import { NextResponse } from "next/server";

const protectedRoutes = [
  "/admin",
  "/events",
  "/profile",
  "/my-events",
  "/create-organisation",
];

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
      Cookie: cookieHeader,
    },
  });
}

async function isOrgAdmin(cookieHeader) {
  const endpoints = [
    "/org/organisationAdminOwner/is-member",
    "/org/organisationAdmin/organisation/is-member",
    "/org/organisationAdmin/is-member",
    "/org-admin/organisation/is-member",
    "/organisation-admin/is-member",
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetchWithAuth(ep, cookieHeader);

      if (res.status === 401) return false;
      if (!res.ok) continue;

      const data = await res.json().catch(() => ({}));

      if (
        data?.orgAdmin ||
        data?.isMember ||
        data?.member ||
        data?.owner ||
        data?.isAdmin
      )
        return true;
    } catch {
      // try next endpoint
    }
  }

  return false;
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get("token")?.value;
  const cookieHeader = request.headers.get("cookie") || "";

  // Public pages
  if (pathname.startsWith("/login") || pathname.startsWith("/register")) {
    if (token) return NextResponse.redirect(new URL("/", request.url));

    if (cookieHeader) {
      try {
        const res = await fetchWithAuth("/auth/check-login", cookieHeader);
        if (res && res.ok) {
          const data = await res.json().catch(() => ({}));
          if (data.loggedIn) return NextResponse.redirect(new URL("/", request.url));
        }
      } catch (e) {
        // ignore errors and allow the request
      }
    }

    return NextResponse.next();
  }

  if (
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password")
  ) {
    return NextResponse.next();
  }

  // Owner routes
  if (ownerRoutes.some((r) => match(pathname, r))) {
     return NextResponse.next();
  }

  // Admin dashboard
  if (match(pathname, "/admin")) {
     if (!token) return NextResponse.next();

     const ok = await isOrgAdmin(cookieHeader);
     if (!ok) return NextResponse.redirect(new URL("/", request.url));
  }

  // Standard protected routes
  const isProtected =
    protectedRoutes.some((r) => match(pathname, r)) &&
    !match(pathname, "/admin") &&
    !ownerRoutes.some((r) => match(pathname, r));

  if (isProtected && !token) {
     return NextResponse.next();
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
