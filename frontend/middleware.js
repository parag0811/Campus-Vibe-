import { NextResponse } from 'next/server';

const adminOnlyRoutes = ['/admin'];
const normalUserOnlyRoutes = ['/events', '/profile', '/my-events'];

function match(pathname, base) {
  return pathname === base || pathname.startsWith(`${base}/`);
}

function getRole(token) {
  if (!token) return null;
  try {
    let payload = token.split('.')[1];
    payload = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(atob(payload));
    return json.role || json.userRole || null;
  } catch {
    return null;
  }
}

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('token')?.value;
  const role = getRole(token);

  // Block logged-in users from auth pages
  if (pathname.startsWith('/login') || pathname.startsWith('/register')) {
    if (token) return NextResponse.redirect(new URL('/', request.url));
    return NextResponse.next();
  }

  // Public recovery pages
  if (pathname.startsWith('/forgot-password') || pathname.startsWith('/reset-password')) {
    return NextResponse.next();
  }

  const isAdminRoute = adminOnlyRoutes.some(r => match(pathname, r));
  const isNormalUserRoute = normalUserOnlyRoutes.some(r => match(pathname, r));

  // Require auth for protected routes
  if ((isAdminRoute || isNormalUserRoute) && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // organisationAdmin always redirected away from normal-user-only areas
  if (role === 'organisationAdmin' && isNormalUserRoute) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  // Normal (non-admin) users blocked from /admin
  if (isAdminRoute && role !== 'organisationAdmin') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Auto-route admin from root
  if (role === 'organisationAdmin' && (pathname === '/' || pathname === '')) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/events/:path*',
    '/profile/:path*',
    '/my-events/:path*',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password/:path*',
    '/',
  ],
};