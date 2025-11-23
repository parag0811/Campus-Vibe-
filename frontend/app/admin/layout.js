"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Sidebar from "@/components/dashboard-page/sidebar";
import styles from "./admin.module.css";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });
const API_BASE = process.env.NEXT_PUBLIC_API_URL;

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
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      if (!API_BASE) {
        setIsOwner(false);
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/org/organisationAdmin/my-organisation`, {
          credentials: "include",
          cache: "no-store",
          signal: ac.signal,
        });
        const data = await res.json().catch(() => ({}));
        if (ac.signal.aborted) return;
        const org = data?.organisation || null;
        const uid = getUserIdFromJWT();
        const createdBy = org?.createdBy?._id || org?.createdBy || null;
        setIsOwner(Boolean(uid && createdBy && String(uid) === String(createdBy)));
      } catch {
        if (!ac.signal.aborted) setIsOwner(false);
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();
    return () => ac.abort();
  }, []);

  return (
    <div className={inter.className}>
      <div className={styles.adminContainer}>
        <header className={styles.header}>
          <Link className={styles.logo} href="/">Campus Vibe</Link>
        </header>
        <div className={styles.contentWrapper}>
          <Sidebar isOwner={isOwner} loading={loading} />
          <main className={styles.mainContent}>{children}</main>
        </div>
      </div>
    </div>
  );
}
