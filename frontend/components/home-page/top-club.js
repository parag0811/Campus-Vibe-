"use client";
import { useEffect, useState } from "react";
import styles from "./top-club.module.css";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

const OrgItem = ({ name, logoUrl }) => {
  const initial = (name || "C").charAt(0).toUpperCase();
  const [broken, setBroken] = useState(false);

  return (
    <div className={styles.orgItem}>
      <div className={styles.avatar}>
        {!broken && logoUrl ? (
          <img
            src={logoUrl}
            alt={name || "Organisation"}
            className={styles.avatarImg}
            width={88}
            height={88}
            onError={() => setBroken(true)}
            loading="lazy"
          />
        ) : (
          <div className={styles.avatarFallback}>{initial}</div>
        )}
      </div>
      <div className={styles.orgLabel}>{name || "Organisation"}</div>
    </div>
  );
};

export default function TopClubsAndCampuses() {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let aborted = false;
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/org/organisations/public?limit=12`, {
          cache: "no-store",
          credentials: "include",
        });
        const data = await res.json();
        if (!res.ok) throw new Error("Failed to load organisations");
        const list = Array.isArray(data?.organisations) ? data.organisations : [];
        if (!aborted) setOrgs(list);
      } catch {
        if (!aborted) setOrgs([]);
      } finally {
        if (!aborted) setLoading(false);
      }
    };
    if (API_BASE) load();
    else setLoading(false);
    return () => { aborted = true; };
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          Top <span className={styles.purple}>clubs</span> & campuses
        </h2>
        <Link href="/events" className={styles.shareButton}>
          Explore events
        </Link>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading...</div>
      ) : orgs.length === 0 ? (
        <div className={styles.loading}>No organisations yet.</div>
      ) : (
        <div className={styles.grid}>
          {orgs.map((o) => (
            <OrgItem key={o.organisationId} name={o.name} logoUrl={o.logoUrl} />
          ))}
        </div>
      )}
    </div>
  );
}
