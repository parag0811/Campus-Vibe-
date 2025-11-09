"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import styles from "./main-header.module.css";
import { useAuth } from "@/components/common/authContext";

export default function MainHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, loading, logout, checkAuth, authChecked } = useAuth();
  const [localLoading, setLocalLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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

    const hasAdmin = (user?.organisation_Admin?.length || 0) > 0 || user?.role === "organisationAdmin";

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

              {hasAdmin && (
                <button
                  className={styles.menuItem}
                  onClick={() => { setMenuOpen(false); router.push("/admin"); }}
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
