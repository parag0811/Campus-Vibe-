"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/dashboard-page/sidebar";
import styles from "./admin.module.css";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function getCookie(name) {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return m ? decodeURIComponent(m[2]) : null;
}
function getUserIdFromJWT() {
  try {
    const token = getCookie("token");
    if (!token) return null;
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(payload)).userId || null;
  } catch {
    return null;
  }
}

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/org/organisationAdmin/my-organisation`, {
          credentials: "include",
          cache: "no-store",
        });
        const data = await res.json();
        if (!mounted) return;

        const org = data?.organisation || null;
        const uid = getUserIdFromJWT();
        const createdBy = org?.createdBy?._id || org?.createdBy || null;
        setIsOwner(uid && createdBy && String(uid) === String(createdBy));
      } catch {
        setIsOwner(false);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const navItems = useMemo(() => {
    const all = [
      { href: "/admin/events", label: "Events", ownerOnly: false },
      { href: "/admin/organisation", label: "Organisation", ownerOnly: true },
      { href: "/admin/admins", label: "Admins", ownerOnly: true },
      { href: "/admin/earnings", label: "Earnings", ownerOnly: true },
    ];
    return all.filter((n) => isOwner || !n.ownerOnly);
  }, [isOwner]);

  return (
    <div className={styles.adminContainer}>
      <header className={styles.header}>
        <Link className={styles.logo} href="/">Campus Vibe</Link>
      </header>

      <div className={styles.contentWrapper}>
        <Sidebar />
        <main className={styles.mainContent}>{children}</main>
      </div>
    </div>
  );
}
