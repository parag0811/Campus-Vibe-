"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import styles from "./main-header.module.css";
import { useAuth } from "@/components/common/authContext";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export default function MainHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, loading, logout, checkAuth, authChecked } = useAuth();
  const [localLoading, setLocalLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isOrgAdmin, setIsOrgAdmin] = useState(false);

  useEffect(() => { setIsClient(true); }, []);

  const safeCheckAuth = useCallback(async () => {
    try { await checkAuth(); } catch {}
  }, [checkAuth]);

  useEffect(() => {
    if (isClient) safeCheckAuth();
    setMenuOpen(false);
  }, [safeCheckAuth, router, isClient, pathname]);

  useEffect(() => {
    const onEsc = (e) => e.key === "Escape" && setMenuOpen(false);
    if (menuOpen) window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [menuOpen]);

  // Backend  check to allow "student" role who is org admin
  const fetchOrgAdmin = useCallback(async () => {
    if (!API_BASE || !authChecked || !isAuthenticated) {
      setIsOrgAdmin(false);
      return;
    }
    const endpoints = [
      "/org-admin/organisation/is-member",
    ];
    const headers = { "Cache-Control": "no-cache" };
    for (const ep of endpoints) {
      try {
        const res = await fetch(`${API_BASE}${ep}`, { credentials: "include", headers });
        if (res.status === 401) { setIsOrgAdmin(false); return; }
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
        if (ok) { setIsOrgAdmin(true); return; }
      } catch {
        // try next endpoint
      }
    }
    setIsOrgAdmin(false);
  }, [API_BASE, authChecked, isAuthenticated]);

  useEffect(() => {
    fetchOrgAdmin();
  }, [fetchOrgAdmin, pathname]); 

  const handleLogout = async () => {
    setLocalLoading(true);
    try {
      const success = await logout();
      if (success) router.push("/login");
    } finally {
      setLocalLoading(false);
      setMenuOpen(false);
    }
  };

  const renderAuthActions = () => {
    if (!isClient || !authChecked || loading || localLoading) {
      return (
        <div className={styles.loaderContainer}>
          <span className={styles.loader}></span>
        </div>
      );
    }

    if (!isAuthenticated) {
      return (
        <>
          <Link href="/login" className={styles.loginButton}>Login</Link>
          <Link href="/register" className={styles.signupButton}>Signup</Link>
        </>
      );
    }

    const hasAdminHint =
      user?.role === "organisationAdmin" ||
      (Array.isArray(user?.roles) && user.roles.includes("organisationAdmin")) ||
      (Array.isArray(user?.organisation_Admin) && user.organisation_Admin.length > 0) ||
      (Array.isArray(user?.organisation_admin) && user.organisation_admin.length > 0) ||
      (Array.isArray(user?.organisationAdmins) && user.organisationAdmins.length > 0);

    const showAdmin = isOrgAdmin || hasAdminHint;

    return (
      <div className={styles.authActions}>
        {pathname !== "/events" && (
          <Link href="/events" className={styles.exploreLink} aria-label="Explore Events">
            Explore Events
          </Link>
        )}
        <button
          className={styles.hamburger}
          aria-label="Open menu"
          aria-expanded={menuOpen}
          aria-haspopup="true"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>

        {menuOpen && (
          <>
            <div className={styles.menuOverlay} onClick={() => setMenuOpen(false)} />
            <nav className={styles.menuPanel} role="menu" aria-label="User menu">
              <button
                className={styles.menuItem}
                onClick={() => { setMenuOpen(false); router.push("/profile"); }}
              >
                Profile
              </button>

              <button
                className={styles.menuItem}
                onClick={() => { setMenuOpen(false); router.push("/my-events"); }}
              >
                My Registered Events
              </button>

              {showAdmin && (
                <button
                  className={styles.menuItem}
                  onClick={() => { setMenuOpen(false); router.push("/admin/events"); }}
                >
                  Admin Dashboard
                </button>
              )}

              <button
                className={`${styles.menuItem} ${styles.logout}`}
                role="menuitem"
                onClick={handleLogout}
              >
                Log Out
              </button>
            </nav>
          </>
        )}
      </div>
    );
  };

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.logo}>
          <Link href="/">
            <span className={styles.eventText}>Campus</span>
            <span className={styles.hiveText}> Vibe</span>
          </Link>
        </div>
        <div className={styles.actions}>{renderAuthActions()}</div>
      </div>
    </header>
  );
}
