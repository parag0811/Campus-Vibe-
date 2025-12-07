"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "@/components/common/authContext";
import { ToastProvider } from "@/components/common/toast";
import MainHeader from "@/components/main-header/main-header";
import MainFooter from "@/components/main-footer/main-footer";

const hiddenRoutes = new Set([
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
]);

export default function Providers({ children }) {
  const pathname = usePathname();

  const hide =
    hiddenRoutes.has(pathname) ||
    pathname.startsWith("/reset-password/") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/org-admin");

  return (
    <ToastProvider>
      <AuthProvider>
        <AuthGate pathname={pathname}>
          {!hide && <MainHeader />}
          <main className="app-main">{children}</main>
          {!hide && <MainFooter />}
        </AuthGate>
      </AuthProvider>
    </ToastProvider>
  );
}

function AuthGate({ children, pathname }) {
  const { isAuthenticated, authChecked } = useAuth();
  const router = useRouter();

  const protectedPaths = new Set([
    "/admin",
    "/events",
    "/profile",
    "/my-events",
    "/create-organisation",
    "/owner",
  ]);

  useEffect(() => {
    if (!authChecked) return;

    const needsAuth = Array.from(protectedPaths).some((p) =>
      pathname === p || pathname.startsWith(p + "/")
    );

    if (needsAuth && !isAuthenticated) {
      router.push("/login");
    }
  }, [authChecked, isAuthenticated, pathname, router]);

  return children;
}
