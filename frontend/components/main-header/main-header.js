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

  useEffect(() => {
    setIsClient(true);
  }, []);

  const safeCheckAuth = useCallback(async () => {
    try {
      await checkAuth();
    } catch (error) {
      console.error("Auth check failed in header:", error);
    }
  }, [checkAuth]);

  useEffect(() => {
    if (isClient) safeCheckAuth();
    // close menu on route change
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
    } catch (error) {
      console.error("Logout error:", error);
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
          <Link href="/login" className={styles.loginButton}>
            Login
          </Link>
          <Link href="/register" className={styles.signupButton}>
            Signup
          </Link>
        </>
      );
    }

    // Authenticated: show Explore + Hamburger only
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
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  router.push("/profile");
                }}
              >
                Profile
              </button>
              <button
                className={styles.menuItem}
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  router.push("/my-events");
                }}
              >
                My Registered Events
              </button>

              <div className={styles.menuSection}>
                <div className={styles.menuSectionTitle}>My Organisations</div>
                <div className={styles.orgList}>
                  {(user?.organisation_Admin && user.organisation_Admin.length > 0)
                    ? user.organisation_Admin.map((org, i) => {
                        const id = org?._id || org;
                        const name = org?.name || `Organisation ${i + 1}`;
                        return (
                          <button
                            key={id}
                            className={styles.orgItem}
                            role="menuitem"
                            onClick={() => {
                              setMenuOpen(false);
                              router.push(`/admin/org/${id}`);
                            }}
                          >
                            {name}
                          </button>
                        );
                      })
                    : (
                      <div className={styles.orgEmpty}>No organisations yet</div>
                    )}
                </div>
              </div>

              <button className={`${styles.menuItem} ${styles.logout}`} role="menuitem" onClick={handleLogout}>
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
