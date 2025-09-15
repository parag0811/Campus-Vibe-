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

  // Set isClient to true when component mounts (avoiding hydration errors)
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Safe checkAuth that tracks component mounting
  const safeCheckAuth = useCallback(async () => {
    let isMounted = true;
    
    try {
      await checkAuth();
    } catch (error) {
      console.error("Auth check failed in header:", error);
    }
    
    return () => {
      isMounted = false;
    };
  }, [checkAuth]);

  // Force a UI update whenever route changes
  useEffect(() => {
    if (isClient) {
      safeCheckAuth();
    }
  }, [safeCheckAuth, router, isClient]);

  const handleLogout = async () => {
    setLocalLoading(true);
    try {
      const success = await logout();
      if (success) {
        router.push("/login");
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setLocalLoading(false);
    }
  };

  // Render auth actions based on authentication state
  const renderAuthActions = () => {
    if (!isClient || !authChecked || loading || localLoading) {
      return (
        <div className={styles.loaderContainer}>
          <span className={styles.loader}></span>
        </div>
      );
    }

    return !isAuthenticated ? (
      <>
        <Link href="/login" className={styles.loginButton}>
          Login
        </Link>
        <Link href="/register" className={styles.signupButton}>
          Signup
        </Link>
      </>
    ) : (
      <div className={styles.navLinks}>
        {/* Hide Events link if already on /events */}
        {pathname !== "/events" && (
          <Link href="/events" className={styles.navLink}>
            Events
          </Link>
        )}
        <Link href="/profile" className={styles.navLink}>
          Profile
        </Link>
        <button onClick={handleLogout} className={styles.logoutButton}>
          LogOut
        </button>
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
        <div className={styles.actions}>
          {renderAuthActions()}
        </div>
      </div>
    </header>
  );
}
