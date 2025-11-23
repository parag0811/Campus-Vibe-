"use client";

import { usePathname } from "next/navigation";
import { AuthProvider } from "@/components/common/authContext";
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
        {!hide && <MainHeader />}
        <main className="app-main">{children}</main>
        {!hide && <MainFooter />}
      </AuthProvider>
    </ToastProvider>
  );
}
