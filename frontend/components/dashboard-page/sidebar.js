"use client";
import { useEffect, useState } from "react";
import styles from "./sidebar.module.css";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import OrganisationIcon from "@/assets/logo/profile.svg";
import eventsIcon from "@/assets/logo/events.svg";
import adminsIcon from "@/assets/logo/admins.svg";
import earningsIcon from "@/assets/logo/earnings.svg";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function getCookie(name) {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return m ? decodeURIComponent(m[2]) : null;
}
function getJwtPayload() {
  try {
    const token = getCookie("token");
    if (!token) return null;
    const b64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(b64));
  } catch {
    return null;
  }
}

export default function Sidebar() {
  const pathname = usePathname();
  const [isOwner, setIsOwner] = useState(false);
  const [orgAdmin, setOrgAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/org-admin/organisation/is-member`, {
          credentials: "include",
          headers: { "Cache-Control": "no-cache" },
        });
        const data = await res.json();
        if (!mounted) return;
        setOrgAdmin(!!data.orgAdmin);
        setIsOwner(!!data.isOwner);
      } catch {
        if (mounted) {
          setOrgAdmin(false);
          setIsOwner(false);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const payload = getJwtPayload();
  const role = payload?.role;

  // Show full menu only if owner or global organisationAdmin role.
  const canSeeFull = (role === "organisationAdmin") || isOwner;

  const navItems = [
    { href: "/admin/organisation", label: "Organisation", icon: OrganisationIcon, gated: true },
    { href: "/admin/events", label: "Events", icon: eventsIcon, always: true },
    { href: "/admin/admins", label: "Admins", icon: adminsIcon, gated: true },
    { href: "/admin/earnings", label: "Earnings", icon: earningsIcon, gated: true },
  ].filter(item => item.always || (canSeeFull && item.gated));

  const isActive = (path) => pathname === path || pathname.startsWith(path + "/");

  return (
    <aside className={styles.sidebar}>
      <nav className={styles.sidebarNav}>
        <ul className={styles.navList}>
          {loading ? (
            <li className={styles.navItem}>
              <div className={styles.navLink}>Loading...</div>
            </li>
          ) : (
            navItems.map(item => (
              <li
                key={item.href}
                className={`${styles.navItem} ${isActive(item.href) ? styles.active : ""}`}
              >
                <Link href={item.href} className={styles.navLink}>
                  <div className={styles.navIcon}>
                    <Image src={item.icon} alt={item.label} width={22} height={22} />
                  </div>
                  <span className={styles.navText}>{item.label}</span>
                </Link>
              </li>
            ))
          )}
          {!loading && orgAdmin && !canSeeFull && (
            <li className={styles.navItem}>
              <div className={styles.navLink} style={{ fontSize: 12, opacity: 0.7 }}>
                Limited access!
              </div>
            </li>
          )}
        </ul>
      </nav>
    </aside>
  );
}
