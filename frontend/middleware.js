import { NextResponse } from 'next/server';

const protectedRoutes = ['/profile', '/events', '/admin'];

// Helper for dynamic routes
function matchRoute(pathname, route) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('token')?.value;

  // 1. Block logged-in users from accessing /login and /register
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/register')
  ) {
    if (token) {
      // Already logged in, redirect to profile (or dashboard/home)
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // 2. Allow public routes
  if (
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password')
  ) {
    return NextResponse.next();
  }

  // 3. Block unauthenticated users from protected routes
  if (protectedRoutes.some(route => matchRoute(pathname, route))) {
    if (!token) {
      // Not logged in, redirect to login
      return NextResponse.redirect(new URL('/login', request.url));
    }
    // If token is present, let backend handle role (for /admin)
    return NextResponse.next();
  }

  // 4. Allow all other routes
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/profile/:path*',
    '/events/:path*',
    '/admin/:path*',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password/:path*',
  ],
};