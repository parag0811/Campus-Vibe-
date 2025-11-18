"use client";
import { usePathname } from "next/navigation";
import { AuthProvider } from "@/components/common/authContext";
import { ToastProvider } from "@/components/common/toast";
import MainHeader from "@/components/main-header/main-header";
import MainFooter from "@/components/main-footer/main-footer";
import "./globals.css";

const hideHeaderFooterRoutes = new Set([
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
]);

export default function RootLayout({ children }) {
  const pathname = usePathname();

  const hideHeaderFooter =
    hideHeaderFooterRoutes.has(pathname) ||
    pathname.startsWith("/reset-password/") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/org-admin");

  return (
    <html lang="en" style={{ colorScheme: "light" }}>
      <head>
        <meta name="theme-color" content="#ffffff" />
      </head>
      <body>
        <ToastProvider>
          <AuthProvider>
            <div className="app-shell">
              {!hideHeaderFooter && <MainHeader />}
              <main className="app-main">{children}</main>
              {!hideHeaderFooter && <MainFooter />}
            </div>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
