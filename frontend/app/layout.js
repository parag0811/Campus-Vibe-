"use client";
import { usePathname } from "next/navigation";
import { AuthProvider } from "@/components/common/authContext";
import { ToastProvider } from "@/components/common/toast";
import MainHeader from "@/components/main-header/main-header";
import MainFooter from "@/components/main-footer/main-footer";
import "./globals.css";

const hideHeaderFooterRoutes = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  '/admin',
  '/admin/organisation',
  '/admin/events',
  '/admin/events/create-event',
  '/admin/admins',
  '/admin/profile',
];

export default function RootLayout({ children }) {
  const pathname = usePathname();

  // Hide header/footer for exact matches and for reset-password/[token]
  const hideHeaderFooter =
    hideHeaderFooterRoutes.includes(pathname) ||
    pathname.startsWith("/reset-password/");

  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <AuthProvider>
            <div
              style={{
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {!hideHeaderFooter && <MainHeader />}
              <main style={{ flex: 1 }}>{children}</main>
              {!hideHeaderFooter && <MainFooter />}
            </div>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
